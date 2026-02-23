# MongoDB Collection Design (Schema Synced)
> 기준: `docs/mysql-schema.sql` (2026-02-23)

MySQL이 업무 엔티티의 원본(source of truth)이다.
MongoDB는 구조가 자주 바뀌는 로그/이력/외부 연동 페이로드 저장 용도로 사용한다.

---

## 1. work_item_histories

### 목적
- 상세 화면의 처리 이력(타임라인)을 append-only로 저장
- 엔티티별 액션 메타 구조 차이를 유연하게 수용

### Collection
- `work_item_histories`

```js
// 공통 형태
{
  _id: ObjectId,
  refType: "WORK_REQUEST",   // WORK_REQUEST | TECH_TASK | TEST_SCENARIO | DEFECT | DEPLOYMENT | MEETING_NOTE | PROJECT_IDEA | KNOWLEDGE_BASE
  refId: 101,                  // MySQL PK
  docNo: "WR-001",
  action: "STATUS_CHANGED",
  metadata: {
    from: "접수대기",
    to: "검토중"
  },
  actor: {
    id: 42,
    name: "김PM"
  },
  createdAt: ISODate("2026-02-23T10:00:00Z")
}

// 배포 절차 체크 예시
{
  refType: "DEPLOYMENT",
  refId: 18,
  docNo: "DP-018",
  action: "STEP_DONE",
  metadata: {
    stepOrder: 3,
    content: "DB 마이그레이션 실행",
    completedAt: ISODate("2026-02-28T09:12:00Z")
  },
  actor: { id: 7, name: "최인프라" },
  createdAt: ISODate("2026-02-28T09:12:01Z")
}
```

### Index
```js
db.work_item_histories.createIndex({ refType: 1, refId: 1, createdAt: -1 })
db.work_item_histories.createIndex({ docNo: 1, createdAt: -1 })
db.work_item_histories.createIndex({ action: 1, createdAt: -1 })
```

---

## 2. slack_notification_logs

### 목적
- Slack 발송 성공/실패 추적
- 재시도, 장애 분석, 감사 로그 용도

### Collection
- `slack_notification_logs`

```js
// 성공
{
  _id: ObjectId,
  notificationId: 501,          // MySQL notifications.id
  channel: "#dev-team",
  targetUser: {
    id: 42,
    slackUserId: "U0123ABC",
    name: "김개발"
  },
  payload: { blocks: [/* Block Kit */] },
  status: "SENT",              // SENT | FAILED
  sentAt: ISODate("2026-02-23T10:00:01Z")
}

// 실패
{
  _id: ObjectId,
  notificationId: 502,
  channel: "#dev-team",
  targetUser: { id: 7, name: "이개발" },
  payload: { /* ... */ },
  status: "FAILED",
  errorMessage: "channel_not_found",
  retryCount: 2,
  sentAt: ISODate("2026-02-23T11:00:00Z")
}
```

### Index
```js
db.slack_notification_logs.createIndex({ notificationId: 1 })
db.slack_notification_logs.createIndex({ status: 1, sentAt: -1 })
db.slack_notification_logs.createIndex({ sentAt: 1 }, { expireAfterSeconds: 7776000 }) // 90일 TTL
```

---

## 3. knowledge_base_revisions (선택)

### 목적
- 지식 베이스 본문 버전 이력 저장
- MySQL `knowledge_base_articles`의 현재본과 분리하여 이전본 보관

### Collection
- `knowledge_base_revisions`

```js
{
  _id: ObjectId,
  articleId: 18,                // MySQL knowledge_base_articles.id
  articleNo: "KB-018",
  version: 4,
  title: "JWT 액세스/리프레시 토큰 설계 가이드",
  summary: "...",
  content: "... markdown or json ...",
  tags: ["JWT", "Security"],
  editedBy: {
    id: 42,
    name: "김개발"
  },
  createdAt: ISODate("2026-02-23T14:30:00Z")
}
```

### Index
```js
db.knowledge_base_revisions.createIndex({ articleId: 1, version: -1 }, { unique: true })
db.knowledge_base_revisions.createIndex({ articleNo: 1, createdAt: -1 })
```

---

## 데이터 경계 정리

```text
MySQL (원본 데이터)
- 업무 엔티티: WR/TK/TS/DF/DP/MN/ID/KB
- 댓글, 첨부파일, 알림, 팀/사용자

MongoDB (보조 데이터)
- 이력 타임라인 (work_item_histories)
- Slack 발송 로그 (slack_notification_logs)
- 선택적 KB 리비전 저장 (knowledge_base_revisions)
```
