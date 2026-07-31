<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

$step = (!empty($_SESSION['admin_pw_reset_email']) && (int)($_SESSION['admin_pw_reset_step'] ?? 0) === 2) ? 2 : 1;

echo json_encode([
    'success' => true,
    'step' => $step,
    'email' => $step === 2 ? ($_SESSION['admin_pw_reset_email'] ?? null) : null,
]);
