CREATE TABLE github_repo_team_mappings (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    repository_full_name  VARCHAR(200) NOT NULL,
    team_id               BIGINT NOT NULL,
    is_active             TINYINT(1) NOT NULL DEFAULT 1,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_grtm_team FOREIGN KEY (team_id) REFERENCES teams(id),

    UNIQUE KEY uq_grtm_repo (repository_full_name),
    INDEX idx_grtm_team (team_id),
    INDEX idx_grtm_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE github_webhook_deliveries (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id           VARCHAR(120) NOT NULL,
    event_type            VARCHAR(50) NOT NULL,
    action_type           VARCHAR(50),
    repository_full_name  VARCHAR(200),
    payload_hash          CHAR(64) NOT NULL,
    payload_json          LONGTEXT NOT NULL,
    status                ENUM('RECEIVED', 'PROCESSING', 'SUCCESS', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'RECEIVED',
    attempt_count         INT NOT NULL DEFAULT 0,
    last_error            VARCHAR(1000),
    next_retry_at         DATETIME,
    processed_at          DATETIME,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_ghwd_delivery_id (delivery_id),
    INDEX idx_ghwd_status_retry (status, next_retry_at),
    INDEX idx_ghwd_repository (repository_full_name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
