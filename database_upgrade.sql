-- 已有数据库升级脚本：为二维码和扫描记录增加 单元楼、门牌号、二维码创建日期
-- 若你是全新安装，请直接导入 database.sql，无需执行本文件




-- 为 qr_codes 增加字段（MySQL 5.7 需逐条执行，已存在的列会报错可忽略）
ALTER TABLE qr_codes ADD COLUMN building_unit VARCHAR(100) NOT NULL DEFAULT '' COMMENT '单元楼' AFTER name;
ALTER TABLE qr_codes ADD COLUMN room_number VARCHAR(50) NOT NULL DEFAULT '' COMMENT '门牌号' AFTER building_unit;
ALTER TABLE qr_codes ADD COLUMN qr_created_date DATE NULL COMMENT '二维码创建日期' AFTER room_number;
UPDATE qr_codes SET qr_created_date = DATE(created_at) WHERE qr_created_date IS NULL;
ALTER TABLE qr_codes MODIFY COLUMN qr_created_date DATE NOT NULL;

-- 为 scan_records 增加字段
ALTER TABLE scan_records ADD COLUMN building_unit VARCHAR(100) NOT NULL DEFAULT '' COMMENT '单元楼' AFTER qr_name;
ALTER TABLE scan_records ADD COLUMN room_number VARCHAR(50) NOT NULL DEFAULT '' COMMENT '门牌号' AFTER building_unit;
ALTER TABLE scan_records ADD COLUMN qr_created_date DATE NULL COMMENT '二维码创建日期' AFTER room_number;
UPDATE scan_records sr LEFT JOIN qr_codes qr ON sr.qr_code_id = qr.id SET sr.building_unit = COALESCE(qr.building_unit,''), sr.room_number = COALESCE(qr.room_number,''), sr.qr_created_date = COALESCE(qr.qr_created_date, DATE(sr.scanned_at));
UPDATE scan_records SET qr_created_date = DATE(scanned_at) WHERE qr_created_date IS NULL;
ALTER TABLE scan_records MODIFY COLUMN qr_created_date DATE NOT NULL;

-- 为 scan_records 增加手机号（冗余存储，便于历史显示）
ALTER TABLE scan_records ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '住户电话号码' AFTER qr_created_date;
UPDATE scan_records sr LEFT JOIN qr_codes qr ON sr.qr_code_id = qr.id SET sr.phone = COALESCE(qr.phone, '') WHERE sr.phone = '';

-- 为 qr_codes 增加住户登录字段（电话号码、密码）
ALTER TABLE qr_codes ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '住户电话号码' AFTER qr_created_date;
ALTER TABLE qr_codes ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' COMMENT '住户登录密码' AFTER phone;
ALTER TABLE qr_codes ADD INDEX idx_phone (phone);

-- 住户登录用户名（可选，与电话号码二选一或同时用于登录）
ALTER TABLE qr_codes ADD COLUMN resident_username VARCHAR(64) NULL DEFAULT NULL COMMENT '住户登录用户名（可选）' AFTER phone;
ALTER TABLE qr_codes ADD UNIQUE KEY uk_resident_username (resident_username);

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
);

-- 管理员资料：联系电话、绑定邮箱（若列已存在可忽略报错）
ALTER TABLE admins ADD COLUMN phone VARCHAR(30) NOT NULL DEFAULT '' COMMENT '管理员联系电话' AFTER password;
ALTER TABLE admins ADD COLUMN email VARCHAR(255) NULL DEFAULT NULL COMMENT '绑定邮箱' AFTER phone;

-- 管理员忘记密码验证码表（若已存在可忽略）
CREATE TABLE IF NOT EXISTS admin_password_reset_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

