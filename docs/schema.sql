-- =====================================================
-- IT 업무요청 포털 — DB 스키마 (MySQL)
-- =====================================================

SET
    FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 팀 (Teams)
-- =====================================================
CREATE TABLE teams (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. 사용자 (Users)
-- =====================================================
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('PM', 'TEAM_LEAD', 'DEVELOPER', 'REQUESTER') NOT NULL DEFAULT 'DEVELOPER',
    team_id         BIGINT,
    slack_user_id   VARCHAR(50),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- =====================================================
-- 3. 업무 요청 (Work Requests)
-- =====================================================
CREATE TABLE work_requests (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_no      VARCHAR(20) NOT NULL UNIQUE,        -- WR-2026-0001
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    type            ENUM('IT_REQUEST', 'DEV_REQUEST', 'REFERENCE_WORK') NOT NULL DEFAULT 'IT_REQUEST',
    priority        ENUM('URGENT', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    status          ENUM(
                        'RECEIVED',         -- 접수됨
                        'REVIEWING',        -- 검토중
                        'PLANNING',         -- 개발계획서 작성
                        'IN_DEVELOPMENT',   -- 개발진행
                        'TESTING',          -- 테스트중
                        'DEFECT_FIXING',    -- 결함처리중
                        'DEPLOY_READY',     -- 배포대기
                        'COMPLETED',        -- 완료
                        'CANCELLED'         -- 취소
                    ) NOT NULL DEFAULT 'RECEIVED',

    requester_id    BIGINT NOT NULL,
    assignee_id     BIGINT,
    team_id         BIGINT,

    deadline        DATE,
    started_at      DATETIME,
    completed_at    DATETIME,

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_wr_requester  FOREIGN KEY (requester_id) REFERENCES users(id),
    CONSTRAINT fk_wr_assignee   FOREIGN KEY (assignee_id)  REFERENCES users(id),
    CONSTRAINT fk_wr_team       FOREIGN KEY (team_id)      REFERENCES teams(id),

    INDEX idx_wr_status     (status),
    INDEX idx_wr_requester  (requester_id),
    INDEX idx_wr_assignee   (assignee_id),
    INDEX idx_wr_deadline   (deadline)
);

-- =====================================================
-- 4. 개발 계획서 (Development Plans)
-- =====================================================
CREATE TABLE development_plans (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_request_id     BIGINT NOT NULL,
    title               VARCHAR(300) NOT NULL,
    content             TEXT,
    tech_description    TEXT,
    estimated_hours     DECIMAL(6,1),
    planned_start_date  DATE,
    planned_end_date    DATE,
    created_by          BIGINT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_plan_wr           FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
    CONSTRAINT fk_plan_created_by   FOREIGN KEY (created_by)      REFERENCES users(id)
);

-- =====================================================
-- 5. 테스트 시나리오 (Test Scenarios)
-- =====================================================
CREATE TABLE test_scenarios (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_no         VARCHAR(20) NOT NULL UNIQUE,    -- TS-2026-0001
    work_request_id     BIGINT NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    precondition        TEXT,
    steps               JSON,                           -- [{"order":1,"action":"...","expected":"..."}]
    expected_result     TEXT,
    actual_result       TEXT,
    result              ENUM('PENDING', 'PASS', 'FAIL', 'SKIP') NOT NULL DEFAULT 'PENDING',
    tester_id           BIGINT,
    tested_at           DATETIME,
    created_by          BIGINT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ts_wr         FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
    CONSTRAINT fk_ts_tester     FOREIGN KEY (tester_id)       REFERENCES users(id),
    CONSTRAINT fk_ts_created_by FOREIGN KEY (created_by)      REFERENCES users(id),

    INDEX idx_ts_wr_id  (work_request_id),
    INDEX idx_ts_result (result)
);

-- =====================================================
-- 6. 결함 목록 (Defects)
-- =====================================================
CREATE TABLE defects (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    defect_no           VARCHAR(20) NOT NULL UNIQUE,    -- DF-2026-0001
    work_request_id     BIGINT NOT NULL,
    test_scenario_id    BIGINT,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    severity            ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    status              ENUM(
                            'OPEN',
                            'IN_PROGRESS',
                            'RESOLVED',     -- 수정 완료 (재테스트 필요)
                            'CLOSED',       -- 최종 확인 완료
                            'REOPENED'
                        ) NOT NULL DEFAULT 'OPEN',
    reporter_id         BIGINT NOT NULL,
    assignee_id         BIGINT,
    resolved_at         DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_defect_wr         FOREIGN KEY (work_request_id)  REFERENCES work_requests(id),
    CONSTRAINT fk_defect_scenario   FOREIGN KEY (test_scenario_id) REFERENCES test_scenarios(id),
    CONSTRAINT fk_defect_reporter   FOREIGN KEY (reporter_id)      REFERENCES users(id),
    CONSTRAINT fk_defect_assignee   FOREIGN KEY (assignee_id)      REFERENCES users(id),

    INDEX idx_defect_wr_id  (work_request_id),
    INDEX idx_defect_status (status)
);

-- =====================================================
-- 7. 배포 (Deployments)
-- =====================================================
CREATE TABLE deployments (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    deploy_no           VARCHAR(20) NOT NULL UNIQUE,    -- DP-2026-0001
    work_request_id     BIGINT NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    environment         ENUM('DEV', 'STAGE', 'PROD') NOT NULL,
    status              ENUM(
                            'REQUESTED',
                            'IN_PROGRESS',
                            'COMPLETED',
                            'FAILED',
                            'ROLLBACK'
                        ) NOT NULL DEFAULT 'REQUESTED',
    requester_id        BIGINT NOT NULL,
    scheduled_at        DATETIME,
    deployed_at         DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_deploy_wr         FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
    CONSTRAINT fk_deploy_requester  FOREIGN KEY (requester_id)    REFERENCES users(id),

    INDEX idx_deploy_wr_id  (work_request_id),
    INDEX idx_deploy_env    (environment)
);

-- =====================================================
-- 8. 댓글 (Comments)
-- =====================================================
CREATE TABLE comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type    ENUM('WORK_REQUEST', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT') NOT NULL,
    ref_id      BIGINT NOT NULL,
    content     TEXT NOT NULL,
    author_id   BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_comment_ref (ref_type, ref_id)
);

-- =====================================================
-- 9. 첨부파일 (Attachments)
-- =====================================================
CREATE TABLE attachments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type        ENUM('WORK_REQUEST', 'DEVELOPMENT_PLAN', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT') NOT NULL,
    ref_id          BIGINT NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    stored_path     VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    uploaded_by     BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attach_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_attach_ref (ref_type, ref_id)
);

-- =====================================================
-- 10. 업무요청 이력 (Work Request History)
-- =====================================================
CREATE TABLE work_request_histories (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_request_id     BIGINT NOT NULL,
    action              ENUM(
                            'CREATED',
                            'STATUS_CHANGED',
                            'ASSIGNED',
                            'PRIORITY_CHANGED',
                            'DEADLINE_CHANGED',
                            'COMMENT_ADDED',
                            'ATTACHMENT_ADDED',
                            'PLAN_CREATED',
                            'SCENARIO_ADDED',
                            'DEFECT_REGISTERED',
                            'DEPLOYED'
                        ) NOT NULL,
    from_value          VARCHAR(100),
    to_value            VARCHAR(100),
    description         VARCHAR(500),
    actor_id            BIGINT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_history_wr    FOREIGN KEY (work_request_id) REFERENCES work_requests(id),
    CONSTRAINT fk_history_actor FOREIGN KEY (actor_id)        REFERENCES users(id),
    INDEX idx_history_wr_id (work_request_id)
);

-- =====================================================
-- 11. 알림 (Notifications)
-- =====================================================
CREATE TABLE notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    type        ENUM(
                    'STATUS_CHANGED',
                    'ASSIGNED',
                    'DEADLINE_APPROACHING',
                    'DEFECT_REGISTERED',
                    'COMMENT_ADDED',
                    'DEPLOY_COMPLETED',
                    'DEPLOY_FAILED'
                ) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    ref_type    VARCHAR(50),
    ref_id      BIGINT,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    slack_sent  TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_notif_user_read (user_id, is_read)
);

-- =====================================================
-- 12. Slack 발송 이력 (Slack Notification Log)
-- =====================================================
CREATE TABLE slack_notification_logs (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    notification_id     BIGINT,
    channel             VARCHAR(100),
    slack_message_ts    VARCHAR(50),
    payload             JSON,
    status              ENUM('SENT', 'FAILED') NOT NULL,
    error_message       TEXT,
    sent_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_slack_log_notif FOREIGN KEY (notification_id) REFERENCES notifications(id)
);

-- =====================================================
-- 문서번호 채번 테이블 (시퀀스 대체)
-- 애플리케이션에서 SELECT ... FOR UPDATE 후 채번
-- =====================================================
CREATE TABLE document_sequences (
    prefix      VARCHAR(5) NOT NULL,    -- WR, TS, DF, DP
    year        CHAR(4) NOT NULL,
    last_seq    INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, year)
);

-- 초기 데이터
INSERT INTO document_sequences (prefix, year, last_seq) VALUES
    ('WR', '2026', 0),
    ('TS', '2026', 0),
    ('DF', '2026', 0),
    ('DP', '2026', 0);

SET FOREIGN_KEY_CHECKS = 1;
