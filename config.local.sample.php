<?php
/**
 * 复制此文件为 config.local.php（勿提交含密码的文件到公开仓库）
 * 用于管理员「忘记密码」邮件验证码（SMTP）
 */

// define('SMTP_ENABLED', true);
// define('SMTP_HOST', 'smtp.gmail.com');
// define('SMTP_PORT', 587);
// define('SMTP_SECURE', 'tls'); // tls 或 ssl（465 常用 ssl）
// define('SMTP_USER', 'your@gmail.com');
// define('SMTP_PASS', 'your_app_password');
// define('MAIL_FROM_EMAIL', 'your@gmail.com');
// define('MAIL_FROM_NAME', '住户管理系统');

/** 本地无邮件服务时：发送失败则在接口响应中返回验证码（仅调试） */
// define('MAIL_DEV_SHOW_CODE', true);

/** 两次请求验证码最短间隔（秒），可自行调小/调大（建议 30～120） */
// define('RESET_RATE_SECONDS', 60);
