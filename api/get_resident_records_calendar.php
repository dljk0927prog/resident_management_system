<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isResidentLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '请先登录']);
    exit;
}

$phone = getResidentPhone();
if ($phone === null || $phone === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '请先登录']);
    exit;
}

try {
    $conn = getDBConnection();
    $month = isset($_GET['month']) ? trim($_GET['month']) : date('Y-m');
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        $month = date('Y-m');
    }

    $stmt = $conn->prepare("
        SELECT DATE(sr.scanned_at) as record_date, COUNT(*) as total
        FROM scan_records sr
        INNER JOIN qr_codes qr ON sr.qr_code_id = qr.id
        WHERE qr.phone = ? AND qr.is_active = 1
          AND DATE_FORMAT(sr.scanned_at, '%Y-%m') = ?
        GROUP BY DATE(sr.scanned_at)
        ORDER BY record_date ASC
    ");
    $stmt->execute([$phone, $month]);
    $rows = $stmt->fetchAll();

    $date_counts = [];
    foreach ($rows as $r) {
        $date_counts[$r['record_date']] = (int)$r['total'];
    }

    echo json_encode([
        'success' => true,
        'month' => $month,
        'date_counts' => $date_counts,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取日历数据失败: ' . $e->getMessage()]);
}
