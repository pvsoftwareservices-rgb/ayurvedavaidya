<?php
// Configuration loading, the SMTP transport and the per-IP rate limiter used by contact.php.
declare(strict_types=1);

namespace AyurvedaVaidya;

use PHPMailer\PHPMailer\PHPMailer;

interface MailTransport
{
    /** @param array<string,mixed> $mail result of EnquiryMail::build() — throws on failure */
    public function send(array $mail): void;
}

final class Config
{
    public const REQUIRED = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO', 'MAIL_FROM'];
    private const DEFAULTS = [
        'SMTP_SECURE' => '', // '' = derive from port: 465 → ssl, otherwise starttls
        'SITE_NAME' => 'AyurvedaVaidya',
        'SITE_URL' => 'https://ayurvedavaidya.com',
        'ALLOWED_ORIGINS' => '',
        'TIMEZONE' => 'Asia/Kolkata',
        'RATE_LIMIT_MAX' => '5',
        'RATE_LIMIT_WINDOW' => '600',
        'MIN_FILL_SECONDS' => '3',
    ];

    /**
     * Server environment first (SetEnv / hosting panel), then a PHP config file kept OUTSIDE public_html.
     * Secrets never live in the repository or in the deployed site folder.
     * @return array<string,string>
     */
    public static function load(): array
    {
        $file = [];
        foreach (self::candidateFiles() as $path) {
            if ($path !== '' && is_file($path) && is_readable($path)) {
                $loaded = require $path;
                $file = is_array($loaded) ? $loaded : [];
                break;
            }
        }
        $config = [];
        foreach (array_merge(self::REQUIRED, array_keys(self::DEFAULTS)) as $key) {
            $env = getenv($key);
            $value = $env !== false && $env !== '' ? $env : ($_SERVER[$key] ?? $file[$key] ?? self::DEFAULTS[$key] ?? '');
            $config[$key] = trim((string) $value);
        }
        return $config;
    }

    /** @return string[] */
    public static function candidateFiles(): array
    {
        $docRoot = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
        $home = (string) (getenv('HOME') ?: ($_SERVER['HOME'] ?? ''));
        return array_values(array_filter([
            (string) getenv('MAIL_CONFIG_FILE'),
            $docRoot !== '' ? dirname($docRoot) . '/private/mail-config.php' : '',
            $home !== '' ? $home . '/private/mail-config.php' : '',
        ]));
    }

    /** @param array<string,string> $config @return string[] names of required settings that are empty */
    public static function missing(array $config): array
    {
        return array_values(array_filter(self::REQUIRED, static fn ($k) => ($config[$k] ?? '') === ''));
    }
}

/** Sends through the clinic's own mailbox (Zoho) over authenticated SMTP, so SPF/DKIM/DMARC align. */
final class SmtpTransport implements MailTransport
{
    /** @param array<string,string> $config */
    public function __construct(private array $config)
    {
    }

    public function createMailer(array $mail): PHPMailer
    {
        $m = new PHPMailer(true);
        $m->isSMTP();
        $m->Host = $this->config['SMTP_HOST'];
        $m->Port = (int) $this->config['SMTP_PORT'];
        $m->SMTPAuth = true;
        $m->Username = $this->config['SMTP_USER'];
        $m->Password = $this->config['SMTP_PASS'];
        $secure = strtolower($this->config['SMTP_SECURE']);
        $m->SMTPSecure = $secure === 'ssl' || ($secure === '' && $m->Port === 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $m->Timeout = 12;
        $m->CharSet = PHPMailer::CHARSET_UTF8;
        $m->Encoding = PHPMailer::ENCODING_BASE64;
        $m->XMailer = ' '; // no "X-Mailer: PHPMailer" header
        $m->Hostname = (string) (parse_url($this->config['SITE_URL'], PHP_URL_HOST) ?: 'ayurvedavaidya.com'); // Message-ID domain
        $m->setFrom($mail['fromEmail'], $mail['fromName'], false);
        $m->Sender = $this->config['SMTP_USER']; // envelope sender = the authenticated mailbox
        $m->addAddress($mail['to']);
        $m->addReplyTo($mail['replyTo'], $mail['replyToName']);
        $m->Subject = $mail['subject'];
        $m->isHTML(true);
        $m->Body = $mail['html'];
        $m->AltBody = $mail['text'];
        return $m;
    }

    public function send(array $mail): void
    {
        $this->createMailer($mail)->send();
    }
}

/**
 * Sliding-window limits stored as small files in the system temp directory:
 * per client (IPv6 grouped by /64, since one user typically controls a whole /64) and a site-wide cap.
 */
final class RateLimiter
{
    public function __construct(private string $dir, private int $max, private int $window, private int $globalMax = 30, private int $globalWindow = 3600)
    {
    }

    /** Records one attempt; returns seconds to wait when over a limit, 0 when allowed. */
    public function hit(string $ip, int $now): int
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            return 0; // storage unavailable: fail open rather than block real visitors
        }
        if (random_int(1, 50) === 1) {
            $this->collectGarbage(time()); // file modification times are real time
        }
        $wait = $this->bucket(hash('sha256', self::clientKey($ip)), $this->max, $this->window, $now);
        return $wait > 0 ? $wait : $this->bucket('global', $this->globalMax, $this->globalWindow, $now);
    }

    /** IPv4 as-is; IPv6 reduced to its /64 network. */
    public static function clientKey(string $ip): string
    {
        $bin = @inet_pton($ip);
        return ($bin !== false && strlen($bin) === 16) ? bin2hex(substr($bin, 0, 8)) . '::/64' : $ip;
    }

    /** Removes bucket files untouched for longer than the longest window. */
    private function collectGarbage(int $now): void
    {
        foreach (glob($this->dir . '/*.json') ?: [] as $file) {
            if (@filemtime($file) < $now - max($this->window, $this->globalWindow)) {
                @unlink($file);
            }
        }
    }

    private function bucket(string $key, int $max, int $window, int $now): int
    {
        $file = $this->dir . '/' . $key . '.json';
        $fh = @fopen($file, 'c+');
        if ($fh === false) {
            return 0;
        }
        flock($fh, LOCK_EX);
        $hits = json_decode((string) stream_get_contents($fh), true);
        $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn ($t) => is_int($t) && $t > $now - $window));
        $wait = 0;
        if (count($hits) >= $max) {
            $wait = max(1, $hits[0] + $window - $now);
        } else {
            $hits[] = $now;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        flock($fh, LOCK_UN);
        fclose($fh);
        return $wait;
    }
}
