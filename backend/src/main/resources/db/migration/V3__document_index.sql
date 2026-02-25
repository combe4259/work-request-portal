CREATE TABLE document_index (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id     BIGINT NOT NULL,
    ref_type    ENUM(
        'WORK_REQUEST',
        'TECH_TASK',
        'TEST_SCENARIO',
        'DEFECT',
        'DEPLOYMENT',
        'MEETING_NOTE',
        'PROJECT_IDEA',
        'KNOWLEDGE_BASE'
    ) NOT NULL,
    ref_id      BIGINT NOT NULL,
    doc_no      VARCHAR(20) NOT NULL,
    title       VARCHAR(100) NOT NULL,
    status      VARCHAR(30),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_di_team FOREIGN KEY (team_id) REFERENCES teams(id),

    UNIQUE KEY uq_di_team_ref (team_id, ref_type, ref_id),
    UNIQUE KEY uq_di_team_doc_no (team_id, doc_no),
    INDEX idx_di_team_updated (team_id, updated_at),
    INDEX idx_di_team_type (team_id, ref_type),
    INDEX idx_di_team_doc_no (team_id, doc_no),
    INDEX idx_di_team_title (team_id, title)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO document_index (team_id, ref_type, ref_id, doc_no, title, status, created_at, updated_at)
SELECT team_id, 'WORK_REQUEST', id, request_no, title, status, created_at, updated_at
FROM work_requests
UNION ALL
SELECT team_id, 'TECH_TASK', id, task_no, title, status, created_at, updated_at
FROM tech_tasks
UNION ALL
SELECT team_id, 'TEST_SCENARIO', id, scenario_no, title, status, created_at, updated_at
FROM test_scenarios
UNION ALL
SELECT team_id, 'DEFECT', id, defect_no, title, status, created_at, updated_at
FROM defects
UNION ALL
SELECT team_id, 'DEPLOYMENT', id, deploy_no, title, status, created_at, updated_at
FROM deployments
UNION ALL
SELECT team_id, 'MEETING_NOTE', id, note_no, title, NULL, created_at, updated_at
FROM meeting_notes
UNION ALL
SELECT team_id, 'PROJECT_IDEA', id, idea_no, title, status, created_at, updated_at
FROM project_ideas
UNION ALL
SELECT team_id, 'KNOWLEDGE_BASE', id, article_no, title, NULL, created_at, updated_at
FROM knowledge_base_articles;
