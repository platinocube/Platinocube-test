<?php
/**
 * Platino Cube: quote form mailer.
 * Receives the form from /contact/ and emails it to info@platinocube.com.
 * Answers in JSON: {"ok":true} or {"ok":false,"error":"name|phone|email|wait|fail"}
 */

$TO   = 'info@platinocube.com';
$FROM = 'info@platinocube.com'; // sent from the company mailbox to itself; "Reply" goes to the client
$WAIT = 20; // seconds between two requests from the same visitor

date_default_timezone_set('Asia/Amman');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function answer($ok, $error = null) {
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    exit;
}

function field($key, $max) {
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $v = trim(str_replace(["\r", "\0"], '', $v));
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max, 'UTF-8');
    return substr($v, 0, $max);
}

function one_line($v) {
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    answer(false, 'fail');
}

// Honeypot: real people never fill this hidden field. Pretend success for bots.
if (field('website', 200) !== '') answer(true);

// Rate limit (per visitor IP, stored as a hash in the temp folder)
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$stamp = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'pc_form_' . sha1($ip . __FILE__);
if (is_file($stamp) && (time() - filemtime($stamp)) < $WAIT) answer(false, 'wait');

$name    = one_line(field('name', 120));
$company = one_line(field('company', 160));
$phone   = one_line(field('phone', 40));
$email   = one_line(field('email', 160));
$service = one_line(field('service', 80));
$message = field('message', 3000);
$lang    = field('lang', 2) === 'ar' ? 'ar' : 'en';

if (mb_strlen($name, 'UTF-8') < 2) answer(false, 'name');
if (strlen(preg_replace('/\D/', '', $phone)) < 7) answer(false, 'phone');
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) answer(false, 'email');

// WhatsApp link: turn local Jordan numbers (07..., 00962...) into the international form 9627...
$wa = preg_replace('/\D/', '', $phone);
if (strpos($wa, '00') === 0) $wa = substr($wa, 2);
elseif (strlen($wa) === 10 && strpos($wa, '07') === 0) $wa = '962' . substr($wa, 1);

$subject = 'New quote request: ' . $name . ($company !== '' ? ' (' . $company . ')' : '');
$body  = "New quote request from the website (" . strtoupper($lang) . ")\n\n";
$body .= "Name:     $name\n";
$body .= "Company:  " . ($company !== '' ? $company : '-') . "\n";
$body .= "Phone:    $phone\n";
$body .= "WhatsApp: https://wa.me/" . $wa . "\n";
$body .= "Email:    " . ($email !== '' ? $email : '-') . "\n";
$body .= "Service:  " . ($service !== '' ? $service : '-') . "\n\n";
$body .= "Project:\n" . ($message !== '' ? $message : '-') . "\n\n";
$body .= "Sent: " . date('Y-m-d H:i') . " (Amman time)\n";

$headers  = "From: Platino Cube Website <$FROM>\r\n";
if ($email !== '') $headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$encoded_subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = @mail($TO, $encoded_subject, $body, $headers, '-f' . $FROM);

if (!$sent) answer(false, 'fail');
@touch($stamp);
answer(true);
