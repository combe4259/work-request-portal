CREATE TABLE flow_ui_states (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_request_id BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    team_id         BIGINT NOT NULL,
    state_json      JSON NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_fus_work_request FOREIGN KEY (work_request_id) REFERENCES work_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_fus_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fus_team FOREIGN KEY (team_id) REFERENCES teams(id),

    UNIQUE KEY uq_fus_work_request_user (work_request_id, user_id),
    INDEX idx_fus_team_id (team_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
