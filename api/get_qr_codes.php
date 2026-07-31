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

    $admin_id = getCurrentAdminId();
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
    if ($limit < 0) {
        $limit = 0;
    }

    $sql = "
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
        WHERE qr.created_by = :admin_id
    ";

    if ($search !== '') {
        $sql .= " AND (
            qr.name LIKE :search_name
            OR qr.phone LIKE :search_phone
            OR qr.resident_username LIKE :search_username
            OR qr.building_unit LIKE :search_unit
            OR qr.room_number LIKE :search_room
        )";
    }

    $sql .= " GROUP BY qr.id ORDER BY qr.created_at DESC";
    if ($limit > 0) {
        $sql .= " LIMIT :limit";
    }

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':admin_id', $admin_id, PDO::PARAM_INT);
    if ($search !== '') {
        $kw = '%' . $search . '%';
        $stmt->bindValue(':search_name', $kw, PDO::PARAM_STR);
        $stmt->bindValue(':search_phone', $kw, PDO::PARAM_STR);
        $stmt->bindValue(':search_username', $kw, PDO::PARAM_STR);
        $stmt->bindValue(':search_unit', $kw, PDO::PARAM_STR);
        $stmt->bindValue(':search_room', $kw, PDO::PARAM_STR);
    }
    if ($limit > 0) {
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    }
    try {
        $stmt->execute();
        $qr_codes = $stmt->fetchAll();
    } catch (Exception $e) {
        $em = $e->getMessage();
        if (strpos($em, 'resident_username') === false && strpos($em, 'Unknown column') === false) {
            throw $e;
        }
        $sqlLegacy = "
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
            WHERE qr.created_by = :admin_id
        ";
        if ($search !== '') {
            $sqlLegacy .= " AND (
                qr.name LIKE :search_name
                OR qr.phone LIKE :search_phone
                OR qr.building_unit LIKE :search_unit
                OR qr.room_number LIKE :search_room
            )";
        }
        $sqlLegacy .= " GROUP BY qr.id ORDER BY qr.created_at DESC";
        if ($limit > 0) {
            $sqlLegacy .= " LIMIT :limit";
        }
        $stmt = $conn->prepare($sqlLegacy);
        $stmt->bindValue(':admin_id', $admin_id, PDO::PARAM_INT);
        if ($search !== '') {
            $kw = '%' . $search . '%';
            $stmt->bindValue(':search_name', $kw, PDO::PARAM_STR);
            $stmt->bindValue(':search_phone', $kw, PDO::PARAM_STR);
            $stmt->bindValue(':search_unit', $kw, PDO::PARAM_STR);
            $stmt->bindValue(':search_room', $kw, PDO::PARAM_STR);
        }
        if ($limit > 0) {
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        }
        $stmt->execute();
        $qr_codes = $stmt->fetchAll();
        foreach ($qr_codes as &$qr) {
            $qr['resident_username'] = null;
        }
        unset($qr);
    }
    
    // 添加二维码URL
    foreach ($qr_codes as &$qr) {
        $qr['qr_url'] = BASE_URL . 'scan.php?token=' . $qr['qr_token'];
    }
    
    echo json_encode([
        'success' => true,
        'qr_codes' => $qr_codes
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '获取二维码列表失败: ' . $e->getMessage()]);
}

