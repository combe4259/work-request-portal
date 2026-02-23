# Redis Key Design (Schema Synced)
> 기준: `docs/mysql-schema.sql` (2026-02-23)

Redis는 인증 토큰 무효화, 실시간 알림 전달, 마감 스케줄 조회, 대시보드 캐시를 담당한다.
원본 데이터는 MySQL이며 Redis는 파생/임시 데이터를 저장한다.

---

## 1. JWT 블랙리스트

```text
Key   : jwt:blacklist:{jti}
Type  : STRING
Value : "1"
TTL   : 액세스 토큰 남은 만료 시간
```

```text
# 로그아웃
SET jwt:blacklist:abc123xyz "1" EX 3600

# 요청 검증
EXISTS jwt:blacklist:abc123xyz  -> 1이면 거부
```

---

## 2. 사용자 세션 캐시

```text
Key : session:user:{userId}
Type: HASH
TTL : 1800s (활동 시 갱신)
```

```text
HSET session:user:42 \
  name "김개발" \
  email "dev@company.com" \
  role "DEVELOPER" \
  teamId "3" \
  teamRole "MEMBER"
```

---

## 3. 실시간 알림 Pub/Sub

```text
Channel: notifications:user:{userId}
```

```text
PUBLISH notifications:user:42 '{
  "notificationId": 501,
  "type": "상태변경",
  "title": "WR-001 상태가 변경되었습니다",
  "refType": "WORK_REQUEST",
  "refId": 101,
  "createdAt": "2026-02-23T10:00:00Z"
}'
```

알림 저장 흐름
```text
도메인 이벤트 발생
  -> MySQL notifications INSERT (영구 저장)
  -> Redis publish (즉시 UI 반영)
  -> Slack Webhook + MongoDB slack_notification_logs
```

---

## 4. 마감 임박 스케줄링

기존 `work_requests` 전용 키 대신 팀 단위 통합 ZSET을 사용한다.

```text
Key    : deadlines:team:{teamId}
Type   : ZSET
Score  : 마감일 UTC timestamp (00:00 기준)
Member : {REF_TYPE}:{REF_ID}
```

`REF_TYPE` 예시
- `WORK_REQUEST`
- `TECH_TASK`
- `TEST_SCENARIO`
- `DEFECT`

```text
# 등록/수정
ZADD deadlines:team:3 1772496000 "WORK_REQUEST:101"
ZADD deadlines:team:3 1772582400 "TECH_TASK:21"
ZADD deadlines:team:3 1772668800 "TEST_SCENARIO:17"
ZADD deadlines:team:3 1772755200 "DEFECT:34"

# 일정 변경 시 갱신
ZREM deadlines:team:3 "WORK_REQUEST:101"
ZADD deadlines:team:3 1772841600 "WORK_REQUEST:101"

# 스케줄러 (매일 09:00) D-3 조회
ZRANGEBYSCORE deadlines:team:3 {now} {now_plus_3days}
```

---

## 5. 대시보드 요약 캐시

```text
Key : dashboard:summary:{userId}:{teamId}
Type: HASH
TTL : 300s
```

```text
HSET dashboard:summary:42:3 \
  myWorkRequests "12" \
  myTechTasks "8" \
  activeDefects "5" \
  upcomingDeployments "2" \
  unreadNotifications "3" \
  computedAt "2026-02-23T10:05:00Z"

# 상태/배정/알림 변경 시 무효화
DEL dashboard:summary:42:3
```

---

## 6. 키 네이밍 규칙

```text
{domain}:{entity}:{scope...}

jwt:blacklist:{jti}
session:user:{userId}
notifications:user:{userId}
deadlines:team:{teamId}
dashboard:summary:{userId}:{teamId}
```
