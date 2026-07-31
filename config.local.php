<?php
/**
 * 本地/私有配置（勿提交到公开仓库）
 *
 * 【需要发真实邮件时】下面 SMTP 一段全部取消注释，并改成你的邮箱与授权码。
 * 【仅本机调试、发不出邮件时】保持 SMTP 注释，只开 MAIL_DEV_SHOW_CODE（已在下方）。
 * 【改验证码冷却时间】再取消注释 RESET_RATE_SECONDS。
 */

// —— 开发调试：发信失败时在弹窗里显示验证码（上线生产环境请改为 false 或删除本行）——

// —— 正式发邮件时再取消下面整段注释并填写真实信息 ——
// define('SMTP_ENABLED', true);
// define('SMTP_HOST', 'smtp.gmail.com');
// define('SMTP_PORT', 587);
// define('SMTP_SECURE', 'tls'); // tls 或 ssl（465 常用 ssl）
// define('SMTP_USER', 'your@gmail.com');
// define('SMTP_PASS', 'your_app_password');
// define('MAIL_FROM_EMAIL', 'your@gmail.com');
// define('MAIL_FROM_NAME', '住户管理系统');

// —— 可选：两次点「发送验证码」的最短间隔（秒），不设则用主配置默认 60 ——
define('RESET_RATE_SECONDS', 60);
