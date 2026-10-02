<?php
// Enquiry endpoint: POST /api/contact.php
// - JSON (fetch from the booking form): replies with JSON.
// - Regular form POST (no JavaScript): replies 303 → /thank-you/ on success, or a plain HTML error page.
// Mail goes out through the clinic's own Zoho mailbox over SMTP. Settings come from the server environment
// or a config file outside public_html — never from this repository. See docs/HOSTINGER-SMTP-SETUP.md.
declare(strict_types=1);

ini_set('display_errors', '0'); // never print errors (paths) to visitors; they go to the error log

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';
require_once __DIR__ . '/lib/Support.php';
require_once __DIR__ . '/lib/EnquiryValidator.php';
require_once __DIR__ . '/lib/EnquiryMail.php';
require_once __DIR__ . '/lib/EnquiryHandler.php';

use AyurvedaVaidya\Config;
use AyurvedaVaidya\EnquiryHandler;
use AyurvedaVaidya\RateLimiter;
use AyurvedaVaidya\SmtpTransport;

$config = Config::load();
$dialCodes = json_decode((string) @file_get_contents(__DIR__ . '/lib/dial-codes.json'), true) ?: [];
$headers = [];
foreach ($_SERVER as $key => $value) {
    if (str_starts_with($key, 'HTTP_')) {
        $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = (string) $value;
    }
}
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
}

$handler = new EnquiryHandler(
    $config,
    $dialCodes,
    // Local end-to-end tests run this file through tests/php/router.php, which supplies a fake transport.
    $GLOBALS['enquiryTransportFactory'] ?? static fn () => new SmtpTransport($config),
    new RateLimiter(sys_get_temp_dir() . '/ayurvedavaidya-rate', (int) $config['RATE_LIMIT_MAX'], (int) $config['RATE_LIMIT_WINDOW']),
    new DateTimeImmutable('now'),
);

$response = $handler->handle([
    'method' => (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'),
    'headers' => $headers,
    'body' => (string) file_get_contents('php://input', false, null, 0, 65536),
    'post' => $_POST,
    'ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
]);

http_response_code($response['status']);
foreach ($response['headers'] as $name => $value) {
    header("{$name}: {$value}");
}
echo $response['body'];
