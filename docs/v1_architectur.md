# Work Request Portal — AWS 프로덕션 아키텍처 v1

> 리전: ap-northeast-2 (서울)
> 스택: Spring Boot 3.3.5 / React 19 / MySQL 8.0 / WebSocket(STOMP) / Slack 통합

---

## 1. 전체 아키텍처 다이어그램

```
[사용자 브라우저]
      │
      ▼
[Route 53]
  ├─ app.yourdomain.com ──▶ [CloudFront + WAF + ACM]
  │                                    │
  │                        ┌───────────┴──────────────┐
  │                        ▼                          ▼
  │                  [S3 Private]           [ALB (Public Subnet)]
  │                  React 빌드 결과물       /api/* /ws/* /slack/*
  │                  (OAC 전용 접근)               │
  └─ (선택) api.yourdomain.com ────────────────────┘
                                              │
                         ┌────────────────────┤
                         │  sticky-session    │  (duration cookie 1h)
                         ▼                    ▼
                  [ECS Fargate A]      [ECS Fargate B]
                  Spring Boot API      Spring Boot API
                  + /ws STOMP         + /ws STOMP
                  + /slack/interactions
                  (Private App Subnet — 2 AZ)
                         │                    │
          ┌──────────────┼────────────────────┤──────────────┐
          ▼              ▼                    ▼              ▼
  [Amazon MQ         [RDS Proxy]      [ElastiCache     [Secrets Manager]
   RabbitMQ]              │            Redis]            (참조 전용)
   STOMP Broker           ▼            ・리프레시 토큰
   Relay               [RDS MySQL      ・Rate Limit
  (Private Data)        Multi-AZ]      ・향후 캐시
                       (Private Data Subnet)

[공통 사이드카 / 지원 서비스]
  ECR          ──▶ ECS 이미지 pull (VPC Endpoint 경유)
  CloudWatch   ──▶ ECS 로그/메트릭 수집 (awslogs driver)
  SSM Session  ──▶ ECS Task Exec / RDS 접근 (Bastion 대체)
  GitHub Actions ▶ ECR push → ECS rolling deploy

[Slack 연동]
  ECS Fargate  ──▶ Slack API (chat.postMessage) — NAT Gateway 경유
  Slack Workspace ▶ POST /slack/interactions → ALB → ECS
```

---

## 2. drawio 초안 대비 변경/보완 사항

| 항목 | 초안 | 최종 결정 | 근거 |
|------|------|-----------|------|
| WebSocket 브로커 | Amazon MQ RabbitMQ | **유지** | Spring `enableStompBrokerRelay()`는 STOMP over TCP 브로커 필수. Redis는 직접 STOMP relay 불가 |
| Slack 통합 | 포함 | **유지** | `SlackNotificationService` + `SlackInteractionController` 실제 구현됨 |
| Bastion Host | 없음 | **SSM Session Manager 추가** | Private Subnet 내 RDS/ECS 접근, EC2 없이 가능 |
| VPC Endpoints | 없음 | **추가** (ecr.api, ecr.dkr, s3, secretsmanager, logs) | NAT Gateway 데이터 비용 월 $10~30 절감 |
| Auto Scaling | 없음 | **ECS Application Auto Scaling 추가** | 운영 부담 제거 |
| ALB sticky session | 없음 | **추가** | WebSocket 다중 태스크 환경에서 클라이언트 연결 유지 필수 |
| ElastiCache Redis | 점선(optional) | **필수** | 리프레시 토큰 TTL 관리, 향후 캐시/rate limit |

---

## 3. 서비스별 설계 상세

### 3-1. 프론트엔드: CloudFront + S3

```
CloudFront 설정:
  - Origin: S3 버킷 (OAC로만 접근, 퍼블릭 접근 완전 차단)
  - Cache Behavior:
      /index.html          → Cache-Control: no-cache (SPA 진입점)
      /assets/*            → Cache-Control: max-age=31536000 (해시 파일명)
  - Custom Error Response: 403/404 → /index.html, 200 (React Router 지원)
  - Price Class: 100 (북미+유럽+한국 포함)
  - WAF: AWS Managed Rules — AWSManagedRulesCommonRuleSet (무료 tier 내)
  - ACM 인증서: us-east-1 리전에서 발급 (CloudFront 요구사항)
```

### 3-2. 백엔드: ECS Fargate

```yaml
# Task Definition 핵심
cpu: 512        # 0.5 vCPU
memory: 1024    # 1 GB

# 환경변수 — 모두 Secrets Manager 참조, 하드코딩 금지
secrets:
  - name: DB_URL
    valueFrom: arn:aws:secretsmanager:...:prod/db/url
  - name: DB_PASSWORD
    valueFrom: arn:aws:secretsmanager:...:prod/db/password
  - name: JWT_SECRET
    valueFrom: arn:aws:secretsmanager:...:prod/jwt/secret
  - name: SLACK_BOT_TOKEN
    valueFrom: arn:aws:secretsmanager:...:prod/slack/bot-token
  - name: SLACK_SIGNING_SECRET
    valueFrom: arn:aws:secretsmanager:...:prod/slack/signing-secret
  - name: REDIS_HOST
    valueFrom: arn:aws:secretsmanager:...:prod/redis/host

# 헬스체크
healthCheck:
  command: ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
  interval: 30
  timeout: 5
  retries: 3
  startPeriod: 60   # Spring Boot 기동 시간 고려

# 로그
logConfiguration:
  logDriver: awslogs
  options:
    awslogs-group: /ecs/prod/backend
    awslogs-region: ap-northeast-2
    awslogs-stream-prefix: ecs
```

**ECS Auto Scaling**
```
정책: Target Tracking
메트릭: ALBRequestCountPerTarget
목표값: 800 req/target
min: 1  |  desired: 2  |  max: 6
스케일 인 쿨다운: 300s
스케일 아웃 쿨다운: 60s
```

**IAM Task Role 필수 권한**
```
secretsmanager:GetSecretValue
ecr:GetAuthorizationToken, ecr:BatchGetImage
logs:CreateLogStream, logs:PutLogEvents
ssmmessages:*   (SSM Session Manager용)
```

### 3-3. WebSocket (STOMP/SockJS)

**다중 ECS 태스크 문제**: 태스크 A에 연결된 클라이언트와 태스크 B에 연결된 클라이언트는 서로 메시지를 수신 불가.

**해결: Amazon MQ RabbitMQ + ALB sticky session 이중 대응**

```
1차 방어 — ALB duration-based sticky session (1시간 쿠키)
  → 같은 사용자는 같은 태스크에 고정 연결
  → 태스크 재배포 시 짧은 재연결만 발생

2차 방어 — Amazon MQ RabbitMQ STOMP Broker Relay
  → Spring enableStompBrokerRelay() 사용
  → 태스크 간 메시지 브로드캐스트 보장
  → 인스턴스 2개 이상 운영 시 필수
```

```yaml
# application-prod.yml
spring:
  rabbitmq:
    host: ${RABBITMQ_HOST}   # Amazon MQ broker endpoint
    port: 61613              # STOMP port
    username: ${RABBITMQ_USER}
    password: ${RABBITMQ_PASS}
    ssl:
      enabled: true

# WebSocketConfig.java
registry.enableStompBrokerRelay("/topic", "/queue")
    .setRelayHost(rabbitmqHost)
    .setRelayPort(61613)
    .setClientLogin(rabbitmqUser)
    .setClientPasscode(rabbitmqPass)
    .setSystemLogin(rabbitmqUser)
    .setSystemPasscode(rabbitmqPass);
```

> Amazon MQ for RabbitMQ: `mq.m5.large` Single → 약 $70~90/월
> 초기엔 `mq.t3.micro` Single (~$20/월) 로 시작 가능

### 3-4. Slack 통합

**현재 구현 현황**
- `SlackNotificationService`: `chat.postMessage` 발송 (담당자배정, 상태변경, 배포완료/실패 등)
- `SlackInteractionController`: `POST /slack/interactions` 수신 → "처리 시작" 버튼 클릭 시 상태 자동 변경

**⚠️ 보안 취약점 — 배포 전 필수 수정**

현재 `SlackInteractionController`에 **X-Slack-Signature 검증이 없음**.
외부에서 `/slack/interactions`로 임의 POST 요청을 보내면 도메인 상태가 무단 변경됨.

```java
// 추가 필요: SlackSignatureVerifier.java
// 검증 로직:
// 1. X-Slack-Request-Timestamp 헤더 확인 (5분 이상 경과 시 reject — replay attack 방어)
// 2. HMAC-SHA256( key=SLACK_SIGNING_SECRET, data="v0:{timestamp}:{raw_body}" )
// 3. "v0=" + hex(hmac) == X-Slack-Signature 헤더 비교
```

**ALB 보안 그룹**: `/slack/interactions`는 Slack IP 대역만 허용하는 것이 이상적이나,
Slack은 고정 IP를 보장하지 않으므로 서명 검증으로 대응.

**Secrets Manager 저장 항목**
```
prod/slack/bot-token        → xoxb-...
prod/slack/signing-secret   → 8f3a...
prod/slack/portal-url       → https://app.yourdomain.com
prod/slack/channel          → #work-requests
```

### 3-5. 데이터베이스

```
RDS MySQL 8.0
  인스턴스: db.t3.medium (prod) / db.t3.micro (dev)
  Multi-AZ: true (prod) — 자동 페일오버 60초 이내
  스토리지: gp3 100GB, 자동 확장 활성화
  백업: 자동 7일 보존 + 삭제 전 최종 스냅샷
  파라미터: character_set_server=utf8mb4, time_zone=Asia/Seoul

RDS Proxy
  역할: ECS Fargate task 재시작 시 커넥션 풀 재사용 (cold start 방어)
  Secrets Manager와 직접 연동 (자격증명 자동 로테이션 지원)
  HikariCP max-pool-size: 5 이하로 설정 (Proxy가 연결 관리)
```

**Flyway 마이그레이션**: 앱 기동 시 V1~V9 자동 적용, 신규 스키마는 V10__ 파일 추가.

### 3-6. ElastiCache Redis

```
클러스터: cache.t4g.micro (prod 초기) → cache.r7g.large (스케일 시)
Multi-AZ: ReplicaCount 1
TLS in-transit: 활성화
인증: AUTH token (Secrets Manager 저장)

용도:
  1. 리프레시 토큰 저장 (TTL = 7일, 자동 만료)
     현재 MySQL AuthRefreshToken 테이블 → Redis 이전 권장
  2. 향후: API rate limiting (Spring에서 Redis 기반 버킷 토큰)
  3. 향후: 자주 조회되는 목록 캐시 (팀 설정, 사용자 프로필)
```

### 3-7. 네트워킹

```
VPC CIDR: 10.0.0.0/16

Public Subnets (ALB, NAT Gateway):
  10.0.1.0/24  ap-northeast-2a
  10.0.2.0/24  ap-northeast-2c

Private App Subnets (ECS Fargate):
  10.0.11.0/24  ap-northeast-2a
  10.0.12.0/24  ap-northeast-2c

Private Data Subnets (RDS, Redis, Amazon MQ):
  10.0.21.0/24  ap-northeast-2a
  10.0.22.0/24  ap-northeast-2c
```

**Security Group 설계 (최소 권한)**

| SG | Inbound | From |
|----|---------|------|
| sg-alb | 443, 80 | 0.0.0.0/0 |
| sg-ecs | 8080 | sg-alb only |
| sg-rds | 3306 | sg-ecs only |
| sg-redis | 6379 | sg-ecs only |
| sg-mq | 61613 (STOMP) | sg-ecs only |

**VPC Endpoints (NAT 비용 절감)**
```
Interface Endpoints (sg-ecs에서만 접근):
  com.amazonaws.ap-northeast-2.ecr.api
  com.amazonaws.ap-northeast-2.ecr.dkr
  com.amazonaws.ap-northeast-2.secretsmanager
  com.amazonaws.ap-northeast-2.logs
  com.amazonaws.ap-northeast-2.ssmmessages   (SSM Session Manager)

Gateway Endpoint (무료):
  com.amazonaws.ap-northeast-2.s3
```
→ ECR 이미지 pull 트래픽이 NAT를 거치지 않으므로 월 $10~30 절감

### 3-8. CI/CD

```
GitHub Actions Workflow

[PR 오픈]
  → ./gradlew test                      # 백엔드 유닛 테스트 (242개)
  → pnpm build                          # 프론트엔드 타입체크 + 빌드

[main 브랜치 push]
  1. ./gradlew build -x test            # JAR 빌드
  2. docker build & push → ECR         # 이미지 태그: {git-sha}
  3. pnpm build → s3 sync --delete     # 프론트 배포
     → CloudFront invalidation /index.html
  4. aws ecs update-service \
       --force-new-deployment \
       --deployment-configuration \
         minimumHealthyPercent=100,maximumPercent=200
  5. aws ecs wait services-stable       # 롤아웃 완료 대기

[prod 배포]
  GitHub Environment: "production"
  Required reviewers: 1명 수동 승인 후 실행
```

**ECR 이미지 수명주기 정책**: 최신 10개만 유지, 이전 이미지 자동 삭제.

---

## 4. 배포 실행 순서 (Phase)

```
Phase 1 — 인프라 기반 (Terraform IaC)
  □ VPC, Subnets, IGW, NAT Gateway (1개), Route Tables
  □ Security Groups (sg-alb, sg-ecs, sg-rds, sg-redis, sg-mq)
  □ VPC Endpoints (ecr.api, ecr.dkr, s3, secretsmanager, logs, ssmmessages)
  □ ACM 인증서 발급 (us-east-1: CloudFront용, ap-northeast-2: ALB용)
  □ ECR Repository 생성 + lifecycle policy
  □ Secrets Manager 시크릿 초기 생성

Phase 2 — 데이터 레이어
  □ RDS MySQL 8.0 (Private Data Subnet, Multi-AZ)
  □ RDS Proxy 생성 + Secrets Manager 연결
  □ ElastiCache Redis (Private Data Subnet, ReplicaCount 1)
  □ Amazon MQ RabbitMQ (Private Data Subnet, mq.t3.micro Single)
  □ DB 접속 확인: SSM Session Manager → ECS Exec 또는 임시 태스크

Phase 3 — 컴퓨트
  □ ECS Cluster 생성
  □ Task Definition 등록 (Secrets Manager 참조, awslogs, healthCheck)
  □ ECS Service 생성 (desiredCount=1, deployment rolling)
  □ ALB + Target Group (stickiness 활성화, duration=3600s)
  □ ALB HTTPS Listener (443, ACM 인증서) + HTTP→HTTPS redirect
  □ Auto Scaling 정책 연결

Phase 4 — 프론트엔드
  □ S3 버킷 생성 (Block Public Access ON)
  □ S3 Bucket Policy (OAC ARN만 허용)
  □ CloudFront Distribution (OAC, Custom Error 설정)
  □ WAF WebACL 연결 (AWSManagedRulesCommonRuleSet)
  □ Route 53 A Alias 레코드 (app.yourdomain.com → CloudFront)
  □ Route 53 A Alias 레코드 (api.yourdomain.com → ALB, 선택)

Phase 5 — 운영 설정
  □ CloudWatch Log Group (/ecs/prod/backend, retention=90일)
  □ CloudWatch Alarms:
      - ECS CPU Utilization > 80% → SNS → 이메일
      - ALB 5XX > 10 (1분) → SNS
      - RDS FreeStorageSpace < 10GB → SNS
      - RDS DatabaseConnections > 80 → SNS
  □ GitHub Actions Secrets 등록
      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (배포 전용 IAM)
      ECR_REGISTRY, ECS_CLUSTER, ECS_SERVICE, CONTAINER_NAME
      S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID
  □ Slack 앱 설정: Interactivity URL = https://app.yourdomain.com/slack/interactions
  □ WAF Rules 활성화 확인
  □ ECS desiredCount=2 로 상향 (정상 확인 후)
```

---

## 5. 비용 예상 (서울 리전, 월)

### 프로덕션 풀스택

| 서비스 | 사양 | 예상 비용 |
|--------|------|-----------|
| ECS Fargate | 2 tasks × 0.5vCPU/1GB | ~$35 |
| RDS MySQL | db.t3.medium Multi-AZ | ~$110 |
| RDS Proxy | | ~$18 |
| Amazon MQ RabbitMQ | mq.t3.micro Single | ~$20 |
| ElastiCache Redis | cache.t4g.micro | ~$15 |
| ALB | | ~$22 |
| NAT Gateway | 1개 + 데이터 전송 | ~$40 |
| CloudFront + WAF | 월 500GB 가정 | ~$12 |
| ECR | | ~$2 |
| Secrets Manager | ~10개 | ~$4 |
| VPC Endpoints | 6개 Interface | ~$22 |
| Route 53 | | ~$1 |
| CloudWatch | | ~$5 |
| **합계** | | **~$306/월** |

### 초기 절약 구성 (서비스 론칭 직후)

| 변경 항목 | 절감 |
|-----------|------|
| RDS: db.t3.micro, Multi-AZ 끄기 | -$85 |
| ECS: 1 task (scale-up만) | -$17 |
| Amazon MQ: 생략 (sticky session만) | -$20 |
| NAT: 1개 AZ만 (HA 포기) | -$5 |
| **절약 후 합계** | **~$179/월** |

---

## 6. 배포 전 코드 체크리스트

### application-prod.yml 추가/수정

```yaml
spring:
  datasource:
    url: ${DB_URL}
    hikari:
      maximum-pool-size: 5        # RDS Proxy 사용 시 낮게 유지
      connection-timeout: 3000
      idle-timeout: 300000
  rabbitmq:
    host: ${RABBITMQ_HOST}
    port: 61613
    username: ${RABBITMQ_USER}
    password: ${RABBITMQ_PASS}
    ssl.enabled: true
  data:
    redis:
      host: ${REDIS_HOST}
      port: 6379
      ssl.enabled: true

server:
  forward-headers-strategy: framework  # ALB X-Forwarded-* 처리 필수

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never               # 외부 노출 금지

app:
  slack:
    bot-token: ${SLACK_BOT_TOKEN}
    signing-secret: ${SLACK_SIGNING_SECRET}
    channel: ${SLACK_CHANNEL}
    portal-url: ${SLACK_PORTAL_URL}
```

### Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseContainerSupport", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]
```

### 필수 코드 수정 (배포 전)

| 항목 | 현황 | 필요 조치 |
|------|------|-----------|
| X-Slack-Signature 검증 | **미구현** | `SlackInteractionController`에 HMAC-SHA256 서명 검증 로직 추가 |
| WebSocketConfig STOMP Relay | 현재 Simple Broker | `enableStompBrokerRelay()` + Amazon MQ 연결 설정 |
| AuthRefreshToken 저장소 | MySQL 테이블 | Redis TTL 기반으로 이전 (선택, 권장) |
| Actuator health endpoint | 기본값 | prod 프로파일에서 `show-details: never` 확인 |
| CORS origin | 현재 설정 확인 | `app.yourdomain.com` 만 허용으로 고정 |
