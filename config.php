<?php
define('RMS_ROOT', __DIR__);

// 可选：复制 config.local.sample.php 为 config.local.php 并填写 SMTP
if (is_file(RMS_ROOT . '/config.local.php')) {
    require_once RMS_ROOT . '/config.local.php';
}

if (!defined('SMTP_ENABLED')) {
    define('SMTP_ENABLED', false);
}
if (!defined('SMTP_HOST')) {
    define('SMTP_HOST', '');
}
if (!defined('SMTP_PORT')) {
    define('SMTP_PORT', 587);
}
if (!defined('SMTP_SECURE')) {
    define('SMTP_SECURE', 'tls');
}
if (!defined('SMTP_USER')) {
    define('SMTP_USER', '');
}
if (!defined('SMTP_PASS')) {
    define('SMTP_PASS', '');
}
if (!defined('MAIL_FROM_EMAIL')) {
    define('MAIL_FROM_EMAIL', 'noreply@localhost');
}
if (!defined('MAIL_FROM_NAME')) {
    define('MAIL_FROM_NAME', 'Resident Management System');
}
if (!defined('MAIL_DEV_SHOW_CODE')) {
    define('MAIL_DEV_SHOW_CODE', false);
}
if (!defined('RESET_RATE_SECONDS')) {
    define('RESET_RATE_SECONDS', 60);
}

// 数据库配置
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'visitor_management_system');

// 会话配置
define('SESSION_LIFETIME', 3600); // 1小时

// 网站基础URL（根据实际情况修改）
define('BASE_URL', 'http://localhost/resident_management_system/');

// 数据库连接
function getDBConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $conn;
    } catch(PDOException $e) {
        die("数据库连接失败: " . $e->getMessage());
    }
}

// 启动会话
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 检查管理员登录状态
function isAdminLoggedIn() {
    return isset($_SESSION['admin_id']) && isset($_SESSION['admin_username']);
}

// 检查住户登录状态
function isResidentLoggedIn() {
    return isset($_SESSION['resident_phone']);
}

// 获取当前管理员ID
function getCurrentAdminId() {
    return $_SESSION['admin_id'] ?? null;
}

// 获取当前住户电话
function getResidentPhone() {
    return $_SESSION['resident_phone'] ?? null;
}

// 生成随机token
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// 获取客户端IP
function getClientIP() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

// 记录用户操作日志（管理员/住户/访客）
function logUserAction($action, $target_type = '', $target_id = null, $description = '', $meta = null) {
    try {
        $conn = getDBConnection();
        $actor_role = 'visitor';
        $actor_id = null;
        $actor_name = null;

        if (isAdminLoggedIn()) {
            $actor_role = 'admin';
            $actor_id = (int)($_SESSION['admin_id'] ?? 0);
            $actor_name = $_SESSION['admin_username'] ?? null;
        } elseif (isResidentLoggedIn()) {
            $actor_role = 'resident';
            $actor_name = $_SESSION['resident_phone'] ?? null;
        }

        $meta_json = null;
        if (is_array($meta)) {
            $meta_json = json_encode($meta, JSON_UNESCAPED_UNICODE);
        } elseif (is_string($meta) && $meta !== '') {
            $meta_json = $meta;
        }

        $stmt = $conn->prepare("
            INSERT INTO user_activity_logs (
                actor_role, actor_id, actor_name, action, target_type, target_id,
                description, ip_address, user_agent, meta_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $actor_role,
            $actor_id,
            $actor_name,
            $action,
            $target_type,
            $target_id,
            $description,
            getClientIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $meta_json
        ]);
    } catch (Exception $e) {
        // 日志失败不影响主流程
    }
}

