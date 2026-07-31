-- 住户管理系统数据库结构

CREATE DATABASE IF NOT EXISTS visitor_management_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE visitor_management_system;

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL DEFAULT '' COMMENT '管理员联系电话',
    email VARCHAR(255) NULL DEFAULT NULL COMMENT '绑定邮箱',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 二维码表
CREATE TABLE IF NOT EXISTS qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '二维码名字/备注',
    building_unit VARCHAR(100) NOT NULL DEFAULT '' COMMENT '单元楼',
    room_number VARCHAR(50) NOT NULL DEFAULT '' COMMENT '门牌号',
    qr_created_date DATE NOT NULL COMMENT '二维码创建日期',
    phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '住户电话号码（用于住户登录）',
    resident_username VARCHAR(64) NULL DEFAULT NULL COMMENT '住户登录用户名（可选，与电话均可登录）',
    password_hash VARCHAR(255) NOT NULL DEFAULT '' COMMENT '住户登录密码（加密存储）',
    qr_token VARCHAR(64) NOT NULL UNIQUE COMMENT '二维码唯一标识',
    created_by INT NOT NULL COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_qr_token (qr_token),
    INDEX idx_created_by (created_by),
    INDEX idx_phone (phone),
    UNIQUE KEY uk_resident_username (resident_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 扫描记录表
CREATE TABLE IF NOT EXISTS scan_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    qr_code_id INT NOT NULL COMMENT '二维码ID',
    qr_name VARCHAR(255) NOT NULL COMMENT '二维码名字/备注（冗余存储，便于历史查询）',
    building_unit VARCHAR(100) NOT NULL DEFAULT '' COMMENT '单元楼',
    room_number VARCHAR(50) NOT NULL DEFAULT '' COMMENT '门牌号',
    qr_created_date DATE NOT NULL COMMENT '二维码创建日期（冗余存储）',
    phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '住户电话号码（冗余存储）',
    visitor_ip VARCHAR(45) COMMENT '访客IP地址',
    visitor_user_agent TEXT COMMENT '访客浏览器信息',
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
    INDEX idx_qr_code_id (qr_code_id),
    INDEX idx_scanned_at (scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户操作日志表（管理员监控）
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_role VARCHAR(20) NOT NULL DEFAULT 'visitor' COMMENT '操作者角色：admin/resident/visitor',
    actor_id INT NULL COMMENT '操作者ID（管理员ID）',
    actor_name VARCHAR(100) NULL COMMENT '操作者标识（管理员名/住户手机号）',
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT '目标类型',
    target_id VARCHAR(64) NULL COMMENT '目标ID',
    description VARCHAR(255) NOT NULL DEFAULT '' COMMENT '操作说明',
    ip_address VARCHAR(45) NULL COMMENT '来源IP',
    user_agent TEXT NULL COMMENT 'UA',
    meta_json TEXT NULL COMMENT '扩展信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_actor_role (actor_role),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理员忘记密码：邮箱验证码（哈希存储）
CREATE TABLE IF NOT EXISTS admin_password_reset_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员账户（用户名：admin，密码：admin123）
-- 注意：实际使用时请修改密码
-- 如果此密码hash无法使用，请运行 setup.php 生成新的hash
INSERT INTO admins (username, password) VALUES 
('admin', '$2y$10$dFVpQiZ9.RA0e5MeAo73LuBebHk0p9KI6OYUr6QioLLDiyu9ym4qS');
-- 默认密码：admin123

