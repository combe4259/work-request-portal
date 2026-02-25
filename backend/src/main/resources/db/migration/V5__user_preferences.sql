CREATE TABLE user_preferences (
    user_id         BIGINT PRIMARY KEY,
    notify_assign   TINYINT(1) NOT NULL DEFAULT 1,
    notify_comment  TINYINT(1) NOT NULL DEFAULT 1,
    notify_deadline TINYINT(1) NOT NULL DEFAULT 1,
    notify_status   TINYINT(1) NOT NULL DEFAULT 0,
    notify_deploy   TINYINT(1) NOT NULL DEFAULT 1,
    notify_mention  TINYINT(1) NOT NULL DEFAULT 0,
    landing_page    VARCHAR(50) NOT NULL DEFAULT '/dashboard',
    row_count       INT NOT NULL DEFAULT 20,
    avatar_color    VARCHAR(20) NOT NULL DEFAULT 'brand',
    photo_url       LONGTEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_user_preferences_row_count CHECK (row_count > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
