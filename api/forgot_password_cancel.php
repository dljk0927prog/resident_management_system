<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');

unset($_SESSION['admin_pw_reset_email'], $_SESSION['admin_pw_reset_step']);

echo json_encode(['success' => true]);
