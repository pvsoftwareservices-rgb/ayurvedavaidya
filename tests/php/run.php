<?php
// Unit tests for the enquiry handler (public/api). No network: mail goes to fake transports, and the one
// real PHPMailer render uses preSend() (builds the MIME message) without ever calling send().
//   npm run test:php      (needs PHP 8+: on PATH, or PHP_BIN=/path/to/php)
declare(strict_types=1);

$api = __DIR__ . '/../../public/api';
require $api . '/lib/PHPMailer/Exception.php';
require $api . '/lib/PHPMailer/PHPMailer.php';
require $api . '/lib/PHPMailer/SMTP.php';
require $api . '/lib/Support.php';
require $api . '/lib/EnquiryValidator.php';
require $api . '/lib/EnquiryMail.php';
require $api . '/lib/EnquiryHandler.php';

use AyurvedaVaidya\EnquiryHandler;
use AyurvedaVaidya\EnquiryMail;
use AyurvedaVaidya\MailTransport;
use AyurvedaVaidya\RateLimiter;
use AyurvedaVaidya\SmtpTransport;

final class FakeTransport implements MailTransport
{
    /** @var array<int,array<string,mixed>> */
    public array $sent = [];
    public function send(array $mail): void { $this->sent[] = $mail; }
}

final class FailingTransport implements MailTransport
{
    public function send(array $mail): void { throw new RuntimeException('SMTP connect() failed.'); }
}

// ---------------------------------------------------------------- tiny test harness
$results = ['pass' => 0, 'fail' => 0];
function test(string $name, callable $fn): void
{
    global $results;
    try {
        $fn();
        $results['pass']++;
        echo "  ok   {$name}\n";
    } catch (Throwable $e) {
        $results['fail']++;
        echo "  FAIL {$name}\n       " . $e->getMessage() . "\n";
    }
}
function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
function same($expected, $actual, string $label): void
{
    check($expected === $actual, "{$label}: expected " . var_export($expected, true) . ', got ' . var_export($actual, true));
}

// ---------------------------------------------------------------- fixtures
const NOW = '2026-10-03 10:00:00';
$tmp = sys_get_temp_dir() . '/av-enquiry-tests-' . getmypid() . '-' . bin2hex(random_bytes(4));

function config(array $overrides = []): array
{
    return $overrides + [
        'SMTP_HOST' => 'smtppro.zoho.in', 'SMTP_PORT' => '465', 'SMTP_USER' => 'info@ayurvedavaidya.com', 'SMTP_PASS' => 'not-a-real-password',
        'SMTP_SECURE' => '', 'MAIL_TO' => 'info@ayurvedavaidya.com', 'MAIL_FROM' => 'info@ayurvedavaidya.com',
        'SITE_NAME' => 'AyurvedaVaidya', 'SITE_URL' => 'https://ayurvedavaidya.com', 'ALLOWED_ORIGINS' => 'https://preview.example.net',
        'TIMEZONE' => 'Asia/Kolkata', 'RATE_LIMIT_MAX' => '5', 'RATE_LIMIT_WINDOW' => '600', 'MIN_FILL_SECONDS' => '3',
    ];
}

function fields(array $overrides = []): array
{
    $loaded = (strtotime(NOW) - 30) * 1000;
    return $overrides + [
        'name' => 'Priya Sharma', 'email' => 'priya@example.com', 'country' => 'IN', 'dialCode' => '91', 'phone' => '98765 43210',
        'area' => 'nutrition', 'mode' => 'online', 'date' => '2026-10-10', 'time' => '10:30',
        'message' => 'I would like help with a diet plan for better digestion.', 'consent' => 'yes', 'lang' => 'en',
        '_page' => 'https://ayurvedavaidya.com/book-consultation/', '_form' => 'consultation', 'website' => '',
        '_ts' => (string) $loaded, '_submitted' => (string) ($loaded + 25000),
    ];
}

/** @return array{0: array, 1: FakeTransport|MailTransport} */
function run(array $input, array $opts = []): array
{
    global $tmp;
    $transport = $opts['transport'] ?? new FakeTransport();
    $json = $opts['json'] ?? true;
    $headers = ($opts['headers'] ?? []) + ['origin' => 'https://ayurvedavaidya.com'];
    if ($json) {
        $headers += ['content-type' => 'application/json', 'accept' => 'application/json'];
    } else {
        $headers += ['content-type' => 'application/x-www-form-urlencoded', 'accept' => 'text/html'];
    }
    foreach ($opts['dropHeaders'] ?? [] as $h) {
        unset($headers[$h]);
    }
    $handler = new EnquiryHandler(
        config($opts['config'] ?? []),
        ['IN' => '91', 'US' => '1', 'GB' => '44'],
        static fn () => $transport,
        new RateLimiter($opts['rateDir'] ?? $tmp . '/rate-' . bin2hex(random_bytes(4)), 5, 600),
        new DateTimeImmutable(NOW, new DateTimeZone('Asia/Kolkata')),
    );
    $response = $handler->handle([
        'method' => $opts['method'] ?? 'POST',
        'headers' => $headers,
        'body' => $json ? json_encode($input) : http_build_query($input),
        'post' => $json ? [] : $input,
        'ip' => $opts['ip'] ?? '203.0.113.7',
    ]);
    return [$response, $transport];
}

$body = static fn (array $r): array => json_decode($r['body'], true) ?? [];

echo "Enquiry handler\n";

test('valid JSON enquiry is sent and returns 200 {ok:true}', function () use ($body) {
    [$r, $t] = run(fields());
    same(200, $r['status'], 'status');
    same(true, $body($r)['ok'] ?? null, 'ok');
    same(1, count($t->sent), 'messages sent');
});

test('sender is "Visitor via AyurvedaVaidya" <MAIL_FROM>, Reply-To is the visitor', function () {
    [, $t] = run(fields());
    $m = $t->sent[0];
    same('info@ayurvedavaidya.com', $m['fromEmail'], 'from address');
    same('Priya Sharma via AyurvedaVaidya', $m['fromName'], 'from name');
    same('info@ayurvedavaidya.com', $m['to'], 'to');
    same('priya@example.com', $m['replyTo'], 'reply-to');
    same('New enquiry from Priya Sharma: Diet & Nutrition', $m['subject'], 'subject');
});

test('email has an HTML table and a plain-text part with all fields, source page and local time', function () {
    [, $t] = run(fields());
    $m = $t->sent[0];
    foreach (['Priya Sharma', 'priya@example.com', '+91 98765 43210', 'Diet &amp; Nutrition', 'Online (video)', '2026-10-10 10:30', 'https://ayurvedavaidya.com/book-consultation/', '3 Oct 2026, 10:00 IST'] as $needle) {
        check(str_contains($m['html'], $needle), "HTML is missing {$needle}");
    }
    check(str_contains($m['html'], '<table'), 'HTML has no table');
    check(str_contains($m['text'], 'Message:') && str_contains($m['text'], 'Consultation form'), 'plain text is incomplete');
    check(!preg_match('/formsubmit|powered by/i', $m['html'] . $m['text']), 'third-party branding present');
});

test('missing required fields return 422 with a code per field', function () use ($body) {
    [$r, $t] = run(['consent' => 'yes', '_ts' => '']);
    same(422, $r['status'], 'status');
    $errors = $body($r)['errors'];
    foreach (['name', 'email', 'phone', 'message'] as $f) {
        same('required', $errors[$f] ?? null, $f);
    }
    same(0, count($t->sent), 'messages sent');
});

test('format rules: email, phone digits (10–15), min/max lengths, past date, options', function () use ($body) {
    [$r] = run(fields(['email' => 'priya@example', 'phone' => '12345', 'name' => 'P', 'message' => 'Too short', 'date' => '2026-09-01', 'area' => 'surgery', 'time' => '25:00']));
    $e = $body($r)['errors'];
    same('email', $e['email'] ?? null, 'email');
    same('phone', $e['phone'] ?? null, 'phone');
    same('tooShort', $e['name'] ?? null, 'name');
    same('tooShort', $e['message'] ?? null, 'message');
    same('pastDate', $e['date'] ?? null, 'date');
    same('invalid', $e['area'] ?? null, 'area');
    same('invalid', $e['time'] ?? null, 'time');
    [$r] = run(fields(['phone' => '9876543210123456', 'message' => str_repeat('a', 2001), 'name' => str_repeat('n', 101)]));
    $e = $body($r)['errors'];
    same('phone', $e['phone'] ?? null, 'phone > 15 digits');
    same('tooLong', $e['message'] ?? null, 'message max');
    same('tooLong', $e['name'] ?? null, 'name max');
});

test('consent is required server-side', function () use ($body) {
    [$r, $t] = run(fields(['consent' => '']));
    same(422, $r['status'], 'status');
    same('consent', $body($r)['errors']['consent'] ?? null, 'consent');
    same(0, count($t->sent), 'messages sent');
});

test('honeypot: accepted silently (200) and discarded', function () use ($body) {
    [$r, $t] = run(fields(['website' => 'http://spam.example']));
    same(200, $r['status'], 'status');
    same(true, $body($r)['ok'] ?? null, 'ok');
    same(0, count($t->sent), 'messages sent');
});

test('timer: under 3 seconds is accepted silently and discarded; no timestamp (no JS) is allowed', function () {
    $loaded = strtotime(NOW) * 1000;
    [$r, $t] = run(fields(['_ts' => (string) $loaded, '_submitted' => (string) ($loaded + 1200)]));
    same(200, $r['status'], 'fast status');
    same(0, count($t->sent), 'fast messages sent');
    [$r, $t] = run(fields(['_ts' => '', '_submitted' => '']));
    same(200, $r['status'], 'no-JS status');
    same(1, count($t->sent), 'no-JS messages sent');
});

test('origin allow-list: live domain, www, configured preview and localhost pass; others get 403', function () {
    foreach (['https://ayurvedavaidya.com', 'https://www.ayurvedavaidya.com', 'https://preview.example.net', 'http://localhost:4173', 'http://127.0.0.1:8090'] as $origin) {
        [$r] = run(fields(), ['headers' => ['origin' => $origin]]);
        same(200, $r['status'], $origin);
    }
    [$r] = run(fields(), ['headers' => ['origin' => 'https://evil.example']]);
    same(403, $r['status'], 'foreign origin');
    [$r] = run(fields(), ['dropHeaders' => ['origin']]);
    same(403, $r['status'], 'no origin or referer');
    [$r] = run(fields(), ['headers' => ['origin' => '', 'referer' => 'https://ayurvedavaidya.com/book-consultation/']]);
    same(200, $r['status'], 'referer fallback');
});

test('header injection: line breaks are stripped from every header value', function () {
    [$r, $t] = run(fields(['name' => "Eve\r\nBcc: victim@example.com", 'email' => "eve@example.com\r\nBcc: x@example.com"]));
    same(422, $r['status'], 'injected email rejected');
    [, $t] = run(fields(['name' => "Eve\r\nBcc: victim@example.com"]));
    $m = $t->sent[0];
    foreach (['fromName', 'subject', 'replyToName'] as $k) {
        check(!preg_match('/[\r\n]/', $m[$k]), "{$k} contains a line break");
    }
    // Render the real MIME message: no injected Bcc header may appear.
    $mailer = (new SmtpTransport(config()))->createMailer($m);
    $mailer->preSend();
    check(!preg_match('/^Bcc:/mi', $mailer->getSentMIMEMessage()), 'MIME message contains an injected Bcc header');
});

test('HTML-escapes every value in the email body', function () {
    [, $t] = run(fields(['name' => 'Tom <script>alert(1)</script>', 'message' => 'Hello <b>there</b> & "friends" — please call me.']));
    $html = $t->sent[0]['html'];
    check(!str_contains($html, '<script>') && !str_contains($html, '<b>there'), 'unescaped HTML in body');
    check(str_contains($html, '&lt;script&gt;') && str_contains($html, '&amp; &quot;friends&quot;'), 'escaped text missing');
});

test('suspicious keywords flag the subject instead of dropping the email', function () {
    [$r, $t] = run(fields(['message' => 'Cheap SEO services and backlinks for your clinic website, reply now.']));
    same(200, $r['status'], 'status');
    check(str_starts_with($t->sent[0]['subject'], '[Possible spam] '), 'subject not flagged');
});

test('rate limit: the 6th request from one IP within 10 minutes gets 429 with Retry-After', function () use ($tmp) {
    $dir = $tmp . '/rate-shared';
    for ($i = 1; $i <= 5; $i++) {
        [$r] = run(fields(), ['rateDir' => $dir, 'ip' => '198.51.100.9']);
        same(200, $r['status'], "request {$i}");
    }
    [$r, $t] = run(fields(), ['rateDir' => $dir, 'ip' => '198.51.100.9']);
    same(429, $r['status'], 'request 6');
    check((int) ($r['headers']['Retry-After'] ?? 0) > 0, 'Retry-After missing');
    same(0, count($t->sent), 'messages sent');
    [$r] = run(fields(), ['rateDir' => $dir, 'ip' => '198.51.100.10']);
    same(200, $r['status'], 'another IP');
});

test('missing SMTP configuration returns 500 and sends nothing', function () use ($body) {
    [$r, $t] = run(fields(), ['config' => ['SMTP_PASS' => '', 'SMTP_HOST' => '']]);
    same(500, $r['status'], 'status');
    same('config', $body($r)['error'] ?? null, 'error');
    same(0, count($t->sent), 'messages sent');
});

test('SMTP failure returns 502', function () use ($body) {
    [$r] = run(fields(), ['transport' => new FailingTransport()]);
    same(502, $r['status'], 'status');
    same('delivery', $body($r)['error'] ?? null, 'error');
});

test('no-JavaScript form POST: 303 redirect to /thank-you/', function () {
    [$r, $t] = run(fields(['consent' => 'on', '_ts' => '', '_submitted' => '', 'dialCode' => '']), ['json' => false]);
    same(303, $r['status'], 'status');
    same('/thank-you/', $r['headers']['Location'] ?? null, 'location');
    same(1, count($t->sent), 'messages sent');
    check(str_contains($t->sent[0]['html'], '+91 98765 43210'), 'dial code not derived from the country');
});

test('no-JavaScript validation error: 422 HTML page that keeps the visitor on track', function () {
    [$r] = run(fields(['email' => 'nope']), ['json' => false]);
    same(422, $r['status'], 'status');
    check(str_contains($r['headers']['Content-Type'], 'text/html'), 'not HTML');
    check(str_contains($r['body'], 'Back') && str_contains($r['body'], 'valid email'), 'page lacks guidance');
});

test('non-POST requests get 405 with Allow: POST', function () {
    [$r] = run([], ['method' => 'GET']);
    same(405, $r['status'], 'status');
    same('POST', $r['headers']['Allow'] ?? null, 'allow');
});

test('PHPMailer render (no send): From, Reply-To, Subject, multipart and no X-Mailer', function () {
    [, $t] = run(fields());
    $mailer = (new SmtpTransport(config()))->createMailer($t->sent[0]);
    $mailer->preSend();
    $mime = $mailer->getSentMIMEMessage();
    // Saved for inspection (docs reference it); nothing is sent.
    file_put_contents(sys_get_temp_dir() . '/ayurvedavaidya-sample-email.eml', $mime);
    check((bool) preg_match('/^From: Priya Sharma via AyurvedaVaidya <info@ayurvedavaidya\.com>\r?$/m', $mime), 'From header wrong');
    check((bool) preg_match('/^Reply-To: Priya Sharma <priya@example\.com>\r?$/m', $mime), 'Reply-To header wrong');
    check((bool) preg_match('/^To: info@ayurvedavaidya\.com\r?$/m', $mime), 'To header wrong');
    check((bool) preg_match('/^Subject: New enquiry from Priya Sharma: Diet & Nutrition\r?$/m', $mime), 'Subject header wrong');
    check(str_contains($mime, 'multipart/alternative') && str_contains($mime, 'text/plain') && str_contains($mime, 'text/html'), 'not multipart/alternative');
    check(!preg_match('/^X-Mailer:/mi', $mime), 'X-Mailer header present');
    check((bool) preg_match('/^Message-ID: <[^@]+@ayurvedavaidya\.com>\r?$/m', $mime), 'Message-ID is not on the site domain');
    same('ssl', $mailer->SMTPSecure, 'port 465 uses implicit TLS');
    same('info@ayurvedavaidya.com', $mailer->Sender, 'envelope sender');
    file_put_contents(sys_get_temp_dir() . '/ayurvedavaidya-sample-email.eml', $mime);
});

test('rate limit groups IPv6 by /64, so rotating addresses in one network does not bypass it', function () use ($tmp) {
    $dir = $tmp . '/rate-v6';
    for ($i = 1; $i <= 5; $i++) {
        [$r] = run(fields(), ['rateDir' => $dir, 'ip' => "2001:db8:abcd:12::{$i}"]);
        same(200, $r['status'], "request {$i}");
    }
    [$r] = run(fields(), ['rateDir' => $dir, 'ip' => '2001:db8:abcd:12:ffff::99']);
    same(429, $r['status'], 'same /64, new address');
});

test('site-wide cap: no more than 30 sends per hour across all addresses', function () use ($tmp) {
    $limiter = new RateLimiter($tmp . '/rate-global', 5, 600, 30, 3600);
    $now = strtotime(NOW);
    for ($i = 1; $i <= 30; $i++) {
        same(0, $limiter->hit("192.0.2.{$i}", $now), "address {$i}");
    }
    check($limiter->hit('192.0.2.200', $now) > 0, '31st send in the hour was allowed');
});

test('array-valued fields are treated as empty, never "Array"', function () use ($body) {
    [$r, $t] = run(fields(['name' => ['x' => 'y'], 'website' => '']));
    same(422, $r['status'], 'status');
    same('required', $body($r)['errors']['name'] ?? null, 'name');
    [$r, $t] = run(fields(['website' => ['spam']]));
    same(200, $r['status'], 'array honeypot treated as bot');
    same(0, count($t->sent), 'bot message sent');
});

test('display name cannot imitate an address or hide text with direction overrides', function () {
    [, $t] = run(fields(['name' => "Bob\" <evil@x.com>, \"Eve \u{202E}moc.liame"]));
    $m = $t->sent[0];
    check(!preg_match('/[<>"@,]|\x{202E}/u', $m['fromName']), "fromName still contains address characters: {$m['fromName']}");
    check(!str_contains($m['subject'], '<'), 'subject contains <');
    $mailer = (new SmtpTransport(config()))->createMailer($m);
    $mailer->preSend();
    check((bool) preg_match('/^From: [^<\r\n]+ <info@ayurvedavaidya\.com>\r?$/m', $mailer->getSentMIMEMessage()), 'From header has a second address');
});

test('EnquiryMail::headerSafe strips CR/LF and control characters', function () {
    same('a b c', EnquiryMail::headerSafe("a\r\nb\tc"), 'headerSafe');
});

echo "\n{$results['pass']} passed, {$results['fail']} failed\n";
exit($results['fail'] > 0 ? 1 : 0);
