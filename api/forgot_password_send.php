<?php
require_once '../config.php';
require_once RMS_ROOT . '/inc/email_send.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message_key' => 'bad_request']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$emailRaw = trim($input['email'] ?? '');
$emailNorm = strtolower($emailRaw);

if ($emailNorm === '' || !filter_var($emailNorm, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message_key' => 'forgotInvalidEmail']);
    exit;
}

try {
    $conn = getDBConnection();
    $conn->query('SELECT 1 FROM admin_password_reset_codes LIMIT 1');
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message_key' => 'forgotNeedDbUpgrade']);
    exit;
}

try {
    $stmt = $conn->prepare('
        SELECT id, email FROM admins
        WHERE email IS NOT NULL AND TRIM(email) != \'\' AND LOWER(TRIM(email)) = ?
        LIMIT 1
    ');
    $stmt->execute([$emailNorm]);
    $admin = $stmt->fetch();

    if (!$admin) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message_key' => 'forgotNoAccount']);
        exit;
    }

    $canonicalEmail = trim($admin['email']);

    $stmt = $conn->prepare('
        SELECT created_at FROM admin_password_reset_codes
        WHERE LOWER(TRIM(email)) = ?
        ORDER BY id DESC LIMIT 1
    ');
    $stmt->execute([strtolower($canonicalEmail)]);
    $last = $stmt->fetch();
    if ($last) {
        $createdTs = strtotime($last['created_at']);
        if ($createdTs !== false) {
            $elapsed = time() - $createdTs;
            // 仅当记录在「过去」且仍在冷却期内时限流；created_at 被解析为未来时间（时区/时钟）时不阻塞
            if ($elapsed >= 0 && $elapsed < RESET_RATE_SECONDS) {
                $wait = RESET_RATE_SECONDS - $elapsed;
                $wait = max(1, min((int) ceil($wait), RESET_RATE_SECONDS));
                http_response_code(429);
                echo json_encode([
                    'success' => false,
                    'message_key' => 'forgotRateLimit',
                    'retry_after' => $wait,
                ]);
                exit;
            }
        }
    }

    $code = (string) random_int(100000, 999999);
    $hash = password_hash($code, PASSWORD_DEFAULT);
    $expires = date('Y-m-d H:i:s', time() + 15 * 60);

    $del = $conn->prepare('DELETE FROM admin_password_reset_codes WHERE LOWER(TRIM(email)) = ?');
    $del->execute([strtolower($canonicalEmail)]);

    $ins = $conn->prepare('
        INSERT INTO admin_password_reset_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
    ');
    $ins->execute([$canonicalEmail, $hash, $expires]);

    $sent = send_admin_password_reset_email($canonicalEmail, $code);

    if (!$sent && MAIL_DEV_SHOW_CODE) {
        $_SESSION['admin_pw_reset_email'] = $canonicalEmail;
        $_SESSION['admin_pw_reset_step'] = 2;
        echo json_encode([
            'success' => true,
            'message_key' => 'forgotDevCode',
            'step' => 2,
            'dev_code' => $code,
        ]);
        exit;
    }

    if (!$sent) {
        $conn->prepare('DELETE FROM admin_password_reset_codes WHERE LOWER(TRIM(email)) = ?')->execute([strtolower($canonicalEmail)]);
        http_response_code(500);
        echo json_encode(['success' => false, 'message_key' => 'forgotMailFailed']);
        exit;
    }

    $_SESSION['admin_pw_reset_email'] = $canonicalEmail;
    $_SESSION['admin_pw_reset_step'] = 2;

    echo json_encode([
        'success' => true,
        'message_key' => 'forgotCodeSent',
        'step' => 2,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
