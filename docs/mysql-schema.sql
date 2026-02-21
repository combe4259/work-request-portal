-- =====================================================
-- IT 업무요청 포털 — MySQL Schema
-- 비즈니스 핵심 데이터 (구조화, 관계, 트랜잭션)
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 팀 (Teams)
-- =====================================================
CREATE TABLE teams (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    invite_code VARCHAR(20) UNIQUE,             -- 팀 가입 코드
    created_by  BIGINT,                         -- 팀 생성자 (순환참조 방지로 FK 미설정)
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. 사용자 (Users)
-- [변경] team_id 제거 → user_teams 테이블로 관리
-- =====================================================
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('PM', 'TEAM_LEAD', 'DEVELOPER', 'REQUESTER') NOT NULL DEFAULT 'DEVELOPER',
    slack_user_id   VARCHAR(50),                -- Slack 멘션용 (@user)
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. 유저-팀 소속 (User Teams)
-- 1명이 여러 팀 소속 가능
-- =====================================================
CREATE TABLE user_teams (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    team_id     BIGINT NOT NULL,
    team_role   ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ut_user   FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ut_team   FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE KEY uq_user_team (user_id, team_id),
    INDEX idx_ut_team_id (team_id)
);

-- =====================================================
-- 4. 팀 초대 / 가입 요청 (Team Invitations)
-- =====================================================
CREATE TABLE team_invitations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id         BIGINT NOT NULL,
    email           VARCHAR(100) NOT NULL,      -- 초대 대상 이메일
    invited_by      BIGINT NOT NULL,            -- 초대한 사람
    token           VARCHAR(64) UNIQUE NOT NULL, -- 초대 링크 토큰 (UUID)
    status          ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inv_team      FOREIGN KEY (team_id)    REFERENCES teams(id),
    CONSTRAINT fk_inv_inviter   FOREIGN KEY (invited_by) REFERENCES users(id),
    INDEX idx_inv_email  (email),
    INDEX idx_inv_token  (token),
    INDEX idx_inv_status (status)
);

-- =====================================================
-- 5. 업무 요청 (Work Requests)
-- =====================================================
CREATE TABLE work_requests (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_no      VARCHAR(20) NOT NULL UNIQUE,    -- WR-2026-0001
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

    team_id         BIGINT NOT NULL,            -- 팀 스코핑 (필수)
    requester_id    BIGINT NOT NULL,
    assignee_id     BIGINT,

    deadline        DATE,
    started_at      DATETIME,
    completed_at    DATETIME,

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_wr_team       FOREIGN KEY (team_id)      REFERENCES teams(id),
    CONSTRAINT fk_wr_requester  FOREIGN KEY (requester_id) REFERENCES users(id),
    CONSTRAINT fk_wr_assignee   FOREIGN KEY (assignee_id)  REFERENCES users(id),

    INDEX idx_wr_team_id    (team_id),
    INDEX idx_wr_status     (status),
    INDEX idx_wr_requester  (requester_id),
    INDEX idx_wr_assignee   (assignee_id),
    INDEX idx_wr_deadline   (deadline)
);

-- =====================================================
-- 6. 개발 계획서 (Development Plans)
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
-- 7. 테스트 시나리오 (Test Scenarios)
-- =====================================================
CREATE TABLE test_scenarios (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_no         VARCHAR(20) NOT NULL UNIQUE,    -- TS-2026-0001
    work_request_id     BIGINT NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    precondition        TEXT,
    steps               JSON,       -- [{"order":1, "action":"...", "expected":"..."}]
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
-- 8. 결함 목록 (Defects)
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
                            'RESOLVED',
                            'CLOSED',
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
-- 9. 배포 (Deployments)
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
-- 10. 댓글 (Comments)
-- =====================================================
CREATE TABLE comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type    ENUM('WORK_REQUEST', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'PROJECT_IDEA') NOT NULL,
    ref_id      BIGINT NOT NULL,
    content     TEXT NOT NULL,
    author_id   BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_comment_ref (ref_type, ref_id)
);

-- =====================================================
-- 11. 첨부파일 (Attachments)
-- =====================================================
CREATE TABLE attachments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type        ENUM('WORK_REQUEST', 'DEVELOPMENT_PLAN', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE') NOT NULL,
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
-- 12. 알림 (Notifications)
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
                    'DEPLOY_FAILED',
                    'TEAM_INVITED',             -- 팀 초대
                    'IDEA_ADOPTED',             -- 아이디어 채택
                    'MEETING_ACTION_ASSIGNED'   -- 회의 액션 아이템 배정
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
-- 13. 회의록 (Meeting Notes)
-- =====================================================
CREATE TABLE meeting_notes (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id         BIGINT NOT NULL,
    title           VARCHAR(300) NOT NULL,
    meeting_date    DATE NOT NULL,
    location        VARCHAR(200),               -- 온라인/오프라인, 장소명
    agenda          TEXT,                       -- 안건 요약
    content         TEXT,                       -- 회의 내용
    created_by      BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_meeting_team       FOREIGN KEY (team_id)    REFERENCES teams(id),
    CONSTRAINT fk_meeting_created_by FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_meeting_team_id (team_id),
    INDEX idx_meeting_date    (meeting_date)
);

-- =====================================================
-- 14. 회의 참석자 (Meeting Attendees)
-- =====================================================
CREATE TABLE meeting_attendees (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    meeting_note_id BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    attended        TINYINT(1) NOT NULL DEFAULT 1,  -- 참석 여부

    CONSTRAINT fk_attendee_meeting  FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id),
    CONSTRAINT fk_attendee_user     FOREIGN KEY (user_id)         REFERENCES users(id),
    UNIQUE KEY uq_meeting_user (meeting_note_id, user_id)
);

-- =====================================================
-- 15. 회의 액션 아이템 (Meeting Action Items)
-- =====================================================
CREATE TABLE meeting_action_items (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    meeting_note_id     BIGINT NOT NULL,
    content             TEXT NOT NULL,              -- 액션 내용
    assignee_id         BIGINT,                     -- 담당자
    due_date            DATE,
    status              ENUM('PENDING', 'IN_PROGRESS', 'DONE') NOT NULL DEFAULT 'PENDING',
    work_request_id     BIGINT,                     -- 업무요청으로 전환 시 연결
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_action_meeting    FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id),
    CONSTRAINT fk_action_assignee   FOREIGN KEY (assignee_id)     REFERENCES users(id),
    CONSTRAINT fk_action_wr         FOREIGN KEY (work_request_id) REFERENCES work_requests(id),

    INDEX idx_action_meeting_id (meeting_note_id),
    INDEX idx_action_assignee   (assignee_id)
);

-- =====================================================
-- 16. 프로젝트 아이디어 (Project Ideas)
-- =====================================================
CREATE TABLE project_ideas (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id         BIGINT NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    status          ENUM(
                        'OPEN',         -- 검토 전
                        'REVIEWING',    -- 검토중
                        'ADOPTED',      -- 채택
                        'REJECTED',     -- 기각
                        'CONVERTED'     -- 업무요청으로 전환됨
                    ) NOT NULL DEFAULT 'OPEN',
    work_request_id BIGINT,                     -- 전환된 업무요청
    submitted_by    BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_idea_team         FOREIGN KEY (team_id)         REFERENCES teams(id),
    CONSTRAINT fk_idea_submitted_by FOREIGN KEY (submitted_by)    REFERENCES users(id),
    CONSTRAINT fk_idea_wr           FOREIGN KEY (work_request_id) REFERENCES work_requests(id),

    INDEX idx_idea_team_id (team_id),
    INDEX idx_idea_status  (status)
);

-- =====================================================
-- 17. 아이디어 투표 (Idea Votes)
-- =====================================================
CREATE TABLE idea_votes (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    idea_id     BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vote_idea FOREIGN KEY (idea_id)  REFERENCES project_ideas(id),
    CONSTRAINT fk_vote_user FOREIGN KEY (user_id)  REFERENCES users(id),
    UNIQUE KEY uq_idea_user_vote (idea_id, user_id)
);

-- =====================================================
-- 18. 공유 리소스 (Shared Resources)
-- 팀 공용 링크 모음 (Figma, Notion 등)
-- =====================================================
CREATE TABLE shared_resources (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id     BIGINT NOT NULL,
    title       VARCHAR(200) NOT NULL,
    url         VARCHAR(1000) NOT NULL,
    description VARCHAR(500),
    category    ENUM(
                    'DESIGN',       -- 디자인 (Figma 등)
                    'PLANNING',     -- 기획 (Notion, Confluence 등)
                    'DEVELOPMENT',  -- 개발 (GitHub, API 문서 등)
                    'REFERENCE',    -- 참고자료
                    'OTHER'         -- 기타
                ) NOT NULL DEFAULT 'OTHER',
    icon        VARCHAR(10),                    -- 이모지 아이콘
    added_by    BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_resource_team     FOREIGN KEY (team_id)   REFERENCES teams(id),
    CONSTRAINT fk_resource_added_by FOREIGN KEY (added_by)  REFERENCES users(id),

    INDEX idx_resource_team_id  (team_id),
    INDEX idx_resource_category (category)
);

-- =====================================================
-- 19. 문서번호 채번 (Document Sequences)
-- =====================================================
CREATE TABLE document_sequences (
    prefix      VARCHAR(5) NOT NULL,
    last_seq    INT        NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix)
);

-- 문서번호 형식: WR-001(업무요청), TK-001(기술과제), TS-001(테스트시나리오), DF-001(결함), DP-001(배포)
INSERT INTO document_sequences (prefix, last_seq) VALUES
    ('WR', 0),
    ('TK', 0),
    ('TS', 0),
    ('DF', 0),
    ('DP', 0);

SET FOREIGN_KEY_CHECKS = 1;
