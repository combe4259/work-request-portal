CREATE TABLE activity_logs (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id       BIGINT NOT NULL,
    ref_type      VARCHAR(30) NOT NULL,
    ref_id        BIGINT NOT NULL,
    action_type   VARCHAR(50) NOT NULL,
    actor_id      BIGINT,
    field_name    VARCHAR(50),
    before_value  VARCHAR(500),
    after_value   VARCHAR(500),
    message       VARCHAR(1000),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_activity_ref (team_id, ref_type, ref_id, id),
    INDEX idx_activity_actor (actor_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
