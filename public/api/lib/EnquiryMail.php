<?php
// Builds the enquiry email: headers, subject, branded HTML table and plain-text version.
declare(strict_types=1);

namespace AyurvedaVaidya;

final class EnquiryMail
{
    private const SPAM_WORDS = ['viagra', 'cialis', 'casino', 'crypto', 'bitcoin', 'forex', 'loan offer', 'backlink', 'seo service', 'seo expert', 'porn', 'escort', 'betting', 'web design service', 'guest post'];

    /**
     * @param array<string,string> $v normalised, validated values
     * @param array<string,string> $config MAIL_FROM, MAIL_TO, SITE_NAME, TIMEZONE
     * @return array{fromEmail:string,fromName:string,to:string,replyTo:string,replyToName:string,subject:string,html:string,text:string,suspicious:bool}
     */
    public static function build(array $v, array $config, \DateTimeImmutable $now): array
    {
        $site = $config['SITE_NAME'];
        $name = self::displayName($v['name']);
        $topic = $v['area'] !== '' ? EnquiryValidator::AREAS[$v['area']] : 'Consultation request';
        $suspicious = self::isSuspicious($v);
        $subject = self::headerSafe(($suspicious ? '[Possible spam] ' : '') . "New enquiry from {$name}: {$topic}");

        $local = $now->setTimezone(new \DateTimeZone($config['TIMEZONE']));
        $rows = [
            'Form' => ucfirst($v['form']) . ' form',
            'Name' => $v['name'],
            'Email' => $v['email'],
            'Phone' => trim(($v['dialCode'] !== '' ? '+' . $v['dialCode'] . ' ' : '') . $v['phone']),
            'Consultation area' => $v['area'] !== '' ? EnquiryValidator::AREAS[$v['area']] : '—',
            'Consultation mode' => $v['mode'] !== '' ? EnquiryValidator::MODES[$v['mode']] : '—',
            'Preferred date / time' => trim(($v['date'] ?: '—') . ' ' . $v['time']),
            'Message' => $v['message'],
            'Consent' => 'Agreed to the Privacy Policy',
            'Site language' => strtoupper($v['lang']),
            'Source page' => $v['page'] !== '' ? $v['page'] : '—',
            'Submitted' => $local->format('j M Y, H:i') . ' ' . $local->format('T') . ' (' . $config['TIMEZONE'] . ')',
        ];

        return [
            'fromEmail' => $config['MAIL_FROM'],
            'fromName' => self::headerSafe("{$name} via {$site}"),
            'to' => $config['MAIL_TO'],
            'replyTo' => $v['email'],
            'replyToName' => $name,
            'subject' => $subject,
            'html' => self::html($rows, $site, $suspicious, $v['email']),
            'text' => self::text($rows, $site, $suspicious),
            'suspicious' => $suspicious,
        ];
    }

    /** Header values never contain line breaks (prevents header injection) and stay a sensible length. */
    public static function headerSafe(string $value): string
    {
        return mb_substr(trim(preg_replace('/[\r\n\t\x00-\x1F\x7F]+/u', ' ', $value) ?? ''), 0, 150);
    }

    /** Visitor name for From/Reply-To/Subject: no quotes, angle brackets, @ or commas (which could mimic an
     *  address) and no invisible Unicode format characters such as right-to-left overrides. */
    public static function displayName(string $value): string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\p{Cf}<>"@,;]/u', '', self::headerSafe($value)) ?? '') ?? '');
        return $clean !== '' ? $clean : 'Website visitor';
    }

    /** Flags likely spam for the subject line instead of silently dropping it. */
    public static function isSuspicious(array $v): bool
    {
        $haystack = mb_strtolower($v['name'] . ' ' . $v['message']);
        foreach (self::SPAM_WORDS as $word) {
            if (str_contains($haystack, $word)) {
                return true;
            }
        }
        return preg_match_all('~https?://|www\.~i', $v['message']) > 2;
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    /** @param array<string,string> $rows */
    private static function html(array $rows, string $site, bool $suspicious, string $replyTo): string
    {
        $body = '';
        foreach ($rows as $label => $value) {
            $cell = $label === 'Message' ? nl2br(self::e($value), false) : self::e($value);
            if ($label === 'Email') {
                $cell = '<a href="mailto:' . self::e($value) . '" style="color:#1f5a2f">' . self::e($value) . '</a>';
            }
            $body .= '<tr><th align="left" valign="top" style="padding:10px 14px;border-bottom:1px solid #e2d5b3;font:600 13px Arial,sans-serif;color:#4c5c50;width:170px">'
                . self::e($label) . '</th><td style="padding:10px 14px;border-bottom:1px solid #e2d5b3;font:14px/1.5 Arial,sans-serif;color:#142519">' . $cell . '</td></tr>';
        }
        $warning = $suspicious
            ? '<p style="margin:0 0 16px;padding:10px 14px;border-radius:8px;background:#fbefe9;color:#6e2414;font:13px Arial,sans-serif">This message contains words or links often used in spam. Please review it before replying.</p>'
            : '';
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' . self::e($site) . ' enquiry</title></head>'
            . '<body style="margin:0;padding:24px;background:#f3ead5">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fffaf0;border:1px solid #e2d5b3;border-radius:12px;overflow:hidden">'
            . '<tr><td style="padding:20px 24px;background:#0c2a17;color:#e2c77e;font:600 20px Georgia,serif">' . self::e($site) . ' — new consultation enquiry</td></tr>'
            . '<tr><td style="padding:20px 24px">' . $warning
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' . $body . '</table>'
            . '<p style="margin:18px 0 0;font:13px Arial,sans-serif;color:#4c5c50">Reply to this email to answer ' . self::e($replyTo) . ' directly.</p>'
            . '</td></tr></table></body></html>';
    }

    /** @param array<string,string> $rows */
    private static function text(array $rows, string $site, bool $suspicious): string
    {
        $lines = ["{$site} — new consultation enquiry", str_repeat('=', 40)];
        if ($suspicious) {
            $lines[] = 'NOTE: this message contains words or links often used in spam.';
        }
        foreach ($rows as $label => $value) {
            $lines[] = $label === 'Message' ? "\n{$label}:\n{$value}\n" : "{$label}: {$value}";
        }
        $lines[] = "\nReply to this email to answer the visitor directly.";
        return implode("\n", $lines) . "\n";
    }
}
