<?php
// Router for PHP's built-in server in end-to-end tests ONLY (never deployed):
//   php -S 127.0.0.1:8090 -t dist tests/php/router.php
// Serves dist/ like the host does and runs the real /api/contact.php, but with a fake mail transport that
// appends each message to $MAIL_OUTBOX (JSON lines) instead of connecting to an SMTP server.
declare(strict_types=1);

$dist = realpath(__DIR__ . '/../../dist');
$path = urldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if ($path === '/api/contact.php') {
    require_once $dist . '/api/lib/Support.php';
    $GLOBALS['enquiryTransportFactory'] = static fn () => new class implements \AyurvedaVaidya\MailTransport {
        public function send(array $mail): void
        {
            file_put_contents((string) getenv('MAIL_OUTBOX'), json_encode($mail) . "\n", FILE_APPEND | LOCK_EX);
        }
    };
    chdir($dist . '/api');
    require $dist . '/api/contact.php';
    return true;
}

$file = $dist . $path;
if (is_dir($file)) {
    if (!str_ends_with($path, '/')) {
        header('Location: ' . $path . '/', true, 301);
        return true;
    }
    $file .= 'index.html';
}
if (is_file($file)) {
    return false; // let the built-in server send the static file
}
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
readfile($dist . '/404.html');
return true;
