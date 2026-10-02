<?php
// Request handling for the enquiry endpoint. Pure: takes the request as data and returns the response as
// data, so tests/php can exercise every branch with a fake mail transport and no web server.
declare(strict_types=1);

namespace AyurvedaVaidya;

final class EnquiryHandler
{
    public const THANK_YOU = '/thank-you/';
    private const MAX_BODY = 32768;

    /**
     * @param array<string,string> $config  see Config::load()
     * @param array<string,string> $dialCodes
     * @param \Closure(): MailTransport $transport created lazily, only when a message is really sent
     */
    public function __construct(
        private array $config,
        private array $dialCodes,
        private \Closure $transport,
        private RateLimiter $limiter,
        private \DateTimeImmutable $now,
    ) {
    }

    /**
     * @param array{method:string, headers:array<string,string>, body:string, post:array<string,mixed>, ip:string} $request
     *        header names lower-case
     * @return array{status:int, headers:array<string,string>, body:string}
     */
    public function handle(array $request): array
    {
        $headers = $request['headers'];
        $wantsJson = str_contains($headers['accept'] ?? '', 'application/json') || str_contains($headers['content-type'] ?? '', 'application/json');

        if (strtoupper($request['method']) !== 'POST') {
            return $this->reply(405, true, ['ok' => false, 'error' => 'method'], ['Allow' => 'POST']);
        }
        if (!$this->originAllowed($headers)) {
            return $this->reply(403, $wantsJson, ['ok' => false, 'error' => 'origin']);
        }
        if (strlen($request['body']) > self::MAX_BODY) {
            return $this->reply(413, $wantsJson, ['ok' => false, 'error' => 'too_large']);
        }

        $input = $this->parse($request);
        if ($input === null) {
            return $this->reply(400, $wantsJson, ['ok' => false, 'error' => 'bad_request']);
        }

        $wait = $this->limiter->hit($request['ip'], $this->now->getTimestamp());
        if ($wait > 0) {
            return $this->reply(429, $wantsJson, ['ok' => false, 'error' => 'rate_limited'], ['Retry-After' => (string) $wait]);
        }

        // Bots: a filled honeypot or a form sent faster than a person can type. Accepted silently, never sent.
        if ($this->looksAutomated($input)) {
            return $this->success($wantsJson);
        }

        $validator = new EnquiryValidator($this->dialCodes);
        $values = $validator->normalise($input);
        $errors = $validator->validate($values, $this->now->setTimezone(new \DateTimeZone($this->config['TIMEZONE'])));
        if ($errors) {
            return $this->reply(422, $wantsJson, ['ok' => false, 'error' => 'validation', 'errors' => $errors]);
        }

        $missing = Config::missing($this->config);
        if ($missing) {
            error_log('[enquiry] mail is not configured; missing: ' . implode(', ', $missing));
            return $this->reply(500, $wantsJson, ['ok' => false, 'error' => 'config']);
        }

        $mail = EnquiryMail::build($values, $this->config, $this->now);
        try {
            ($this->transport)()->send($mail);
        } catch (\Throwable $e) {
            // Log the reason (never the password) so the failure can be diagnosed in the host's error log.
            error_log('[enquiry] SMTP delivery failed: ' . preg_replace('/\s+/', ' ', $e->getMessage()));
            return $this->reply(502, $wantsJson, ['ok' => false, 'error' => 'delivery']);
        }
        return $this->success($wantsJson);
    }

    /** @param array<string,string> $headers */
    private function originAllowed(array $headers): bool
    {
        $origin = $headers['origin'] ?? '';
        if ($origin === '' && ($headers['referer'] ?? '') !== '') {
            $parts = parse_url($headers['referer']);
            $origin = isset($parts['scheme'], $parts['host']) ? $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '') : '';
        }
        if ($origin === '' || $origin === 'null') {
            return false;
        }
        $site = parse_url($this->config['SITE_URL'], PHP_URL_HOST) ?: 'ayurvedavaidya.com';
        $allowed = array_filter(array_map('trim', explode(',', $this->config['ALLOWED_ORIGINS'])));
        $allowed[] = "https://{$site}";
        $allowed[] = "https://www.{$site}";
        if (in_array(rtrim($origin, '/'), $allowed, true)) {
            return true;
        }
        // Local development and tests.
        return (bool) preg_match('~^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$~', $origin);
    }

    /** @return array<string,mixed>|null */
    private function parse(array $request): ?array
    {
        $type = $request['headers']['content-type'] ?? '';
        if (str_contains($type, 'application/json')) {
            $data = json_decode($request['body'], true);
            return is_array($data) ? $data : null;
        }
        return $request['post'];
    }

    /** @param array<string,mixed> $input */
    private function looksAutomated(array $input): bool
    {
        if (!is_scalar($input['website'] ?? '') || trim((string) ($input['website'] ?? '')) !== '') {
            return true;
        }
        $loaded = EnquiryValidator::scalar($input['_ts'] ?? '');
        if ($loaded === '') {
            return false; // no JavaScript: the timestamp cannot be stamped (the honeypot still applies)
        }
        // Both times come from the visitor's own clock, so clock differences with the server do not matter.
        $submitted = EnquiryValidator::scalar($input['_submitted'] ?? '');
        $end = ctype_digit($submitted) ? (int) $submitted : $this->now->getTimestamp() * 1000;
        $elapsed = ctype_digit($loaded) ? $end - (int) $loaded : -1;
        return $elapsed < (int) $this->config['MIN_FILL_SECONDS'] * 1000;
    }

    private function success(bool $wantsJson): array
    {
        return $wantsJson
            ? $this->reply(200, true, ['ok' => true])
            : ['status' => 303, 'headers' => ['Location' => self::THANK_YOU, 'Cache-Control' => 'no-store'], 'body' => ''];
    }

    /** @param array<string,mixed> $payload @param array<string,string> $extra */
    private function reply(int $status, bool $json, array $payload, array $extra = []): array
    {
        $headers = $extra + ['Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'];
        if ($json) {
            return ['status' => $status, 'headers' => $headers + ['Content-Type' => 'application/json; charset=utf-8'], 'body' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)];
        }
        return ['status' => $status, 'headers' => $headers + ['Content-Type' => 'text/html; charset=utf-8'], 'body' => ErrorPage::render($status, $payload['errors'] ?? [])];
    }
}

/** Plain HTML response for visitors without JavaScript (the JS form shows these messages inline instead). */
final class ErrorPage
{
    private const LABELS = ['name' => 'Full name', 'email' => 'Email', 'phone' => 'Phone', 'area' => 'Consultation area', 'mode' => 'Consultation mode', 'date' => 'Preferred date', 'time' => 'Preferred time', 'message' => 'Your message', 'consent' => 'Consent'];
    private const MESSAGES = [
        'required' => 'This field is required.',
        'tooShort' => 'This is too short.',
        'tooLong' => 'This is too long.',
        'email' => 'Enter a valid email address, such as name@example.com.',
        'phone' => 'Enter a valid phone number: 10–15 digits including the country code.',
        'pastDate' => 'Please choose today or a future date.',
        'invalid' => 'Please choose a valid option.',
        'consent' => 'Please tick the box to agree to the Privacy Policy.',
    ];

    /** @param array<string,string> $errors */
    public static function render(int $status, array $errors): string
    {
        $e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        if ($status === 422) {
            $title = 'Please check your request';
            $items = '';
            foreach ($errors as $field => $code) {
                $items .= '<li><strong>' . $e(self::LABELS[$field] ?? $field) . ':</strong> ' . $e(self::MESSAGES[$code] ?? $code) . '</li>';
            }
            $lead = '<p>Some details need attention:</p><ul>' . $items . '</ul><p>Use your browser’s <strong>Back</strong> button — your entries are still in the form.</p>';
        } elseif ($status === 429) {
            $title = 'Please wait a few minutes';
            $lead = '<p>Several requests were just sent from this connection. Please wait a few minutes before trying again, or contact us directly.</p>';
        } else {
            $title = 'Your request could not be sent';
            $lead = '<p>Sorry, we could not deliver your request just now. Use your browser’s <strong>Back</strong> button to try again (your entries are still in the form), or contact us directly.</p>';
        }
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
            . '<title>' . $e($title) . ' | AyurvedaVaidya</title></head>'
            . '<body style="margin:0;padding:40px 16px;background:#faf5e8;color:#142519;font:16px/1.6 system-ui,sans-serif">'
            . '<main style="max-width:640px;margin:0 auto"><h1 style="font-family:Georgia,serif;color:#17482a">' . $e($title) . '</h1>' . $lead
            . '<p><a href="tel:+917895911809">+91 78959 11809</a> · <a href="mailto:info@ayurvedavaidya.com">info@ayurvedavaidya.com</a> · <a href="https://wa.me/917895911809">WhatsApp</a></p>'
            . '<p><a href="/book-consultation/">Back to the booking page</a> · <a href="/">Home</a></p></main></body></html>';
    }
}
