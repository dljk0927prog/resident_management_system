<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isResidentLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '请先登录']);
    exit;
}

$phone = getResidentPhone();

try {
    $conn = getDBConnection();
    logUserAction('resident_view_my_qr', 'qr_code', null, '住户查看我的二维码', ['phone' => $phone]);
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                qr.id,
                qr.name,
                qr.building_unit,
                qr.room_number,
                qr.qr_created_date,
                qr.phone,
                qr.resident_username,
                qr.qr_token,
                qr.created_at,
                qr.is_active,
                COUNT(sr.id) as scan_count
            FROM qr_codes qr
            LEFT JOIN scan_records sr ON qr.id = sr.qr_code_id
            WHERE qr.phone = ? AND qr.is_active = 1
            GROUP BY qr.id
            ORDER BY qr.created_at DESC
        ");
        $stmt->execute([$phone]);
        $qr_codes = $stmt->fetchAll();
    } catch (Exception $e) {
        $em = $e->getMessage();
        if (strpos($em, 'resident_username') === false && strpos($em, 'Unknown column') === false) {
            throw $e;
        }
        $stmt = $conn->prepare("
            SELECT 
                qr.id,
                qr.name,
                qr.building_unit,
                qr.room_number,
                qr.qr_created_date,
                qr.phone,
                qr.qr_token,
                qr.created_at,
                qr.is_active,
                COUNT(sr.id) as scan_count
            FROM qr_codes qr
            LEFT JOIN scan_records sr ON qr.id = sr.qr_code_id
            WHERE qr.phone = ? AND qr.is_active = 1
            GROUP BY qr.id
            ORDER BY qr.created_at DESC
        ");
        $stmt->execute([$phone]);
        $qr_codes = $stmt->fetchAll();
        foreach ($qr_codes as &$qr) {
            $qr['resident_username'] = null;
        }
        unset($qr);
    }
    
    foreach ($qr_codes as &$qr) {
        $qr['qr_url'] = BASE_URL . 'scan.php?token=' . $qr['qr_token'];
    }
    
    echo json_encode([
        'success' => true,
        'resident' => [
            'phone' => $phone,
            'name' => $_SESSION['resident_name'] ?? ''
        ],
        'qr_codes' => $qr_codes
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取失败: ' . $e->getMessage()]);
}
