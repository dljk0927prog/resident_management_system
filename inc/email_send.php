<?php
/**
 * Admin password reset — send verification email.
 * Configure SMTP via config.local.php (see config.local.sample.php).
 */

function send_admin_password_reset_email($toEmail, $code)
{
    $subject = MAIL_FROM_NAME . ' — ' . 'Password reset code';
    $body = "Your verification code is: {$code}\r\n\r\n";
    $body .= "This code expires in 15 minutes.\r\n";
    $body .= "If you did not request a password reset, ignore this email.\r\n";

    $autoload = RMS_ROOT . '/vendor/autoload.php';
    $useSmtp = SMTP_ENABLED && SMTP_HOST && SMTP_USER && is_file($autoload);

    if ($useSmtp) {
        require_once $autoload;

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
            $mail->Port = (int) SMTP_PORT;
            $mail->CharSet = 'UTF-8';

            $sec = strtolower((string) SMTP_SECURE);
            if ($sec === 'ssl') {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
            $mail->addAddress($toEmail);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->send();
            return true;
        } catch (Throwable $e) {
            error_log('PHPMailer: ' . $e->getMessage());
            return false;
        }
    }

    $headers = 'From: ' . MAIL_FROM_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    return @mail($toEmail, $subject, $body, $headers);
}
