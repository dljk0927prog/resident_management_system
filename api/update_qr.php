<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isAdminLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = isset($input['id']) ? (int)$input['id'] : 0;
$name = trim($input['name'] ?? '');
$building_unit = trim($input['building_unit'] ?? '');
$room_number = trim($input['room_number'] ?? '');
$qr_created_date = trim($input['qr_created_date'] ?? '');
$phone = trim($input['phone'] ?? '');
$password = $input['password'] ?? '';
$resident_username_raw = isset($input['resident_username']) ? trim($input['resident_username']) : '';
$resident_username = $resident_username_raw === '' ? null : $resident_username_raw;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid id']);
    exit;
}

if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name is required']);
    exit;
}
if ($building_unit === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Building unit is required']);
    exit;
}
if ($room_number === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Room number is required']);
    exit;
}
if ($qr_created_date === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'QR date is required']);
    exit;
}
if ($phone === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Phone is required']);
    exit;
}

if ($resident_username !== null) {
    $len = function_exists('mb_strlen') ? mb_strlen($resident_username, 'UTF-8') : strlen($resident_username);
    if ($len < 2 || $len > 64) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username length must be 2–64 characters']);
        exit;
    }
    if (!preg_match('/^[\p{L}\p{N}_\-.]+$/u', $resident_username)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid username characters']);
        exit;
    }
}

if ($password !== '' && strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message_key' => 'errPasswordTooShort']);
    exit;
}

try {
    $conn = getDBConnection();
    $admin_id = getCurrentAdminId();

    $stmt = $conn->prepare('SELECT id FROM qr_codes WHERE id = ? AND created_by = ?');
    $stmt->execute([$id, $admin_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden']);
        exit;
    }

    if ($resident_username !== null) {
        $chk = $conn->prepare('SELECT id FROM qr_codes WHERE resident_username = ? AND id != ? LIMIT 1');
        $chk->execute([$resident_username, $id]);
        if ($chk->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errResidentUsernameTaken']);
            exit;
        }
    }

    $passwordProvided = $password !== '';
    $password_hash = $passwordProvided ? password_hash($password, PASSWORD_DEFAULT) : null;

    try {
        if ($passwordProvided) {
            $stmt = $conn->prepare('
                UPDATE qr_codes SET
                    name = ?, building_unit = ?, room_number = ?, qr_created_date = ?,
                    phone = ?, resident_username = ?, password_hash = ?
                WHERE id = ? AND created_by = ?
            ');
            $stmt->execute([
                $name, $building_unit, $room_number, $qr_created_date,
                $phone, $resident_username, $password_hash, $id, $admin_id,
            ]);
        } else {
            $stmt = $conn->prepare('
                UPDATE qr_codes SET
                    name = ?, building_unit = ?, room_number = ?, qr_created_date = ?,
                    phone = ?, resident_username = ?
                WHERE id = ? AND created_by = ?
            ');
            $stmt->execute([
                $name, $building_unit, $room_number, $qr_created_date,
                $phone, $resident_username, $id, $admin_id,
            ]);
        }
    } catch (Exception $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Unknown column') !== false && strpos($msg, 'resident_username') !== false) {
            if ($passwordProvided) {
                $stmt = $conn->prepare('
                    UPDATE qr_codes SET
                        name = ?, building_unit = ?, room_number = ?, qr_created_date = ?,
                        phone = ?, password_hash = ?
                    WHERE id = ? AND created_by = ?
                ');
                $stmt->execute([
                    $name, $building_unit, $room_number, $qr_created_date,
                    $phone, $password_hash, $id, $admin_id,
                ]);
            } else {
                $stmt = $conn->prepare('
                    UPDATE qr_codes SET
                        name = ?, building_unit = ?, room_number = ?, qr_created_date = ?,
                        phone = ?
                    WHERE id = ? AND created_by = ?
                ');
                $stmt->execute([
                    $name, $building_unit, $room_number, $qr_created_date,
                    $phone, $id, $admin_id,
                ]);
            }
            $resident_username = null;
        } elseif (strpos($msg, '1062') !== false || stripos($msg, 'Duplicate') !== false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message_key' => 'errResidentUsernameTaken']);
            exit;
        } else {
            throw $e;
        }
    }

    logUserAction('update_qr', 'qr_code', $id, 'Updated resident / QR record', [
        'name' => $name,
        'phone' => $phone,
    ]);

    echo json_encode([
        'success' => true,
        'message_key' => 'residentUpdated',
        'qr_code' => [
            'id' => $id,
            'name' => $name,
            'building_unit' => $building_unit,
            'room_number' => $room_number,
            'qr_created_date' => $qr_created_date,
            'phone' => $phone,
            'resident_username' => $resident_username,
        ],
    ]);
} catch (Exception $e) {
    logUserAction('update_qr_failed', 'qr_code', $id ?? null, 'Update QR failed', ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
