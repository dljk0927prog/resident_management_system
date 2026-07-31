<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isAdminLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$adminId = (int)$_SESSION['admin_id'];

function admin_profile_columns_ok(PDO $conn) {
    try {
        $conn->query('SELECT phone, email FROM admins LIMIT 1');
        return true;
    } catch (Exception $e) {
        return false;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = getDBConnection();
    if (!admin_profile_columns_ok($conn)) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'need_db_upgrade' => true,
            'message_key' => 'settingsNeedDbUpgrade',
        ]);
        exit;
    }

    if ($method === 'GET') {
        $stmt = $conn->prepare('SELECT username, phone, email FROM admins WHERE id = ?');
        $stmt->execute([$adminId]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Not found']);
            exit;
        }
        echo json_encode([
            'success' => true,
            'profile' => [
                'username' => $row['username'],
                'phone' => $row['phone'] ?? '',
                'email' => $row['email'] ?? '',
            ],
        ]);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $currentPassword = $input['current_password'] ?? '';
    $username = trim($input['username'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $newPassword = $input['new_password'] ?? '';
    $newPasswordConfirm = $input['new_password_confirm'] ?? '';

    if ($currentPassword === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'errEnterCurrentPassword']);
        exit;
    }

    $stmt = $conn->prepare('SELECT id, username, password FROM admins WHERE id = ?');
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();
    if (!$admin || !password_verify($currentPassword, $admin['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message_key' => 'errWrongCurrentPassword']);
        exit;
    }

    if ($username === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'errEnterUsername']);
        exit;
    }
    if (strlen($username) > 50) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'errUsernameTooLong']);
        exit;
    }
    if (strlen($phone) > 30) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message_key' => 'errPhoneTooLong']);
        exit;
    }

    if ($email !== '') {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errInvalidEmail']);
            exit;
        }
    }

    if ($newPassword !== '' || $newPasswordConfirm !== '') {
        if ($newPassword !== $newPasswordConfirm) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errPasswordMismatch']);
            exit;
        }
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errPasswordTooShort']);
            exit;
        }
    }

    if ($username !== $admin['username']) {
        $stmt = $conn->prepare('SELECT id FROM admins WHERE username = ? AND id != ?');
        $stmt->execute([$username, $adminId]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errUsernameTaken']);
            exit;
        }
    }

    $passwordHash = $admin['password'];
    if ($newPassword !== '') {
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    $emailVal = $email === '' ? null : $email;

    $stmt = $conn->prepare('UPDATE admins SET username = ?, phone = ?, email = ?, password = ? WHERE id = ?');
    $stmt->execute([$username, $phone, $emailVal, $passwordHash, $adminId]);

    $_SESSION['admin_username'] = $username;

    logUserAction('admin_update_profile', 'admin', $adminId, 'Admin updated account settings', [
        'username' => $username,
    ]);

    echo json_encode([
        'success' => true,
        'message_key' => 'settingsSaved',
        'profile' => [
            'username' => $username,
            'phone' => $phone,
            'email' => $email,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
