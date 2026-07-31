<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isAdminLoggedIn()) {
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
        SELECT DATE(created_at) AS record_date, COUNT(*) AS total
        FROM user_activity_logs
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
        GROUP BY DATE(created_at)
        ORDER BY record_date ASC
    ");
    $stmt->execute([$month]);
    $rows = $stmt->fetchAll();

    $date_counts = [];
    foreach ($rows as $r) {
        $date_counts[$r['record_date']] = (int)$r['total'];
    }

    echo json_encode([
        'success' => true,
        'month' => $month,
        'date_counts' => $date_counts
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取活动日历失败: ' . $e->getMessage()]);
}

