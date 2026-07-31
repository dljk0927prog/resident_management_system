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

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 30;
    if ($page < 1) $page = 1;
    if ($limit <= 0) $limit = 30;
    if ($limit > 200) $limit = 200;
    $offset = ($page - 1) * $limit;

    $q = trim($_GET['q'] ?? '');
    $role = trim($_GET['role'] ?? '');
    $action = trim($_GET['action'] ?? '');
    $date = trim($_GET['date'] ?? '');
    $today_only = isset($_GET['today']) && $_GET['today'] == '1';

    $where = [];
    $params = [];

    if ($q !== '') {
        $where[] = "(actor_name LIKE ? OR action LIKE ? OR description LIKE ? OR ip_address LIKE ?)";
        $kw = '%' . $q . '%';
        $params[] = $kw;
        $params[] = $kw;
        $params[] = $kw;
        $params[] = $kw;
    }
    if ($role !== '') {
        $where[] = "actor_role = ?";
        $params[] = $role;
    }
    if ($action !== '') {
        $where[] = "action = ?";
        $params[] = $action;
    }
    if ($today_only) {
        $where[] = "DATE(created_at) = CURDATE()";
    } elseif ($date !== '') {
        $where[] = "DATE(created_at) = ?";
        $params[] = $date;
    }

    $whereSql = count($where) ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM user_activity_logs" . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetch()['total'] ?? 0);

    $sql = "SELECT id, actor_role, actor_id, actor_name, action, target_type, target_id, description, ip_address, created_at
            FROM user_activity_logs
            $whereSql
            ORDER BY id DESC
            LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    $paramsMain = $params;
    $paramsMain[] = $limit;
    $paramsMain[] = $offset;
    $stmt->execute($paramsMain);
    $logs = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $limit))
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取操作日志失败: ' . $e->getMessage()]);
}

