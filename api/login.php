<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '仅支持POST请求']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$role = $input['role'] ?? 'admin'; // admin | resident

if ($role === 'resident') {
    $account = trim($input['account'] ?? $input['phone'] ?? '');
    $password = $input['password'] ?? '';
    
    if ($account === '' || $password === '') {
        logUserAction('resident_login_failed', 'auth', null, '住户登录失败：参数缺失', ['account' => $account]);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '账号和密码不能为空']);
        exit;
    }
    
    try {
        $conn = getDBConnection();
        $row = null;
        try {
            // 支持：电话号码、住户登录用户名(resident_username)、名字/备注(name) 登录
            // 同时命中时优先级：resident_username > phone > name
            $stmt = $conn->prepare("
                SELECT id, name, password_hash, phone
                FROM qr_codes
                WHERE is_active = 1 AND (phone = ? OR resident_username = ? OR name = ?)
                ORDER BY
                    CASE
                        WHEN resident_username = ? THEN 0
                        WHEN phone = ? THEN 1
                        WHEN name = ? THEN 2
                        ELSE 3
                    END,
                    id DESC
                LIMIT 1
            ");
            $stmt->execute([$account, $account, $account, $account, $account, $account]);
            $row = $stmt->fetch();
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'resident_username') === false && strpos($e->getMessage(), 'Unknown column') === false) {
                throw $e;
            }
            $stmt = $conn->prepare("
                SELECT id, name, password_hash, phone
                FROM qr_codes
                WHERE is_active = 1 AND (phone = ? OR name = ?)
                ORDER BY CASE WHEN phone = ? THEN 0 WHEN name = ? THEN 1 ELSE 2 END, id DESC
                LIMIT 1
            ");
            $stmt->execute([$account, $account, $account, $account]);
            $row = $stmt->fetch();
        }
        
        if ($row && password_verify($password, $row['password_hash'])) {
            unset($_SESSION['admin_id'], $_SESSION['admin_username']);
            $_SESSION['resident_phone'] = $row['phone'];
            $_SESSION['resident_name'] = $row['name'];
            logUserAction('resident_login_success', 'auth', $row['id'], '住户登录成功', ['phone' => $row['phone'], 'name' => $row['name']]);
            
            echo json_encode([
                'success' => true,
                'message' => '登录成功',
                'role' => 'resident',
                'resident' => [
                    'phone' => $row['phone'],
                    'name' => $row['name']
                ]
            ]);
        } else {
            logUserAction('resident_login_failed', 'auth', null, '住户登录失败：账号或密码错误', ['account' => $account]);
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '账号或密码错误']);
        }
    } catch (Exception $e) {
        logUserAction('resident_login_error', 'auth', null, '住户登录异常', ['account' => $account, 'error' => $e->getMessage()]);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '服务器错误: ' . $e->getMessage()]);
    }
    exit;
}

// 管理员登录
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    logUserAction('admin_login_failed', 'auth', null, '管理员登录失败：参数缺失', ['username' => $username]);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
    exit;
}

try {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT id, username, password FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch();
    
    if ($admin && password_verify($password, $admin['password'])) {
        unset($_SESSION['resident_phone'], $_SESSION['resident_name']);
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        logUserAction('admin_login_success', 'auth', $admin['id'], '管理员登录成功', ['username' => $admin['username']]);
        
        echo json_encode([
            'success' => true,
            'message' => '登录成功',
            'role' => 'admin',
            'admin' => [
                'id' => $admin['id'],
                'username' => $admin['username']
            ]
        ]);
    } else {
        logUserAction('admin_login_failed', 'auth', null, '管理员登录失败：账号或密码错误', ['username' => $username]);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
    }
} catch (Exception $e) {
    logUserAction('admin_login_error', 'auth', null, '管理员登录异常', ['username' => $username, 'error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '服务器错误: ' . $e->getMessage()]);
}

