# Redis Key Design
> 세션/JWT, 실시간 알림 Pub/Sub, 스케줄링, 캐시

---

## 1. JWT 블랙리스트 (로그아웃 토큰 무효화)

```
Key    : jwt:blacklist:{jti}
Type   : STRING
Value  : "1"
TTL    : 토큰 만료시간과 동일 (ex. 3600s)
```

```
# 로그아웃 시 저장
SET jwt:blacklist:abc123xyz "1" EX 3600

# 요청마다 검증
EXISTS jwt:blacklist:abc123xyz   → 1이면 만료된 토큰
```

---

## 2. 사용자 세션 / 캐시

```
Key    : session:user:{userId}
Type   : HASH
TTL    : 1800s (30분, 활동 시 갱신)
```

```
HSET session:user:42
    name        "김개발"
    email       "dev@company.com"
    role        "DEVELOPER"
    teamId      "3"
    teamName    "플랫폼개발부"
```

> DB 조회 없이 JWT 검증 후 유저 정보 바로 사용 가능

---

## 3. 실시간 알림 Pub/Sub

```
Channel : notifications:{userId}
```

```
# Spring에서 이벤트 발생 시 Publish
PUBLISH notifications:42 '{"type":"STATUS_CHANGED","title":"WR-2026-0001 상태 변경","refId":1}'

# React WebSocket(STOMP) 또는 SSE로 구독 중인 클라이언트에 전달
```

**알림 흐름**
```
이벤트 발생 (상태변경 등)
    ├── MySQL notifications 테이블에 INSERT  (영구 저장, 벨 아이콘)
    ├── Redis PUBLISH → WebSocket으로 실시간 Push  (즉시 알림 팝업)
    └── Slack Webhook 전송 → MongoDB에 로그
```

---

## 4. 마감 임박 스케줄링 (Sorted Set)

```
Key    : deadlines:work_requests
Type   : ZSET
Score  : deadline UNIX timestamp
Member : workRequestId
```

```
# 업무요청 등록 / 마감일 변경 시
ZADD deadlines:work_requests 1740960000 "101"   # 2026-03-03 마감

# Spring Scheduler (매일 09:00)
# D-3, D-1 해당 요청 조회
ZRANGEBYSCORE deadlines:work_requests {now} {now + 3days}
```

> 매번 MySQL `WHERE deadline BETWEEN` 쿼리 치는 것보다 가볍고 정확

---

## 5. 대시보드 카운터 캐시

```
Key    : dashboard:stats:{userId}
Type   : HASH
TTL    : 300s (5분)
```

```
HSET dashboard:stats:42
    myTasks         "12"
    inProgress      "8"
    completedWeek   "5"
    unreadNotif     "3"

# 상태 변경 이벤트 발생 시 해당 키 삭제 (Cache Invalidation)
DEL dashboard:stats:42
```

---

## Key 네이밍 컨벤션

```
{도메인}:{엔티티}:{식별자}

jwt:blacklist:{jti}
session:user:{userId}
notifications:{userId}
deadlines:work_requests
dashboard:stats:{userId}
```
