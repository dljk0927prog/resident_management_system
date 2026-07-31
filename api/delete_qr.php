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
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的二维码ID']);
    exit;
}

try {
    $conn = getDBConnection();
    $admin_id = getCurrentAdminId();
    
    $stmt = $conn->prepare("SELECT id FROM qr_codes WHERE id = ? AND created_by = ?");
    $stmt->execute([$id, $admin_id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => '无权删除该二维码']);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM qr_codes WHERE id = ? AND created_by = ?");
    $stmt->execute([$id, $admin_id]);
    
    if ($stmt->rowCount() > 0) {
        logUserAction('delete_qr', 'qr_code', $id, '删除二维码');
        echo json_encode(['success' => true, 'message' => '删除成功']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '删除失败']);
    }
} catch (Exception $e) {
    logUserAction('delete_qr_failed', 'qr_code', $id, '删除二维码失败', ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '删除失败: ' . $e->getMessage()]);
}
