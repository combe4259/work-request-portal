# Spring Boot 프로젝트 구조 및 패키지 설계

## 기준
- 본 문서는 `docs/mysql-schema.sql`을 기준으로 동기화된 백엔드 구조 제안이다.
- 기준 시점: 2026-02-23

---

## 패키지 구조 방식: 도메인형 (Domain-based)
도메인별 응집도를 높이고, 기능 추가 시 영향 범위를 좁히기 위해 도메인형 패키지를 사용한다.

## 전체 패키지 구조

```text
com.company.portal
│
├── domain/
│   ├── auth/                   # 인증/인가
│   ├── user/                   # users
│   ├── team/                   # teams, user_teams, team_invitations
│   ├── workRequest/            # work_requests
│   ├── techTask/               # tech_tasks, tech_task_related_refs, tech_task_pr_links
│   ├── testScenario/           # test_scenarios, test_scenario_related_refs
│   ├── defect/                 # defects
│   ├── deployment/             # deployments, deployment_related_refs, deployment_steps
│   ├── meetingNote/            # meeting_notes, meeting_attendees, meeting_action_items, meeting_note_related_refs
│   ├── idea/                   # project_ideas, idea_votes, project_idea_related_refs
│   ├── knowledgeBase/          # knowledge_base_articles, knowledge_base_related_refs
│   ├── resource/               # shared_resources
│   ├── comment/                # comments
│   ├── attachment/             # attachments
│   ├── notification/           # notifications
│   ├── dashboard/              # 대시보드 집계
│   └── statistics/             # 통계/리포트
│
├── infra/
│   ├── persistence/
│   │   ├── mysql/
│   │   ├── mongodb/
│   │   └── redis/
│   └── slack/
│       ├── SlackNotificationService
│       └── SlackMessageFactory
│
└── global/
    ├── config/
    ├── security/
    ├── exception/
    ├── response/
    ├── event/
    └── util/
        └── DocumentNoGenerator  # WR-001, TK-001, TS-001 ...
```

---

## 핵심 설계 포인트

### 1. `developmentPlan` 도메인은 제거하고 `techTask`로 통합
- 기존 개발계획서 역할은 `tech_tasks` + `tech_task_related_refs` + `tech_task_pr_links`로 흡수한다.
- 프론트의 기술과제 화면(`TK-*`)을 기준으로 API를 설계한다.

### 2. 연관 문서는 다형 관계 테이블로 분리
- `*_related_refs` 테이블을 공통 패턴으로 유지한다.
- 서비스 계층에서 `ref_type/ref_id` 유효성 검증을 담당한다.

### 3. 이벤트 기반 알림/이력 처리

```text
Domain Service (상태 변경/배정/댓글)
    -> ApplicationEventPublisher
        -> NotificationEventListener
            -> MySQL notifications INSERT
            -> Redis publish (실시간)
            -> MongoDB history INSERT
            -> Slack Webhook 전송
```

### 4. 조회 성능 전략
- 목록/대시보드: QueryDSL + 인덱스 우선 설계
- 상세: 도메인별 aggregate 조회 DTO 분리
- 공통 응답: `ApiResponse<T>`

---

## 도메인별 기본 DTO 규칙

```text
dto/
├── *CreateRequest
├── *UpdateRequest
├── *ListResponse
└── *DetailResponse
```

- 목록 응답은 카드/테이블 렌더링 필드만 포함
- 상세 응답은 연관 문서, 첨부파일, 댓글, 이력 포함

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Spring Boot 3.x |
| ORM | JPA + QueryDSL |
| 인증 | Spring Security + JWT |
| DB | MySQL 8.x |
| Cache/Realtime | Redis |
| Log/History | MongoDB |
| 외부 연동 | Slack Incoming Webhook |
| 빌드 | Gradle |
