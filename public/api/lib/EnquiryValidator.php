<?php
// Server-side validation of the consultation enquiry. Mirrors src/form/rules.js — keep both in step.
declare(strict_types=1);

namespace AyurvedaVaidya;

final class EnquiryValidator
{
    public const LIMITS = [
        'name' => ['min' => 2, 'max' => 100],
        'email' => ['max' => 254],
        'phone' => ['min' => 10, 'max' => 15], // digits incl. country code
        'message' => ['min' => 10, 'max' => 2000],
    ];
    public const AREAS = [
        'ayurveda' => 'Ayurveda',
        'nutrition' => 'Diet & Nutrition',
        'yoga' => 'Yoga',
        'mind-body-wellness' => 'Mind–Body Wellness',
    ];
    public const MODES = ['online' => 'Online (video)', 'phone' => 'Phone', 'clinic' => 'In-clinic'];

    /** @param array<string,string> $dialCodes ISO country => dialling code */
    public function __construct(private array $dialCodes)
    {
    }

    /**
     * Normalises raw input into the fields the email uses.
     * @param array<string,mixed> $input
     * @return array<string,string>
     */
    public function normalise(array $input): array
    {
        $text = static fn (string $key): string => trim(self::clean(self::scalar($input[$key] ?? '')));
        $country = strtoupper($text('country'));
        $dial = preg_replace('/\D/', '', $text('dialCode')) ?? '';
        if ($dial === '' && isset($this->dialCodes[$country])) {
            $dial = $this->dialCodes[$country];
        }
        $consent = $input['consent'] ?? '';
        return [
            'name' => $text('name'),
            'email' => $text('email'),
            'country' => $country,
            'dialCode' => $dial,
            'phone' => $text('phone'),
            'area' => $text('area'),
            'mode' => $text('mode'),
            'date' => $text('date'),
            'time' => $text('time'),
            'message' => trim(self::clean(self::scalar($input['message'] ?? ''), true)),
            'consent' => ($consent === true || in_array($consent, ['on', 'yes', 'true', '1'], true)) ? 'yes' : '',
            'lang' => in_array($text('lang'), ['en', 'es', 'ru'], true) ? $text('lang') : 'en',
            'page' => mb_substr($text('_page'), 0, 300),
            'form' => preg_match('/^[a-z-]{1,40}$/', $text('_form')) ? $text('_form') : 'consultation',
        ];
    }

    /**
     * @param array<string,string> $v normalised values
     * @return array<string,string> field => error code (empty = valid)
     */
    public function validate(array $v, \DateTimeImmutable $now): array
    {
        $errors = [];
        $len = static fn (string $s): int => mb_strlen($s, 'UTF-8');

        if ($v['name'] === '') {
            $errors['name'] = 'required';
        } elseif ($len($v['name']) < self::LIMITS['name']['min']) {
            $errors['name'] = 'tooShort';
        } elseif ($len($v['name']) > self::LIMITS['name']['max']) {
            $errors['name'] = 'tooLong';
        }

        if ($v['email'] === '') {
            $errors['email'] = 'required';
        } elseif ($len($v['email']) > self::LIMITS['email']['max']) {
            $errors['email'] = 'tooLong';
        } elseif (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/u', $v['email']) || filter_var($v['email'], FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'email';
        }

        $digits = strlen(preg_replace('/\D/', '', $v['dialCode'] . $v['phone']) ?? '');
        if ($v['phone'] === '') {
            $errors['phone'] = 'required';
        } elseif (preg_match('/[^\d\s\-().+]/', $v['phone']) || $digits < self::LIMITS['phone']['min'] || $digits > self::LIMITS['phone']['max']) {
            $errors['phone'] = 'phone';
        }

        if ($v['area'] !== '' && !isset(self::AREAS[$v['area']])) {
            $errors['area'] = 'invalid';
        }
        if ($v['mode'] !== '' && !isset(self::MODES[$v['mode']])) {
            $errors['mode'] = 'invalid';
        }

        if ($v['date'] !== '') {
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $v['date'], $now->getTimezone());
            // One day of tolerance: a visitor west of India can still be on "yesterday" by Indian time.
            if (!$date || $date->format('Y-m-d') !== $v['date']) {
                $errors['date'] = 'invalid';
            } elseif ($date < $now->setTime(0, 0)->modify('-1 day')) {
                $errors['date'] = 'pastDate';
            }
        }
        if ($v['time'] !== '' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v['time'])) {
            $errors['time'] = 'invalid';
        }

        if ($v['message'] === '') {
            $errors['message'] = 'required';
        } elseif ($len($v['message']) < self::LIMITS['message']['min']) {
            $errors['message'] = 'tooShort';
        } elseif ($len($v['message']) > self::LIMITS['message']['max']) {
            $errors['message'] = 'tooLong';
        }

        if ($v['consent'] !== 'yes') {
            $errors['consent'] = 'consent';
        }
        return $errors;
    }

    /** Arrays/objects (e.g. name[]=x or {"name":{}}) are treated as empty instead of becoming "Array". */
    public static function scalar(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }

    /** Removes control characters; line breaks are kept only where allowed (the message body). */
    public static function clean(string $value, bool $multiline = false): string
    {
        $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        $pattern = $multiline ? '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u';
        return preg_replace($pattern, $multiline ? '' : ' ', $value) ?? '';
    }
}
