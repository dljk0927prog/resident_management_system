<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

$role = isAdminLoggedIn() ? 'admin' : (isResidentLoggedIn() ? 'resident' : 'visitor');
$identity = isAdminLoggedIn() ? ($_SESSION['admin_username'] ?? '') : (isResidentLoggedIn() ? ($_SESSION['resident_phone'] ?? '') : '');
logUserAction($role . '_logout', 'auth', null, '退出登录', ['identity' => $identity]);

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();
echo json_encode(['success' => true, 'message' => '已退出登录']);

