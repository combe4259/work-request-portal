# Spring Boot 프로젝트 구조 및 패키지 설계

## 패키지 구조 방식: 도메인형 (Domain-based)

도메인이 10개 이상이고 각자 비즈니스 로직이 있어 계층형보다 응집도 높고 탐색이 쉬움.

---

## 전체 패키지 구조

```
com.company.portal
│
├── domain/                         # 비즈니스 도메인
│   ├── auth/                       # 인증/인가
│   │   ├── controller/
│   │   ├── service/
│   │   └── dto/
│   │
│   ├── user/                       # 사용자
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   └── dto/
│   │
│   ├── team/                       # 팀
│   │
│   ├── workRequest/                # 업무요청 (핵심)
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/             # JPA + QueryDSL
│   │   ├── entity/
│   │   ├── dto/
│   │   └── event/                  # 도메인 이벤트
│   │       └── WorkRequestStatusChangedEvent
│   │
│   ├── developmentPlan/            # 개발계획서
│   ├── testScenario/               # 테스트 시나리오
│   ├── defect/                     # 결함
│   ├── deployment/                 # 배포
│   ├── comment/                    # 댓글
│   ├── attachment/                 # 첨부파일
│   ├── notification/               # 알림 (MySQL)
│   ├── dashboard/                  # 대시보드
│   └── statistics/                 # 통계
│
├── infra/                          # 외부 시스템 연동
│   ├── redis/
│   │   ├── JwtBlacklistService
│   │   ├── SessionCacheService
│   │   ├── DashboardCacheService
│   │   └── DeadlineScheduleService
│   │
│   ├── mongodb/
│   │   ├── history/
│   │   │   ├── WorkRequestHistory      # @Document
│   │   │   └── WorkRequestHistoryRepository
│   │   └── slack/
│   │       ├── SlackNotificationLog    # @Document
│   │       └── SlackNotificationLogRepository
│   │
│   └── slack/
│       ├── SlackNotificationService    # Webhook 전송
│       └── SlackMessageFactory         # Block Kit 메시지 조립
│
└── global/                         # 공통
    ├── config/
    │   ├── SecurityConfig
    │   ├── RedisConfig
    │   ├── MongoConfig
    │   ├── QueryDslConfig
    │   └── WebConfig
    │
    ├── security/
    │   ├── JwtTokenProvider
    │   ├── JwtAuthenticationFilter
    │   └── CustomUserDetailsService
    │
    ├── exception/
    │   ├── GlobalExceptionHandler  # @RestControllerAdvice
    │   ├── BusinessException
    │   └── ErrorCode               # enum
    │
    ├── response/
    │   └── ApiResponse<T>          # 공통 응답 래퍼
    │
    ├── event/
    │   └── NotificationEventListener
    │
    └── util/
        └── DocumentNoGenerator     # WR-2026-0001 채번
```

---

## 핵심 설계 포인트

### 1. 도메인 이벤트로 알림 분리

```
WorkRequestService
    │ ApplicationEventPublisher.publishEvent(...)
    ▼
NotificationEventListener
    ├── MySQL notifications INSERT
    ├── Redis PUBLISH (실시간 Push)
    ├── MongoDB history INSERT
    └── Slack Webhook 전송
```

변경이 생겨도 WorkRequestService 코드는 수정 불필요.

### 2. QueryDSL 위치

```
workRequest/repository/
    ├── WorkRequestRepository        # JpaRepository (기본 CRUD)
    └── WorkRequestQueryRepository   # QueryDSL (복잡 쿼리)
```

### 3. DTO 분리 규칙

```
dto/
├── WorkRequestCreateRequest    # 생성 요청
├── WorkRequestUpdateRequest    # 수정 요청
├── WorkRequestListResponse     # 목록 응답 (경량)
└── WorkRequestDetailResponse   # 상세 응답 (연관 데이터 포함)
```

### 4. 공통 응답 형식

```json
// 성공
{ "success": true, "data": { ... }, "error": null }

// 실패
{ "success": false, "data": null, "error": { "code": "WR_NOT_FOUND", "message": "업무요청을 찾을 수 없습니다." } }
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Spring Boot 3.x |
| ORM | JPA + QueryDSL |
| 인증 | Spring Security + JWT |
| MySQL 드라이버 | MySQL Connector |
| Redis | Spring Data Redis |
| MongoDB | Spring Data MongoDB |
| Slack | Slack Incoming Webhook |
| 빌드 | Gradle |
