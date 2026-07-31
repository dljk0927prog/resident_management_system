<?php
/**
 * 安装脚本 - 用于生成默认管理员密码hash
 * 运行此脚本后，将输出正确的SQL INSERT语句
 */

$password = 'admin123';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "默认管理员账户SQL语句：\n\n";
echo "INSERT INTO admins (username, password) VALUES \n";
echo "('admin', '" . $hash . "');\n\n";
echo "用户名：admin\n";
echo "密码：admin123\n\n";
echo "请将上述SQL语句复制到database.sql文件中，或直接在数据库中执行。\n";

