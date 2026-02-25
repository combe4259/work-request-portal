CREATE TABLE work_request_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_request_id   BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'PROJECT_IDEA', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id            BIGINT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wrr_request FOREIGN KEY (work_request_id) REFERENCES work_requests(id) ON DELETE CASCADE,

    UNIQUE KEY uq_wrr_ref (work_request_id, ref_type, ref_id),
    INDEX idx_wrr_request (work_request_id),
    INDEX idx_wrr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
