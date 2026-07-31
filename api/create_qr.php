<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isAdminLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '请先登录']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '仅支持POST请求']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$building_unit = trim($input['building_unit'] ?? '');
$room_number = trim($input['room_number'] ?? '');
$qr_created_date = trim($input['qr_created_date'] ?? '');
$phone = trim($input['phone'] ?? '');
$password = $input['password'] ?? '';
$resident_username_raw = isset($input['resident_username']) ? trim($input['resident_username']) : '';
$resident_username = $resident_username_raw === '' ? null : $resident_username_raw;

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '名字/备注不能为空']);
    exit;
}
if (empty($building_unit)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '单元楼不能为空']);
    exit;
}
if (empty($room_number)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '门牌号不能为空']);
    exit;
}
if (empty($qr_created_date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '二维码创建日期不能为空']);
    exit;
}
if (empty($phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '电话号码不能为空']);
    exit;
}
if (empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '密码不能为空']);
    exit;
}

if ($resident_username !== null) {
    $len = function_exists('mb_strlen') ? mb_strlen($resident_username, 'UTF-8') : strlen($resident_username);
    if ($len < 2 || $len > 64) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '用户名长度应为2～64个字符']);
        exit;
    }
    if (!preg_match('/^[\p{L}\p{N}_\-.]+$/u', $resident_username)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '用户名仅允许字母、数字、下划线、连字符']);
        exit;
    }
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $conn = getDBConnection();
    $qr_token = generateToken(32);
    $admin_id = getCurrentAdminId();

    if ($resident_username !== null) {
        $chk = $conn->prepare('SELECT id FROM qr_codes WHERE resident_username = ? LIMIT 1');
        $chk->execute([$resident_username]);
        if ($chk->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '该用户名已被使用']);
            exit;
        }
    }

    $qr_id = null;
    try {
        $stmt = $conn->prepare('INSERT INTO qr_codes (name, building_unit, room_number, qr_created_date, phone, resident_username, password_hash, qr_token, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $building_unit, $room_number, $qr_created_date, $phone, $resident_username, $password_hash, $qr_token, $admin_id]);
        $qr_id = $conn->lastInsertId();
    } catch (Exception $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Unknown column') !== false && strpos($msg, 'resident_username') !== false) {
            $stmt = $conn->prepare('INSERT INTO qr_codes (name, building_unit, room_number, qr_created_date, phone, password_hash, qr_token, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$name, $building_unit, $room_number, $qr_created_date, $phone, $password_hash, $qr_token, $admin_id]);
            $qr_id = $conn->lastInsertId();
            $resident_username = null;
        } elseif (strpos($msg, '1062') !== false || stripos($msg, 'Duplicate') !== false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '该用户名已被使用']);
            exit;
        } else {
            throw $e;
        }
    }

    logUserAction('create_qr', 'qr_code', $qr_id, '创建二维码', [
        'name' => $name,
        'building_unit' => $building_unit,
        'room_number' => $room_number,
        'phone' => $phone,
        'resident_username' => $resident_username,
    ]);

    $out = [
        'id' => (int)$qr_id,
        'name' => $name,
        'building_unit' => $building_unit,
        'room_number' => $room_number,
        'qr_created_date' => $qr_created_date,
        'phone' => $phone,
        'qr_token' => $qr_token,
        'qr_url' => BASE_URL . 'scan.php?token=' . $qr_token,
    ];
    if ($resident_username !== null) {
        $out['resident_username'] = $resident_username;
    }

    echo json_encode([
        'success' => true,
        'message' => '二维码创建成功',
        'qr_code' => $out,
    ]);
} catch (Exception $e) {
    logUserAction('create_qr_failed', 'qr_code', null, '创建二维码失败', ['name' => $name, 'error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '创建失败: ' . $e->getMessage()]);
}
