<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message_key' => 'bad_request']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$emailRaw = trim($input['email'] ?? '');
$code = preg_replace('/\D/', '', trim($input['code'] ?? ''));
$newPassword = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

$emailNorm = strtolower($emailRaw);
$sessEmail = isset($_SESSION['admin_pw_reset_email']) ? strtolower(trim($_SESSION['admin_pw_reset_email'])) : '';

if ($sessEmail === '' || $emailNorm === '' || $sessEmail !== $emailNorm) {
    http_response_code(400);
    unset($_SESSION['admin_pw_reset_email'], $_SESSION['admin_pw_reset_step']);
    echo json_encode(['success' => false, 'message_key' => 'forgotSessionExpired']);
    exit;
}

if (strlen($code) !== 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message_key' => 'forgotInvalidCodeLength']);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message_key' => 'errPasswordTooShort']);
    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message_key' => 'errPasswordMismatch']);
    exit;
}

$canonicalEmail = $_SESSION['admin_pw_reset_email'];

try {
    $conn = getDBConnection();
    $stmt = $conn->prepare('
        SELECT id, code_hash, expires_at FROM admin_password_reset_codes
        WHERE LOWER(TRIM(email)) = ?
        ORDER BY id DESC LIMIT 1
    ');
    $stmt->execute([strtolower($canonicalEmail)]);
    $row = $stmt->fetch();

    if (!$row || strtotime($row['expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'forgotCodeExpired']);
        exit;
    }

    if (!password_verify($code, $row['code_hash'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'forgotWrongCode']);
        exit;
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $upd = $conn->prepare('UPDATE admins SET password = ? WHERE LOWER(TRIM(email)) = ? LIMIT 1');
    $upd->execute([$hash, strtolower($canonicalEmail)]);

    $conn->prepare('DELETE FROM admin_password_reset_codes WHERE LOWER(TRIM(email)) = ?')->execute([strtolower($canonicalEmail)]);
    unset($_SESSION['admin_pw_reset_email'], $_SESSION['admin_pw_reset_step']);

    echo json_encode(['success' => true, 'message_key' => 'forgotPasswordUpdated']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
