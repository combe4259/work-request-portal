-- =====================================================
-- IT 업무요청 포털 — MySQL Schema (Frontend-aligned)
-- 비즈니스 핵심 데이터 (구조화, 관계, 트랜잭션)
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 팀 (Teams)
-- =====================================================
CREATE TABLE teams (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   VARCHAR(200),
    invite_code   VARCHAR(20) NOT NULL UNIQUE,
    created_by    BIGINT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 2. 사용자 (Users)
-- =====================================================
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('PM', 'TEAM_LEAD', 'DEVELOPER', 'REQUESTER') NOT NULL DEFAULT 'DEVELOPER',
    position      VARCHAR(30),
    slack_user_id VARCHAR(50),
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_slack_user_id (slack_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 2-1. 사용자 환경설정 (User Preferences)
-- =====================================================
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

-- teams.created_by FK는 users 생성 이후에 연결
ALTER TABLE teams
    ADD CONSTRAINT fk_team_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- =====================================================
-- 3. 유저-팀 소속 (User Teams)
-- =====================================================
CREATE TABLE user_teams (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    team_id     BIGINT NOT NULL,
    team_role   ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ut_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ut_team FOREIGN KEY (team_id) REFERENCES teams(id),

    UNIQUE KEY uq_user_team (user_id, team_id),
    INDEX idx_ut_team_id (team_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 4. 팀 초대 / 가입 요청 (Team Invitations)
-- =====================================================
-- 초대 방식은 teams.invite_code 기반으로 일원화하여
-- team_invitations 테이블은 V6 마이그레이션에서 제거됨.

-- =====================================================
-- 5. 업무 요청 (Work Requests)
-- Frontend 타입(work-request.ts) 기준 상태값 정렬
-- =====================================================
CREATE TABLE work_requests (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_no    VARCHAR(20) NOT NULL UNIQUE, -- WR-001
    title         VARCHAR(100) NOT NULL,
    background    VARCHAR(500),
    description   TEXT NOT NULL,
    type          ENUM('기능개선', '신규개발', '버그수정', '인프라', '기타') NOT NULL DEFAULT '기능개선',
    priority      ENUM('긴급', '높음', '보통', '낮음') NOT NULL DEFAULT '보통',
    status        ENUM('접수대기', '검토중', '개발중', '테스트중', '완료', '반려') NOT NULL DEFAULT '접수대기',

    team_id       BIGINT NOT NULL,
    requester_id  BIGINT NOT NULL,
    assignee_id   BIGINT,

    deadline      DATE,
    started_at    DATETIME,
    completed_at  DATETIME,
    rejected_reason VARCHAR(500),
    rejected_at   DATETIME,

    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_wr_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_wr_requester FOREIGN KEY (requester_id) REFERENCES users(id),
    CONSTRAINT fk_wr_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),

    INDEX idx_wr_team_id (team_id),
    INDEX idx_wr_status (status),
    INDEX idx_wr_requester (requester_id),
    INDEX idx_wr_assignee (assignee_id),
    INDEX idx_wr_deadline (deadline),
    INDEX idx_wr_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 6. 기술 과제 (Tech Tasks)
-- 기존 development_plans 대체/확장
-- =====================================================
CREATE TABLE tech_tasks (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_no                   VARCHAR(20) NOT NULL UNIQUE, -- TK-001
    title                     VARCHAR(100) NOT NULL,
    current_issue             TEXT NOT NULL,
    solution                  TEXT NOT NULL,
    definition_of_done        JSON,
    type                      ENUM('리팩토링', '기술부채', '성능개선', '보안', '테스트', '기타') NOT NULL DEFAULT '기타',
    priority                  ENUM('긴급', '높음', '보통', '낮음') NOT NULL DEFAULT '보통',
    status                    ENUM('접수대기', '검토중', '개발중', '테스트중', '완료', '반려') NOT NULL DEFAULT '접수대기',

    team_id                   BIGINT NOT NULL,
    registrant_id             BIGINT NOT NULL,
    assignee_id               BIGINT,

    deadline                  DATE,
    started_at                DATETIME,
    completed_at              DATETIME,
    rejected_reason           VARCHAR(500),
    rejected_at               DATETIME,
    created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tk_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_tk_registrant FOREIGN KEY (registrant_id) REFERENCES users(id),
    CONSTRAINT fk_tk_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),

    INDEX idx_tk_team_id (team_id),
    INDEX idx_tk_status (status),
    INDEX idx_tk_priority (priority),
    INDEX idx_tk_assignee (assignee_id),
    INDEX idx_tk_deadline (deadline),
    INDEX idx_tk_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 6-1. 기술 과제 연관 문서 (Tech Task Related Refs)
-- =====================================================
CREATE TABLE tech_task_related_refs (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    tech_task_id  BIGINT NOT NULL,
    ref_type      ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT') NOT NULL,
    ref_id        BIGINT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tkr_task FOREIGN KEY (tech_task_id) REFERENCES tech_tasks(id) ON DELETE CASCADE,

    UNIQUE KEY uq_tkr_unique (tech_task_id, ref_type, ref_id),
    INDEX idx_tkr_task_id (tech_task_id),
    INDEX idx_tkr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 6-2. 기술 과제 PR 링크 (Tech Task PR Links)
-- =====================================================
CREATE TABLE tech_task_pr_links (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    tech_task_id  BIGINT NOT NULL,
    branch_name   VARCHAR(200) NOT NULL,
    pr_no         VARCHAR(30),
    pr_url        VARCHAR(1000),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tkpr_task FOREIGN KEY (tech_task_id) REFERENCES tech_tasks(id) ON DELETE CASCADE,

    INDEX idx_tkpr_task_id (tech_task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 7. 테스트 시나리오 (Test Scenarios)
-- WR/TK 모두 연관 가능하도록 다형 참조 사용
-- =====================================================
CREATE TABLE test_scenarios (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_no       VARCHAR(20) NOT NULL UNIQUE, -- TS-001
    title             VARCHAR(100) NOT NULL,
    description       TEXT,
    type              ENUM('기능', '회귀', '통합', 'E2E', '성능', '보안', '기타') NOT NULL DEFAULT '기능',
    priority          ENUM('긴급', '높음', '보통', '낮음') NOT NULL DEFAULT '보통',
    status            ENUM('작성중', '검토중', '승인됨', '실행중', '통과', '실패', '보류') NOT NULL DEFAULT '작성중',

    team_id           BIGINT NOT NULL,
    assignee_id       BIGINT,

    precondition      VARCHAR(1000),
    steps             JSON NOT NULL,
    expected_result   TEXT,
    actual_result     TEXT,
    deadline          DATE NOT NULL,
    executed_at       DATETIME,
    status_note       VARCHAR(500),

    created_by        BIGINT NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ts_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_ts_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),
    CONSTRAINT fk_ts_created_by FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_ts_team_id (team_id),
    INDEX idx_ts_status (status),
    INDEX idx_ts_priority (priority),
    INDEX idx_ts_assignee (assignee_id),
    INDEX idx_ts_deadline (deadline),
    INDEX idx_ts_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 7-1. 테스트 시나리오 연관 문서 (Test Scenario Related Refs)
-- =====================================================
CREATE TABLE test_scenario_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_scenario_id  BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT') NOT NULL,
    ref_id            BIGINT NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tsr_scenario FOREIGN KEY (test_scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE,

    UNIQUE KEY uq_tsr_unique (test_scenario_id, ref_type, ref_id),
    INDEX idx_tsr_scenario_id (test_scenario_id),
    INDEX idx_tsr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 8. 결함 목록 (Defects)
-- =====================================================
CREATE TABLE defects (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    defect_no         VARCHAR(20) NOT NULL UNIQUE, -- DF-001
    title             VARCHAR(100) NOT NULL,
    description       TEXT,
    type              ENUM('UI', '기능', '성능', '보안', '데이터', '기타') NOT NULL DEFAULT '기능',
    severity          ENUM('치명적', '높음', '보통', '낮음') NOT NULL DEFAULT '보통',
    status            ENUM('접수', '분석중', '수정중', '검증중', '완료', '재현불가', '보류') NOT NULL DEFAULT '접수',

    team_id           BIGINT NOT NULL,
    related_ref_type  ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO'),
    related_ref_id    BIGINT,

    environment       VARCHAR(200),
    reproduction_steps JSON,
    expected_behavior VARCHAR(1000) NOT NULL,
    actual_behavior   VARCHAR(1000) NOT NULL,
    deadline          DATE NOT NULL,
    status_note       VARCHAR(500),

    reporter_id       BIGINT NOT NULL,
    assignee_id       BIGINT,
    started_at        DATETIME,
    verified_at       DATETIME,
    resolved_at       DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_df_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_df_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
    CONSTRAINT fk_df_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),

    INDEX idx_df_team_id (team_id),
    INDEX idx_df_status (status),
    INDEX idx_df_severity (severity),
    INDEX idx_df_assignee (assignee_id),
    INDEX idx_df_related (related_ref_type, related_ref_id),
    INDEX idx_df_deadline (deadline),
    INDEX idx_df_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 9. 배포 (Deployments)
-- =====================================================
CREATE TABLE deployments (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    deploy_no         VARCHAR(20) NOT NULL UNIQUE, -- DP-001
    title             VARCHAR(100) NOT NULL,
    overview          VARCHAR(500),
    rollback_plan     VARCHAR(500),
    version           VARCHAR(20) NOT NULL,
    type              ENUM('정기배포', '긴급패치', '핫픽스', '롤백', '기타') NOT NULL DEFAULT '정기배포',
    environment       ENUM('개발', '스테이징', '운영') NOT NULL,
    status            ENUM('대기', '진행중', '완료', '실패', '롤백') NOT NULL DEFAULT '대기',

    team_id           BIGINT NOT NULL,
    manager_id        BIGINT,

    scheduled_at      DATE NOT NULL,
    started_at        DATETIME,
    completed_at      DATETIME,
    failed_at         DATETIME,
    rolled_back_at    DATETIME,
    status_note       VARCHAR(500),
    deployed_at       DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_dp_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_dp_manager FOREIGN KEY (manager_id) REFERENCES users(id),

    INDEX idx_dp_team_id (team_id),
    INDEX idx_dp_manager_id (manager_id),
    INDEX idx_dp_environment (environment),
    INDEX idx_dp_status (status),
    INDEX idx_dp_scheduled_at (scheduled_at),
    INDEX idx_dp_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE deployment_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    deployment_id     BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id            BIGINT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dpr_deployment FOREIGN KEY (deployment_id) REFERENCES deployments(id),

    UNIQUE KEY uq_dpr_ref (deployment_id, ref_type, ref_id),
    INDEX idx_dpr_deployment (deployment_id),
    INDEX idx_dpr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE deployment_steps (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    deployment_id     BIGINT NOT NULL,
    step_order        INT NOT NULL,
    content           VARCHAR(500) NOT NULL,
    is_done           TINYINT(1) NOT NULL DEFAULT 0,
    completed_at      DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_dps_deployment FOREIGN KEY (deployment_id) REFERENCES deployments(id),

    UNIQUE KEY uq_dps_order (deployment_id, step_order),
    INDEX idx_dps_deployment (deployment_id),
    INDEX idx_dps_is_done (is_done)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 10. 댓글 (Comments)
-- =====================================================
CREATE TABLE comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type    ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'PROJECT_IDEA', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id      BIGINT NOT NULL,
    content     TEXT NOT NULL,
    author_id   BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_comment_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 11. 첨부파일 (Attachments)
-- =====================================================
CREATE TABLE attachments (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    ref_type      ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'PROJECT_IDEA', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id        BIGINT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_path   VARCHAR(500) NOT NULL,
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    uploaded_by   BIGINT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attach_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_attach_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 12. 처리 이력 (Activity Logs)
-- =====================================================
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

-- =====================================================
-- 13. 알림 (Notifications)
-- =====================================================
CREATE TABLE notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    type        ENUM('상태변경', '담당자배정', '마감임박', '결함등록', '댓글등록', '배포완료', '배포실패', '팀초대', '아이디어채택', '액션아이템배정', '멘션') NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    ref_type    VARCHAR(50),
    ref_id      BIGINT,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    slack_sent  TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_notif_user_read (user_id, is_read)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 14. 회의록 (Meeting Notes)
-- =====================================================
CREATE TABLE meeting_notes (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    note_no         VARCHAR(20) NOT NULL UNIQUE, -- MN-001
    team_id         BIGINT NOT NULL,
    title           VARCHAR(100) NOT NULL,
    meeting_date    DATE NOT NULL,
    location        VARCHAR(200),
    facilitator_id  BIGINT NOT NULL,
    agenda          JSON NOT NULL,
    content         LONGTEXT NOT NULL,
    decisions       JSON NOT NULL,
    created_by      BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_mn_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_mn_facilitator FOREIGN KEY (facilitator_id) REFERENCES users(id),
    CONSTRAINT fk_mn_created_by FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_mn_team_id (team_id),
    INDEX idx_mn_meeting_date (meeting_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE meeting_note_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    meeting_note_id   BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id            BIGINT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mnr_meeting FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id),

    UNIQUE KEY uq_mnr_ref (meeting_note_id, ref_type, ref_id),
    INDEX idx_mnr_meeting (meeting_note_id),
    INDEX idx_mnr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 15. 회의 참석자 (Meeting Attendees)
-- =====================================================
CREATE TABLE meeting_attendees (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    meeting_note_id BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    attended        TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_ma_meeting FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id),
    CONSTRAINT fk_ma_user FOREIGN KEY (user_id) REFERENCES users(id),

    UNIQUE KEY uq_meeting_user (meeting_note_id, user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 16. 회의 액션 아이템 (Meeting Action Items)
-- =====================================================
CREATE TABLE meeting_action_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    meeting_note_id   BIGINT NOT NULL,
    content           VARCHAR(500) NOT NULL,
    assignee_id       BIGINT NOT NULL,
    due_date          DATE NOT NULL,
    status            ENUM('대기', '진행중', '완료') NOT NULL DEFAULT '대기',
    linked_ref_type   ENUM('WORK_REQUEST', 'TECH_TASK'),
    linked_ref_id     BIGINT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_mai_meeting FOREIGN KEY (meeting_note_id) REFERENCES meeting_notes(id),
    CONSTRAINT fk_mai_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),

    INDEX idx_mai_meeting_id (meeting_note_id),
    INDEX idx_mai_assignee (assignee_id),
    INDEX idx_mai_due_date (due_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 17. 프로젝트 아이디어 (Project Ideas)
-- =====================================================
CREATE TABLE project_ideas (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    idea_no           VARCHAR(20) NOT NULL UNIQUE, -- ID-001
    team_id           BIGINT NOT NULL,
    title             VARCHAR(100) NOT NULL,
    content           TEXT NOT NULL,
    benefits          JSON,
    category          ENUM('UX/UI', '기능', '인프라', '프로세스', '기타') NOT NULL DEFAULT '기타',
    status            ENUM('제안됨', '검토중', '채택', '보류', '기각') NOT NULL DEFAULT '제안됨',
    status_note       VARCHAR(500),
    proposed_by       BIGINT NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pi_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_pi_proposed_by FOREIGN KEY (proposed_by) REFERENCES users(id),

    INDEX idx_pi_team_id (team_id),
    INDEX idx_pi_category (category),
    INDEX idx_pi_status (status),
    INDEX idx_pi_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE project_idea_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_idea_id   BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'KNOWLEDGE_BASE') NOT NULL,
    ref_id            BIGINT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pir_idea FOREIGN KEY (project_idea_id) REFERENCES project_ideas(id),

    UNIQUE KEY uq_pir_ref (project_idea_id, ref_type, ref_id),
    INDEX idx_pir_idea (project_idea_id),
    INDEX idx_pir_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 18. 아이디어 투표 (Idea Votes)
-- =====================================================
CREATE TABLE idea_votes (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    idea_id     BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vote_idea FOREIGN KEY (idea_id) REFERENCES project_ideas(id),
    CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES users(id),

    UNIQUE KEY uq_idea_user_vote (idea_id, user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 19. 공유 리소스 (Shared Resources)
-- =====================================================
CREATE TABLE shared_resources (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id     BIGINT NOT NULL,
    title       VARCHAR(100) NOT NULL,
    url         VARCHAR(1000) NOT NULL,
    description VARCHAR(300) NOT NULL,
    category    ENUM('Figma', 'Notion', 'GitHub', 'Confluence', '문서', '기타') NOT NULL DEFAULT '기타',
    registered_by BIGINT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sr_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_sr_registered_by FOREIGN KEY (registered_by) REFERENCES users(id),

    INDEX idx_sr_team_id (team_id),
    INDEX idx_sr_category (category),
    INDEX idx_sr_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 20. 지식 베이스 문서 (Knowledge Base)
-- MongoDB를 쓰지 않는 경우를 위한 최소 스키마
-- =====================================================
CREATE TABLE knowledge_base_articles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_no  VARCHAR(20) NOT NULL UNIQUE, -- KB-001
    team_id     BIGINT NOT NULL,
    title       VARCHAR(100) NOT NULL,
    category    ENUM('개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타') NOT NULL DEFAULT '기타',
    tags        JSON,
    summary     VARCHAR(300) NOT NULL,
    content     LONGTEXT NOT NULL,
    author_id   BIGINT NOT NULL,
    view_count  INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_kb_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_kb_author FOREIGN KEY (author_id) REFERENCES users(id),

    INDEX idx_kb_team_id (team_id),
    INDEX idx_kb_category (category),
    INDEX idx_kb_author_id (author_id),
    INDEX idx_kb_created_at (created_at),
    INDEX idx_kb_updated_at (updated_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE knowledge_base_related_refs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id        BIGINT NOT NULL,
    ref_type          ENUM('WORK_REQUEST', 'TECH_TASK', 'TEST_SCENARIO', 'DEFECT', 'DEPLOYMENT', 'MEETING_NOTE', 'PROJECT_IDEA') NOT NULL,
    ref_id            BIGINT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_kbr_article FOREIGN KEY (article_id) REFERENCES knowledge_base_articles(id),

    UNIQUE KEY uq_kbr_ref (article_id, ref_type, ref_id),
    INDEX idx_kbr_article (article_id),
    INDEX idx_kbr_ref (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 20-1. 워크플로우 UI 상태 (Flow UI States)
-- 사용자별(work_request_id + user_id) 노드 위치/로컬 연결선을 저장
-- =====================================================
CREATE TABLE flow_ui_states (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_request_id BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    team_id         BIGINT NOT NULL,
    state_json      JSON NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_fus_work_request FOREIGN KEY (work_request_id) REFERENCES work_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_fus_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fus_team FOREIGN KEY (team_id) REFERENCES teams(id),

    UNIQUE KEY uq_fus_work_request_user (work_request_id, user_id),
    INDEX idx_fus_team_id (team_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================
-- 21. 문서번호 채번 (Document Sequences)
-- 문서번호 형식: PREFIX-001 (예: WR-001)
-- =====================================================
CREATE TABLE document_sequences (
    prefix      VARCHAR(5) NOT NULL,
    last_seq    INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO document_sequences (prefix, last_seq) VALUES
    ('WR', 0),
    ('TK', 0),
    ('TS', 0),
    ('DF', 0),
    ('DP', 0),
    ('MN', 0),
    ('ID', 0),
    ('KB', 0);

SET FOREIGN_KEY_CHECKS = 1;
