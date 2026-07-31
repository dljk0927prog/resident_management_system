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

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    if ($limit <= 0) {
        $limit = 50;
    }
    if ($limit > 200) {
        $limit = 200;
    }
    $offset = ($page - 1) * $limit;
    $date = isset($_GET['date']) ? trim($_GET['date']) : '';
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    $today_only = isset($_GET['today']) && $_GET['today'] == '1';

    $where = ['qr.phone = ?', 'qr.is_active = 1'];
    $params = [$phone];

    if ($today_only) {
        $where[] = 'DATE(sr.scanned_at) = CURDATE()';
    } elseif ($date !== '') {
        $where[] = 'DATE(sr.scanned_at) = ?';
        $params[] = $date;
    }
    if ($search !== '') {
        $where[] = '(sr.qr_name LIKE ? OR sr.visitor_ip LIKE ?)';
        $kw = '%' . $search . '%';
        $params[] = $kw;
        $params[] = $kw;
    }
    $whereSql = ' WHERE ' . implode(' AND ', $where);

    $countSql = 'SELECT COUNT(*) as total FROM scan_records sr INNER JOIN qr_codes qr ON sr.qr_code_id = qr.id' . $whereSql;
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    $records = [];
    try {
        $stmt = $conn->prepare("
            SELECT sr.id, sr.qr_name, sr.building_unit, sr.room_number, sr.qr_created_date, sr.phone, sr.visitor_ip, sr.visitor_user_agent, sr.scanned_at, qr.qr_token
            FROM scan_records sr
            INNER JOIN qr_codes qr ON sr.qr_code_id = qr.id
            $whereSql
            ORDER BY sr.scanned_at DESC
            LIMIT ? OFFSET ?
        ");
        $paramsMain = $params;
        $paramsMain[] = $limit;
        $paramsMain[] = $offset;
        $stmt->execute($paramsMain);
        $records = $stmt->fetchAll();
    } catch (Exception $e) {
        try {
            $stmt = $conn->prepare("
                SELECT sr.id, sr.qr_name, sr.visitor_ip, sr.visitor_user_agent, sr.scanned_at, qr.qr_token,
                       qr.building_unit, qr.room_number, qr.qr_created_date, qr.phone
                FROM scan_records sr
                INNER JOIN qr_codes qr ON sr.qr_code_id = qr.id
                $whereSql
                ORDER BY sr.scanned_at DESC
                LIMIT ? OFFSET ?
            ");
            $paramsMain = $params;
            $paramsMain[] = $limit;
            $paramsMain[] = $offset;
            $stmt->execute($paramsMain);
            $rows = $stmt->fetchAll();
        } catch (Exception $e2) {
            $stmt = $conn->prepare("
                SELECT sr.id, sr.qr_name, sr.visitor_ip, sr.visitor_user_agent, sr.scanned_at, qr.qr_token
                FROM scan_records sr
                INNER JOIN qr_codes qr ON sr.qr_code_id = qr.id
                $whereSql
                ORDER BY sr.scanned_at DESC
                LIMIT ? OFFSET ?
            ");
            $paramsMain = $params;
            $paramsMain[] = $limit;
            $paramsMain[] = $offset;
            $stmt->execute($paramsMain);
            $rows = $stmt->fetchAll();
        }
        foreach ($rows as $r) {
            $r['building_unit'] = $r['building_unit'] ?? '';
            $r['room_number'] = $r['room_number'] ?? '';
            $r['qr_created_date'] = isset($r['qr_created_date']) ? $r['qr_created_date'] : '';
            $r['phone'] = $r['phone'] ?? '';
            $records[] = $r;
        }
    }

    echo json_encode([
        'success' => true,
        'records' => $records,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $limit)),
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取记录失败: ' . $e->getMessage()]);
}
