# Spring Boot 프로젝트 구조 및 패키지 설계

## 기준
- 본 문서는 `docs/mysql-schema.sql`을 기준으로 작성한다.
- 기준 시점: 2026-02-23
- 현재 프로젝트 루트 패키지는 `org.example`를 사용한다. 이후 변경 시 루트 패키지명만 치환한다.

---

## 목표
- 도메인 단위로 코드를 분리해 기능 추가/수정 시 영향 범위를 최소화한다.
- 프론트(mock 제거)를 빠르게 진행하기 위해 API 계약과 DTO를 도메인별로 고정한다.
- 첫 구현은 `workRequest` 세로 슬라이스(목록/상세/등록)를 기준으로 한다.

---

## 프로젝트 구조

```text
org.example
├── domain/
│   ├── auth/
│   ├── user/
│   ├── team/
│   ├── workRequest/
│   ├── techTask/
│   ├── testScenario/
│   ├── defect/
│   ├── deployment/
│   ├── meetingNote/
│   ├── idea/
│   ├── knowledgeBase/
│   ├── resource/
│   ├── comment/
│   ├── attachment/
│   ├── notification/
│   ├── dashboard/
│   └── statistics/
├── infra/
│   ├── persistence/
│   │   ├── mysql/
│   │   ├── mongodb/
│   │   └── redis/
│   └── slack/
└── global/
    ├── config/
    ├── security/
    ├── exception/
    ├── response/
    ├── event/
    └── util/
```

---

## 도메인 템플릿

각 도메인은 아래 템플릿을 기본으로 갖는다.

```text
domain/{domainName}/
├── controller/
│   └── {Domain}Controller
├── service/
│   ├── {Domain}Service
│   └── {Domain}ServiceImpl
├── repository/
│   ├── {Domain}Repository
│   └── {Domain}QueryRepository   # QueryDSL 필요 시
├── entity/
│   └── {Domain}
├── dto/
│   ├── {Domain}CreateRequest
│   ├── {Domain}UpdateRequest
│   ├── {Domain}ListResponse
│   └── {Domain}DetailResponse
└── mapper/
    └── {Domain}Mapper            # 수동 매핑 or MapStruct
```

규칙:
- 컨트롤러는 DTO만 입출력, 엔티티 직접 노출 금지
- 서비스에서 트랜잭션 경계 관리
- 리포지토리에는 비즈니스 로직 금지
- QueryDSL 쿼리는 `*QueryRepository`로 분리

---

## 글로벌 패키지 고정 클래스

```text
global/config/
  SecurityConfig
  JpaConfig
  QueryDslConfig
  RedisConfig
  MongoConfig

global/exception/
  GlobalExceptionHandler
  BusinessException
  ErrorCode

global/response/
  ApiResponse<T>

global/util/
  DocumentNoGenerator      # WR-001, TK-001 ...
```

---

## 도메인-테이블 매핑

- `team`: `teams`, `user_teams`, `team_invitations`
- `workRequest`: `work_requests`
- `techTask`: `tech_tasks`, `tech_task_related_refs`, `tech_task_pr_links`
- `testScenario`: `test_scenarios`, `test_scenario_related_refs`
- `defect`: `defects`
- `deployment`: `deployments`, `deployment_related_refs`, `deployment_steps`
- `meetingNote`: `meeting_notes`, `meeting_attendees`, `meeting_action_items`, `meeting_note_related_refs`
- `idea`: `project_ideas`, `idea_votes`, `project_idea_related_refs`
- `knowledgeBase`: `knowledge_base_articles`, `knowledge_base_related_refs`
- `resource`: `shared_resources`
- 공통: `comments`, `attachments`, `notifications`

---

## API 작성 우선순위

### 1단계 (프론트 연동 우선)
- `workRequest`: `GET /work-requests`, `GET /work-requests/{id}`, `POST /work-requests`
- `techTask`: 목록/상세/등록
- `defect`: 목록/상세/등록

### 2단계
- `deployment`, `meetingNote`, `idea`

### 3단계
- `knowledgeBase`, `resource`, `statistics`, `dashboard`

---

## WorkRequest 최초 클래스 목록

```text
domain/workRequest/controller/WorkRequestController
domain/workRequest/service/WorkRequestService
domain/workRequest/service/WorkRequestServiceImpl
domain/workRequest/repository/WorkRequestRepository
domain/workRequest/repository/WorkRequestQueryRepository
domain/workRequest/entity/WorkRequest
domain/workRequest/dto/WorkRequestCreateRequest
domain/workRequest/dto/WorkRequestUpdateRequest
domain/workRequest/dto/WorkRequestListResponse
domain/workRequest/dto/WorkRequestDetailResponse
domain/workRequest/mapper/WorkRequestMapper
```

---

## 이벤트/알림 처리

```text
Domain Service (상태 변경/배정/댓글)
  -> ApplicationEventPublisher
    -> NotificationEventListener
      -> MySQL notifications INSERT
      -> Redis publish (notifications:user:{userId})
      -> MongoDB work_item_histories INSERT
      -> Slack Webhook + slack_notification_logs
```

---

## 구현 체크리스트

1. `backend/src/main/resources/db/migration/V1__baseline.sql` 기준으로 엔티티 작성
2. 엔티티-DTO 매핑 작성 (엔티티 직접 반환 금지)
3. API별 요청 검증(`jakarta.validation`) 적용
4. 서비스 단에서 권한/팀 스코프 검증
5. QueryDSL 목록 검색/정렬 구현
6. Controller 테스트 or Service 테스트 최소 1개 이상 작성

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
