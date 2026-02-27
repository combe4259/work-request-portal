# API Specification & Delivery Checklist

## 1. 목적과 기준
이 문서는 현재 코드 기준 API 계약을 정리한 단일 기준 문서다.

기준 소스:
- 백엔드 컨트롤러: `backend/src/main/java/org/example/domain/*/controller/*.java`
- 백엔드 DTO/서비스: `backend/src/main/java/org/example/domain/**/dto`, `service`
- 프론트 라우팅/연동: `frontend/src/router/index.tsx`, `frontend/src/features/**/service.ts`
- DB 마이그레이션: `backend/src/main/resources/db/migration/*.sql`

기준일: **2026-02-26**

## 2. 공통 규약
- Base URL: `/api`
- 인증: `Authorization: Bearer <accessToken>` (`/auth/signup`, `/auth/login` 제외)
- 팀 스코프: 팀 데이터는 `teamId` 기준으로 검증/조회
- 페이징: `page`(0-base), `size`
- 목록 검색/정렬/필터: 일부 API는 백엔드 미구현이며 프론트에서 보정 중

실시간(회의록):
- WebSocket(SockJS) endpoint: `/ws`
- STOMP app prefix: `/app`
- topic prefix: `/topic`

## 3. 구현 상태 요약 (2026-02-25)
- 구현됨: `Auth`, `Team(핵심)`, `WorkRequest`, `Flow`, `TechTask`, `TestScenario`, `Defect`, `Deployment`, `MeetingNote`, `Idea`, `KnowledgeBase`, `Resource`, `Comment`, `Attachment`, `Notification`, `Dashboard`, `Statistics`, `DocumentIndex`, `ActivityLog`
- 부분 구현:
  - 일부 목록 API는 서버에서 `page/size` 중심으로 동작하며, 상세 검색/정렬/필터는 프론트 보정 포함

## 4. 도메인별 API 명세

### 4.1 Auth + Team (P0)
| Method | Path | Request | Response | 구현 |
|---|---|---|---|---|
| POST | `/auth/signup` | `SignupRequest` | `SignupResponse` | [x] |
| POST | `/auth/login` | `LoginRequest` | `LoginResponse` | [x] |
| GET | `/auth/me` | Header: Bearer | `LoginResponse` | [x] |
| POST | `/auth/logout` | - | `204` | [x] |
| GET | `/teams/mine` | Header: Bearer | `TeamResponse[]` | [x] |
| POST | `/teams` | Header: Bearer + `TeamCreateRequest` | `TeamResponse` | [x] |
| POST | `/teams/join` | Header: Bearer + `TeamJoinRequest` | `TeamResponse` | [x] |
| GET | `/teams/{teamId}/members` | Header: Bearer | `TeamMemberResponse[]` | [x] |
| PATCH | `/teams/{teamId}/members/{userId}/role` | Header: Bearer + `TeamMemberRoleUpdateRequest` | `204` | [x] |
| DELETE | `/teams/{teamId}/members/{userId}` | Header: Bearer | `204` | [x] |

Auth/Team 응답 필드:
- `LoginResponse.teams[*]`: `id`, `name`, `description`, `teamRole`, `inviteCode`
- `TeamResponse`: `id`, `name`, `description`, `teamRole`, `inviteCode`

### 4.2 Work Requests (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/work-requests` | `q,type,priority,status,assigneeId,deadlineFrom,deadlineTo,sortBy,sortDir,page,size` | `Page<WorkRequestListResponse>` | [x] |
| GET | `/work-requests/{id}` | - | `WorkRequestDetailResponse` | [x] |
| POST | `/work-requests` | `WorkRequestCreateRequest` | `{id}` | [x] |
| PUT | `/work-requests/{id}` | `WorkRequestUpdateRequest` | `204` | [x] |
| DELETE | `/work-requests/{id}` | - | `204` | [x] |
| GET | `/work-requests/{id}/related-refs` | - | `WorkRequestRelatedRefResponse[]` | [x] |
| PUT | `/work-requests/{id}/related-refs` | `WorkRequestRelatedRefsUpdateRequest` | `204` | [x] |
| PATCH | `/work-requests/{id}/status` | `{status,statusNote?}` | `204` | [x] |

### 4.2.1 Workflow (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/work-requests/{workRequestId}/flow-chain` | - | `FlowChainResponse` | [x] |
| POST | `/work-requests/{workRequestId}/flow-items` | `FlowItemCreateRequest` | `FlowItemCreateResponse` | [x] |
| GET | `/work-requests/{workRequestId}/flow-ui` | - | `FlowUiStateResponse(version 포함)` | [x] |
| PUT | `/work-requests/{workRequestId}/flow-ui` | `FlowUiStateRequest(expectedVersion 필수)` | `204` | [x] |

Workflow 실시간 동기화(STOMP):
- `SUBSCRIBE /topic/work-requests/{workRequestId}/flow-ui`
- `PUT /work-requests/{workRequestId}/flow-ui` 성공 시 변경 이벤트가 브로드캐스트된다.

Workflow 동시편집 규약(낙관적 락):
- 클라이언트는 `GET flow-ui` 응답의 `version`을 보관한다.
- 저장 시 `PUT flow-ui` 본문에 `expectedVersion`을 포함한다.
- 서버 현재 버전과 다르면 `409 Conflict`를 반환한다.

### 4.3 TechTask (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/tech-tasks` | `q,type,priority,status,assigneeId,deadlineFrom,deadlineTo,sortBy,sortDir,page,size` | `Page<TechTaskListResponse>` | [x] |
| GET | `/tech-tasks/{id}` | - | `TechTaskDetailResponse` | [x] |
| POST | `/tech-tasks` | `TechTaskCreateRequest` | `{id}` | [x] |
| PUT | `/tech-tasks/{id}` | `TechTaskUpdateRequest` | `204` | [x] |
| DELETE | `/tech-tasks/{id}` | - | `204` | [x] |
| PATCH | `/tech-tasks/{id}/status` | `TechTaskStatusUpdateRequest` | `204` | [x] |
| GET | `/tech-tasks/{id}/related-refs` | - | `TechTaskRelatedRefResponse[]` | [x] |
| PUT | `/tech-tasks/{id}/related-refs` | `TechTaskRelatedRefsUpdateRequest` | `204` | [x] |
| GET | `/tech-tasks/{id}/pr-links` | - | `TechTaskPrLinkResponse[]` | [x] |
| POST | `/tech-tasks/{id}/pr-links` | `TechTaskPrLinkCreateRequest` | `{id}` | [x] |
| DELETE | `/tech-tasks/{id}/pr-links/{linkId}` | - | `204` | [x] |

### 4.4 TestScenario (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/test-scenarios` | `q,type,priority,status,assigneeId,deadlineFrom,deadlineTo,sortBy,sortDir,page,size` | `Page<TestScenarioListResponse>` | [x] |
| GET | `/test-scenarios/{id}` | - | `TestScenarioDetailResponse` | [x] |
| POST | `/test-scenarios` | `TestScenarioCreateRequest` | `{id}` | [x] |
| PUT | `/test-scenarios/{id}` | `TestScenarioUpdateRequest` | `204` | [x] |
| DELETE | `/test-scenarios/{id}` | - | `204` | [x] |
| PATCH | `/test-scenarios/{id}/status` | `TestScenarioStatusUpdateRequest` | `204` | [x] |
| GET | `/test-scenarios/{id}/related-refs` | - | `TestScenarioRelatedRefResponse[]` | [x] |
| PUT | `/test-scenarios/{id}/related-refs` | `TestScenarioRelatedRefsUpdateRequest` | `204` | [x] |
| PATCH | `/test-scenarios/{id}/execution` | `{stepResults:[PASS/FAIL/SKIP],actualResult?,executedAt?}` | `204` | [x] |

### 4.5 Defect (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/defects` | `q,type,severity,status,assigneeId,deadlineFrom,deadlineTo,sortBy,sortDir,page,size` | `Page<DefectListResponse>` | [x] |
| GET | `/defects/{id}` | - | `DefectDetailResponse` | [x] |
| POST | `/defects` | `DefectCreateRequest` | `{id}` | [x] |
| PUT | `/defects/{id}` | `DefectUpdateRequest` | `204` | [x] |
| DELETE | `/defects/{id}` | - | `204` | [x] |
| PATCH | `/defects/{id}/status` | `DefectStatusUpdateRequest` | `204` | [x] |

### 4.6 Deployment (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/deployments` | `q,type,environment,status,managerId,scheduledFrom,scheduledTo,sortBy,sortDir,page,size` | `Page<DeploymentListResponse>` | [x] |
| GET | `/deployments/{id}` | - | `DeploymentDetailResponse` | [x] |
| POST | `/deployments` | `DeploymentCreateRequest` | `{id}` | [x] |
| PUT | `/deployments/{id}` | `DeploymentUpdateRequest` | `204` | [x] |
| DELETE | `/deployments/{id}` | - | `204` | [x] |
| PATCH | `/deployments/{id}/status` | `DeploymentStatusUpdateRequest` | `204` | [x] |
| GET | `/deployments/{id}/related-refs` | - | `DeploymentRelatedRefResponse[]` | [x] |
| PUT | `/deployments/{id}/related-refs` | `DeploymentRelatedRefsUpdateRequest` | `204` | [x] |
| GET | `/deployments/{id}/steps` | - | `DeploymentStepResponse[]` | [x] |
| PUT | `/deployments/{id}/steps` | `DeploymentStepsReplaceRequest` | `204` | [x] |
| PATCH | `/deployments/{id}/steps/{stepId}` | `DeploymentStepUpdateRequest` | `204` | [x] |

### 4.7 MeetingNote (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/meeting-notes` | `page,size` | `Page<MeetingNoteListResponse>` | [x] |
| GET | `/meeting-notes/{id}` | - | `MeetingNoteDetailResponse` | [x] |
| POST | `/meeting-notes` | `MeetingNoteCreateRequest` | `{id}` | [x] |
| PUT | `/meeting-notes/{id}` | `MeetingNoteUpdateRequest` | `204` | [x] |
| DELETE | `/meeting-notes/{id}` | - | `204` | [x] |
| GET | `/meeting-notes/{id}/action-items` | - | `MeetingActionItemResponse[]` | [x] |
| PATCH | `/meeting-notes/{id}/action-items/{itemId}` | `MeetingActionItemStatusUpdateRequest` | `204` | [x] |
| GET | `/meeting-notes/{id}/attendees` | - | `Long[]` | [x] |
| GET | `/meeting-notes/{id}/related-refs` | - | `MeetingNoteRelatedRefResponse[]` | [x] |

회의록 실시간 STOMP:
- `SEND /app/meeting-notes/{id}/patch` -> `SUBSCRIBE /topic/meeting-notes/{id}`
- `SEND /app/meeting-notes/{id}/presence/join|leave` -> `SUBSCRIBE /topic/meeting-notes/{id}/presence`

### 4.8 Idea (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/ideas` | `q,category,status,sortBy,sortDir,page,size` | `Page<ProjectIdeaListResponse>` | [x] |
| GET | `/ideas/{id}` | - | `ProjectIdeaDetailResponse` | [x] |
| POST | `/ideas` | `ProjectIdeaCreateRequest` | `{id}` | [x] |
| PUT | `/ideas/{id}` | `ProjectIdeaUpdateRequest` | `204` | [x] |
| DELETE | `/ideas/{id}` | - | `204` | [x] |
| PATCH | `/ideas/{id}/status` | `ProjectIdeaStatusUpdateRequest` | `204` | [x] |
| GET | `/ideas/{id}/related-refs` | - | `ProjectIdeaRelatedRefResponse[]` | [x] |
| PUT | `/ideas/{id}/related-refs` | `ProjectIdeaRelatedRefsUpdateRequest` | `204` | [x] |
| POST | `/ideas/{id}/votes` | Header: Bearer | `ProjectIdeaVoteResponse` | [x] |
| DELETE | `/ideas/{id}/votes/me` | Header: Bearer | `ProjectIdeaVoteResponse` | [x] |

`ProjectIdeaListResponse`에는 카드 집계를 위해 `likeCount`, `likedByMe`, `commentCount`를 포함한다.

### 4.9 KnowledgeBase + Resource (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/knowledge-base` | `page,size` | `Page<KnowledgeBaseArticleListResponse>` | [x] |
| GET | `/knowledge-base/{id}` | - | `KnowledgeBaseArticleDetailResponse` | [x] |
| POST | `/knowledge-base` | `KnowledgeBaseArticleCreateRequest` | `{id}` | [x] |
| PUT | `/knowledge-base/{id}` | `KnowledgeBaseArticleUpdateRequest` | `204` | [x] |
| DELETE | `/knowledge-base/{id}` | - | `204` | [x] |
| POST | `/knowledge-base/{id}/view` | - | `204` | [x] |
| GET | `/knowledge-base/{id}/related-refs` | - | `KnowledgeBaseRelatedRefResponse[]` | [x] |
| PUT | `/knowledge-base/{id}/related-refs` | `KnowledgeBaseRelatedRefsUpdateRequest` | `204` | [x] |
| GET | `/resources` | `page,size` | `Page<SharedResourceListResponse>` | [x] |
| GET | `/resources/{id}` | - | `SharedResourceDetailResponse` | [x] |
| POST | `/resources` | `SharedResourceCreateRequest` | `{id}` | [x] |
| PUT | `/resources/{id}` | `SharedResourceUpdateRequest` | `204` | [x] |
| DELETE | `/resources/{id}` | - | `204` | [x] |

### 4.10 Comment + Attachment (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/comments` | `refType,refId,page,size` | `Page<CommentListResponse>` | [x] |
| GET | `/comments/{id}` | - | `CommentDetailResponse` | [x] |
| POST | `/comments` | `CommentCreateRequest` | `{id}` | [x] |
| PATCH | `/comments/{id}` | `CommentUpdateRequest` | `204` | [x] |
| DELETE | `/comments/{id}` | - | `204` | [x] |
| GET | `/attachments` | `refType,refId` | `AttachmentListResponse[]` | [x] |
| GET | `/attachments/{id}` | - | `AttachmentDetailResponse` | [x] |
| POST | `/attachments` | `AttachmentCreateRequest` | `{id}` | [x] |
| PUT | `/attachments/{id}` | `AttachmentUpdateRequest` | `204` | [x] |
| DELETE | `/attachments/{id}` | - | `204` | [x] |

### 4.11 Notification + Dashboard + Statistics + Document Index (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/notifications` | `userId?,read?,page,size` | `Page<NotificationListResponse>` | [x] |
| GET | `/notifications/{id}` | - | `NotificationDetailResponse` | [x] |
| POST | `/notifications` | `NotificationCreateRequest` | `{id}` | [x] |
| PUT | `/notifications/{id}` | `NotificationUpdateRequest` | `204` | [x] |
| PATCH | `/notifications/{id}/read` | `read?(default=true)` | `204` | [x] |
| DELETE | `/notifications/{id}` | - | `204` | [x] |
| PATCH | `/notifications/read-all` | - | `204` | [x] |
| GET | `/dashboard` | `teamId?, scope(team\|mine), domain(ALL\|WORK_REQUEST\|TECH_TASK\|TEST_SCENARIO\|DEFECT\|DEPLOYMENT)` | `DashboardResponse` | [x] |
| GET | `/statistics` | `teamId?` | `StatisticsResponse` | [x] |
| GET | `/document-index/search` | `q?,types?,teamId?,page,size` | `Page<DocumentIndexSearchItemResponse>` | [x] |
| GET | `/activity-logs` | `refType,refId,page,size` | `Page<ActivityLogListResponse>` | [x] |

### 4.12 User Profile / Preferences (P1)
| Method | Path | Request | Response | 구현 |
|---|---|---|---|---|
| GET | `/users/me/profile` | Header: Bearer | `{name,email,role,avatarColor,photoUrl}` | [x] |
| PATCH | `/users/me/profile` | Header: Bearer + `{name,email,role,avatarColor,photoUrl}` | `{name,email,role,avatarColor,photoUrl}` | [x] |
| PATCH | `/users/me/password` | Header: Bearer + `{currentPassword,newPassword}` | `204` | [x] |
| GET | `/users/me/preferences` | Header: Bearer | `{notification:{...},display:{landing,rowCount}}` | [x] |
| PATCH | `/users/me/preferences` | Header: Bearer + `{notification:{...},display:{landing,rowCount}}` | same | [x] |

## 5. 스키마-프론트 갭 및 보완 필요
- 서버 목록 API의 검색/정렬/필터 기능이 도메인별로 완전 일치하지 않음(현재 프론트 보정 포함)
- 첨부파일은 현재 메타데이터 JSON 기반이며, 파일 스토리지 업로드 정책(`multipart/S3/local`) 표준화 필요

## 6. 체크리스트 운영 규칙
- 구현 완료 시 `구현` 체크
- 테스트 통과 시 테스트 항목을 PR 설명에 기재
- 프론트 실제 연결 완료 시 영향 화면/라우트와 함께 PR에 첨부

테스트 명령:
- 전체: `cd backend && ./gradlew test`
- auth: `./gradlew test --tests org.example.domain.auth.service.AuthServiceImplTest`
- team: `./gradlew test --tests org.example.domain.team.service.TeamServiceImplTest`
- work-request: `./gradlew test --tests org.example.domain.workRequest.service.WorkRequestServiceImplTest`
- tech-task: `./gradlew test --tests org.example.domain.techTask.service.TechTaskServiceImplTest`
