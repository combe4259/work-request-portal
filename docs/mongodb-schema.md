# MongoDB Collection Design
> 유연한 스키마가 필요한 로그성 데이터

---

## 1. work_request_histories

**왜 MongoDB인가**
- 액션 타입마다 메타데이터 구조가 다름
- RDB로 표현하면 `from_value`, `to_value` VARCHAR로 억지 설계됨
- append-only, 조인 없이 단독 조회
- 타임라인 UI에 그대로 내려주면 됨

**Collection**: `work_request_histories`

```js
// STATUS_CHANGED
{
  _id: ObjectId,
  workRequestId: 101,           // MySQL work_requests.id (참조용)
  requestNo: "WR-2026-0001",
  action: "STATUS_CHANGED",
  metadata: {
    from: "REVIEWING",
    to:   "PLANNING"
  },
  actor: {
    id:   42,
    name: "김PM"
  },
  createdAt: ISODate("2026-02-21T10:00:00Z")
}

// ASSIGNED
{
  workRequestId: 101,
  requestNo: "WR-2026-0001",
  action: "ASSIGNED",
  metadata: {
    assignee: { id: 7, name: "이개발" },
    team:     { id: 3, name: "플랫폼개발부" }
  },
  actor: {
    id:   42,
    name: "김PM"
  },
  createdAt: ISODate("2026-02-21T10:05:00Z")
}

// DEFECT_REGISTERED
{
  workRequestId: 101,
  requestNo: "WR-2026-0001",
  action: "DEFECT_REGISTERED",
  metadata: {
    defectNo:  "DF-2026-0003",
    severity:  "HIGH",
    title:     "로그인 후 메인화면 렌더링 오류"
  },
  actor: {
    id:   15,
    name: "박QA"
  },
  createdAt: ISODate("2026-02-22T14:30:00Z")
}

// COMMENT_ADDED
{
  workRequestId: 101,
  requestNo: "WR-2026-0001",
  action: "COMMENT_ADDED",
  metadata: {
    commentId: 88,
    preview:   "API 연동 방식 확인 필요합니다..."   // 앞 50자
  },
  actor: {
    id:   7,
    name: "이개발"
  },
  createdAt: ISODate("2026-02-22T16:00:00Z")
}

// DEPLOYED
{
  workRequestId: 101,
  requestNo: "WR-2026-0001",
  action: "DEPLOYED",
  metadata: {
    deployNo:    "DP-2026-0002",
    environment: "PROD",
    deployedAt:  ISODate("2026-02-23T22:00:00Z")
  },
  actor: {
    id:   42,
    name: "김PM"
  },
  createdAt: ISODate("2026-02-23T22:01:00Z")
}
```

**Index**
```js
db.work_request_histories.createIndex({ workRequestId: 1, createdAt: -1 })
db.work_request_histories.createIndex({ requestNo: 1 })
```

---

## 2. slack_notification_logs

**왜 MongoDB인가**
- 조인 필요 없음
- Slack payload 구조가 메시지 타입마다 다름 (Block Kit)
- 재전송, 디버깅용 로그 → 유연한 문서 저장이 적합

**Collection**: `slack_notification_logs`

```js
// 성공
{
  _id: ObjectId,
  notificationId: 501,          // MySQL notifications.id (참조용)
  channel: "#dev-team",
  slackMessageTs: "1740960000.123456",   // 수정/삭제 시 사용
  targetUser: {
    id:          42,
    slackUserId: "U0123ABC",
    name:        "김개발"
  },
  payload: {
    // 실제 전송한 Slack Block Kit payload
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*[WR-2026-0001]* 상태가 변경되었습니다.\n`검토중` → `개발계획서 작성`"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "상세 보기" },
            url:  "https://portal.company.com/wr/101"
          }
        ]
      }
    ]
  },
  status:    "SENT",
  sentAt:    ISODate("2026-02-21T10:00:01Z")
}

// 실패
{
  _id: ObjectId,
  notificationId: 502,
  channel: "#dev-team",
  targetUser: {
    id:   7,
    name: "이개발"
  },
  payload: { ... },
  status:       "FAILED",
  errorMessage: "channel_not_found",
  retryCount:   2,
  sentAt:       ISODate("2026-02-21T11:00:00Z")
}
```

**Index**
```js
db.slack_notification_logs.createIndex({ notificationId: 1 })
db.slack_notification_logs.createIndex({ status: 1, sentAt: -1 })  // 실패 재전송 조회용
db.slack_notification_logs.createIndex({ sentAt: 1 }, { expireAfterSeconds: 7776000 })  // 90일 TTL 자동 삭제
```

---

## 3. knowledge_base_docs

**왜 MongoDB인가**
- 리치 에디터 콘텐츠 (TipTap/Quill) → 블록 구조가 유연한 JSON
- 문서마다 섹션 구성이 달라 고정 스키마 부적합
- 버전 이력 관리 필요 (이전 내용 보존)
- 팀별 스코핑, 조인 없이 단독 조회

**Collection**: `knowledge_base_docs`

```js
// 지식 베이스 문서
{
  _id: ObjectId,
  teamId: 3,                        // MySQL teams.id (팀 스코핑)
  title: "Spring Security JWT 인증 설정 가이드",
  category: "개발",                  // 카테고리 (자유 입력)
  tags: ["spring", "jwt", "security"],
  content: {
    // TipTap/ProseMirror JSON 포맷
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "개요" }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "JWT 토큰 기반 인증 구현 방법을 정리합니다." }]
      },
      {
        type: "codeBlock",
        attrs: { language: "java" },
        content: [{ type: "text", text: "@Bean\npublic SecurityFilterChain ..." }]
      }
    ]
  },
  author: {
    id:   42,
    name: "김개발"
  },
  lastEditedBy: {
    id:   7,
    name: "이개발"
  },
  viewCount:  24,
  version:    3,                    // 수정 횟수
  isPublic:   false,                // 팀 내부 공개 여부
  createdAt:  ISODate("2026-02-10T09:00:00Z"),
  updatedAt:  ISODate("2026-02-21T14:30:00Z")
}
```

**Index**
```js
db.knowledge_base_docs.createIndex({ teamId: 1, updatedAt: -1 })
db.knowledge_base_docs.createIndex({ teamId: 1, category: 1 })
db.knowledge_base_docs.createIndex({ tags: 1 })
db.knowledge_base_docs.createIndex(
  { title: "text", "content.content.content.text": "text" },
  { name: "text_search" }           // 전문 검색
)
```

---

## 전체 데이터 흐름 요약

```
이벤트 발생 (상태변경, 배정, 댓글 등)
    │
    ├─► MySQL
    │     ├── work_requests 업데이트 (status, assignee 등)
    │     └── notifications INSERT (벨 아이콘, 읽음 처리용)
    │
    ├─► MongoDB
    │     └── work_request_histories INSERT (타임라인 기록)
    │
    ├─► Redis
    │     ├── PUBLISH notifications:{userId} (실시간 WebSocket Push)
    │     ├── DEL dashboard:stats:{userId} (캐시 무효화)
    │     └── ZADD deadlines:work_requests (마감일 변경 시)
    │
    └─► Slack Webhook
          └── MongoDB slack_notification_logs INSERT (발송 결과 로깅)
```
