<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '仅支持POST请求']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '二维码token不能为空']);
    exit;
}

try {
    $conn = getDBConnection();
    
    // 查找二维码（兼容旧表：可能没有 building_unit 等列）
    $qr_code = null;
    try {
        $stmt = $conn->prepare("SELECT id, name, building_unit, room_number, qr_created_date, phone FROM qr_codes WHERE qr_token = ? AND is_active = 1");
        $stmt->execute([$token]);
        $qr_code = $stmt->fetch();
    } catch (Exception $e) {
        $stmt = $conn->prepare("SELECT id, name FROM qr_codes WHERE qr_token = ? AND is_active = 1");
        $stmt->execute([$token]);
        $qr_code = $stmt->fetch();
        if ($qr_code) {
            $qr_code['building_unit'] = '';
            $qr_code['room_number'] = '';
            $qr_code['qr_created_date'] = date('Y-m-d');
            $qr_code['phone'] = '';
        }
    }
    
    if (!$qr_code) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => '二维码无效或已失效']);
        exit;
    }
    
    // 记录扫描：先尝试新表结构，失败则用旧表结构
    $scanned_at = date('Y-m-d H:i:s');
    $recordId = null;
    try {
        $stmt = $conn->prepare("INSERT INTO scan_records (qr_code_id, qr_name, building_unit, room_number, qr_created_date, phone, visitor_ip, visitor_user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $qr_code['id'],
            $qr_code['name'],
            $qr_code['building_unit'] ?? '',
            $qr_code['room_number'] ?? '',
            $qr_code['qr_created_date'] ?? date('Y-m-d'),
            $qr_code['phone'] ?? '',
            getClientIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        $recordId = $conn->lastInsertId();
        if ($recordId) {
            $row = $conn->query("SELECT scanned_at FROM scan_records WHERE id = " . (int)$recordId)->fetch();
            if ($row && !empty($row['scanned_at'])) $scanned_at = $row['scanned_at'];
        }
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            $stmt = $conn->prepare("INSERT INTO scan_records (qr_code_id, qr_name, visitor_ip, visitor_user_agent) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $qr_code['id'],
                $qr_code['name'],
                getClientIP(),
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
        } else {
            throw $e;
        }
    }
    logUserAction('scan_qr', 'qr_code', $qr_code['id'], '访客扫码', [
        'qr_name' => $qr_code['name'],
        'record_id' => $recordId
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => '扫描成功',
        'qr_name' => $qr_code['name'],
        'building_unit' => $qr_code['building_unit'] ?? '',
        'room_number' => $qr_code['room_number'] ?? '',
        'qr_created_date' => $qr_code['qr_created_date'] ?? '',
        'phone' => $qr_code['phone'] ?? '',
        'scanned_at' => $scanned_at
    ]);
} catch (Exception $e) {
    logUserAction('scan_qr_failed', 'qr_code', null, '访客扫码失败', ['error' => $e->getMessage(), 'token' => $token]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '扫描失败: ' . $e->getMessage()]);
}

