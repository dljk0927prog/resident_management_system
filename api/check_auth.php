<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (isAdminLoggedIn()) {
    $adminPhone = '';
    $adminEmail = '';
    try {
        $conn = getDBConnection();
        $stmt = $conn->prepare('SELECT phone, email FROM admins WHERE id = ?');
        $stmt->execute([(int)$_SESSION['admin_id']]);
        $prow = $stmt->fetch();
        if ($prow) {
            $adminPhone = $prow['phone'] ?? '';
            $adminEmail = $prow['email'] ?? '';
        }
    } catch (Exception $e) {
        // 旧库无 phone/email 列时忽略
    }
    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'role' => 'admin',
        'admin' => [
            'id' => $_SESSION['admin_id'],
            'username' => $_SESSION['admin_username'],
            'phone' => $adminPhone,
            'email' => $adminEmail,
        ]
    ]);
} elseif (isResidentLoggedIn()) {
    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'role' => 'resident',
        'resident' => [
            'phone' => $_SESSION['resident_phone'],
            'name' => $_SESSION['resident_name'] ?? ''
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => '未登录'
    ]);
}

