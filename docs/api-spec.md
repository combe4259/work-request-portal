# API Specification & Delivery Checklist

## 1. 목적과 기준
이 문서는 `frontend` 화면 요구사항과 `backend/src/main/resources/db/migration/V1__baseline.sql`을 기준으로 백엔드 API 구현 범위를 고정하는 단일 기준 문서다.

기준 소스:
- 라우팅: `frontend/src/router/index.tsx`
- 타입/폼: `frontend/src/types/*.ts`, `frontend/src/features/*/schemas.ts`
- 목업 화면: `frontend/src/pages/**` (특히 detail/form/list, settings, topbar)
- DB: `backend/src/main/resources/db/migration/V1__baseline.sql`

## 2. 공통 규약
- Base URL: `/api`
- 인증: `Authorization: Bearer <accessToken>` (`/auth/signup`, `/auth/login` 제외)
- 팀 스코프: 팀 데이터 API는 `teamId` 기준으로 조회/수정
- 페이징: `page`(0-base), `size`
- 정렬: `sort`, `dir(asc|desc)`
- 에러 포맷(권장 통일안):

```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청값이 올바르지 않습니다.",
  "fieldErrors": [{ "field": "title", "reason": "필수값입니다." }]
}
```

## 3. 구현 상태 요약 (2026-02-24)
- 구현됨: `Auth`, `Team`, `WorkRequest`, `TechTask`, `TestScenario`, `Defect`, `Deployment`, `MeetingNote`, `Idea`
- 부분 구현:
  - `WorkRequest`: 목록 조회는 현재 기본 `page/size`만 적용
  - `TechTask`: 목록 조회는 현재 기본 `page/size`만 적용, 정렬/검색/필터는 프론트 보정
- 스켈레톤만 존재: `KnowledgeBase`, `Resource`, `Comment`, `Attachment`, `Notification`, `Dashboard`, `Statistics`

## 4. 도메인별 API 명세

### 4.1 Auth + Team (P0)
| Method | Path | Request | Response | 구현 |
|---|---|---|---|---|
| POST | `/auth/signup` | `{name,email,role?,password}` | `{id,email}` | [x] |
| POST | `/auth/login` | `{email,password}` | `{accessToken,user,teams[]}` | [x] |
| GET | `/auth/me` | Header: Bearer | `{accessToken,user,teams[]}` | [x] |
| POST | `/auth/logout` | - | `204` | [x] |
| GET | `/teams/mine` | - | `[{id,name,description,teamRole,inviteCode}]` | [x] |
| POST | `/teams` | `{name,description?}` | `{id,name,description,teamRole,inviteCode}` | [x] |
| POST | `/teams/join` | `{inviteCode}` | `{id,name,description,teamRole,inviteCode}` | [x] |
| GET | `/teams/{teamId}/members` | - | `[{userId,name,email,teamRole}]` | [x] |
| PATCH | `/teams/{teamId}/members/{userId}/role` | `{teamRole}` | `204` | [x] |
| DELETE | `/teams/{teamId}/members/{userId}` | - | `204` | [x] |
| POST | `/teams/{teamId}/invitations` | `{email,expiresAt?}` | `{id,token,status}` | [ ] |
| GET | `/teams/{teamId}/invitations` | `status?` | `[{id,email,status,expiresAt}]` | [ ] |
| POST | `/teams/invitations/{token}/accept` | - | `{teamId,teamName}` | [ ] |

### 4.2 Work Requests (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/work-requests` | `page,size,search,type,priority,status,sort,dir` | `Page<WorkRequestListResponse>` | [x] (기본 page/size만) |
| GET | `/work-requests/{id}` | - | `WorkRequestDetailResponse` | [x] |
| POST | `/work-requests` | `title,background?,description,type,priority,status,teamId,requesterId,assigneeId?,deadline` | `{id}` | [x] |
| PUT | `/work-requests/{id}` | `WorkRequestUpdateRequest` | `204` | [x] |
| PATCH | `/work-requests/{id}/status` | `{status,statusNote?}` | `204` | [ ] |
| GET | `/work-requests/{id}/comments` | `page,size` | `Page<Comment>` | [ ] |
| POST | `/work-requests/{id}/comments` | `{content}` | `Comment` | [ ] |
| GET | `/work-requests/{id}/attachments` | - | `Attachment[]` | [ ] |
| POST | `/work-requests/{id}/attachments` | `multipart/form-data` | `Attachment` | [ ] |

### 4.3 TechTask (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/tech-tasks` | `page,size,search,type,priority,status,sort(docNo/deadline),dir` | `Page<TechTaskListResponse>` | [x] (기본 page/size만) |
| GET | `/tech-tasks/{id}` | - | `TechTaskDetailResponse` | [x] |
| POST | `/tech-tasks` | `title,type,priority,deadline,assigneeId?,currentIssue,solution,definitionOfDone?` | `{id}` | [x] |
| PUT | `/tech-tasks/{id}` | 생성 필드 + `status,statusNote?` | `204` | [x] |
| PATCH | `/tech-tasks/{id}/status` | `{status,statusNote?}` | `204` | [x] |
| GET | `/tech-tasks/{id}/related-refs` | - | `[{refType,refId,refNo,title}]` | [x] |
| PUT | `/tech-tasks/{id}/related-refs` | `{items:[{refType,refId,sortOrder}]}` | `204` | [x] |
| GET | `/tech-tasks/{id}/pr-links` | - | `[{id,branchName,prNo,prUrl}]` | [x] |
| POST | `/tech-tasks/{id}/pr-links` | `{branchName,prNo?,prUrl?}` | `{id}` | [x] |
| DELETE | `/tech-tasks/{id}/pr-links/{linkId}` | - | `204` | [x] |

### 4.4 TestScenario (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/test-scenarios` | `page,size,search,type,priority,status,sort(docNo/deadline/priority/status),dir` | `Page<TestScenarioListResponse> + summary(pass/fail/run/total)` | [x] (기본 page/size만) |
| GET | `/test-scenarios/{id}` | - | `TestScenarioDetailResponse` | [x] |
| POST | `/test-scenarios` | `title,type,priority,deadline,assigneeId?,precondition?,steps[],expectedResult?` | `{id}` | [x] |
| PUT | `/test-scenarios/{id}` | 생성 필드 + `status,actualResult?,statusNote?` | `204` | [x] |
| PATCH | `/test-scenarios/{id}/status` | `{status,statusNote?}` | `204` | [x] |
| PATCH | `/test-scenarios/{id}/execution` | `{stepResults:[PASS/FAIL/SKIP],actualResult?,executedAt?}` | `204` | [ ] |
| GET | `/test-scenarios/{id}/related-refs` | - | `[{refType,refId,refNo,title}]` | [ ] |
| PUT | `/test-scenarios/{id}/related-refs` | `{items:[{refType,refId,sortOrder}]}` | `204` | [ ] |

### 4.5 Defect (P0)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/defects` | `page,size,search,type,severity,status,sort(docNo/deadline/severity/status),dir` | `Page<DefectListResponse> + summary(critical/open/fixing/done)` | [x] (기본 page/size만) |
| GET | `/defects/{id}` | - | `DefectDetailResponse` | [x] |
| POST | `/defects` | `title,type,severity,deadline,assigneeId?,relatedRefType?,relatedRefId?,environment?,reproductionSteps[],expectedBehavior,actualBehavior` | `{id}` | [x] |
| PUT | `/defects/{id}` | 생성 필드 + `status,statusNote?` | `204` | [x] |
| PATCH | `/defects/{id}/status` | `{status,statusNote?}` | `204` | [x] |

### 4.6 Deployment (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/deployments` | `page,size,search,type,environment,status,sort(docNo/status/scheduledAt),dir` | `Page<DeploymentListResponse> + summary(upcoming/inProgress/prodDone/fail)` | [x] (기본 page/size만) |
| GET | `/deployments/{id}` | - | `DeploymentDetailResponse` | [x] |
| POST | `/deployments` | `title,version,type,environment,managerId?,scheduledAt,overview?,rollbackPlan?,relatedRefs[],steps[]` | `{id}` | [x] |
| PUT | `/deployments/{id}` | 생성 필드 + `status,statusNote?` | `204` | [x] |
| PATCH | `/deployments/{id}/status` | `{status,statusNote?}` | `204` | [x] |
| GET | `/deployments/{id}/steps` | - | `[{id,stepOrder,content,isDone}]` | [x] |
| PATCH | `/deployments/{id}/steps/{stepId}` | `{isDone}` | `204` | [x] |

### 4.7 MeetingNote (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/meeting-notes` | `page,size,search,sort(docNo/meetingDate),dir` | `Page<MeetingNoteListResponse>` | [x] (기본 page/size만) |
| GET | `/meeting-notes/{id}` | - | `MeetingNoteDetailResponse` | [x] |
| POST | `/meeting-notes` | `title,meetingDate,location?,facilitatorId,agenda[],content,decisions[],attendeeIds[],actionItems[],relatedRefs[]` | `{id}` | [x] |
| PUT | `/meeting-notes/{id}` | 생성 필드 전체 | `204` | [x] |
| GET | `/meeting-notes/{id}/action-items` | - | `[{id,content,assigneeId,dueDate,status,linkedRefType?,linkedRefId?}]` | [x] |
| GET | `/meeting-notes/{id}/attendees` | - | `[userId, ...]` | [x] |
| GET | `/meeting-notes/{id}/related-refs` | - | `[{refType,refId,refNo,title}]` | [x] |
| PATCH | `/meeting-notes/{id}/action-items/{itemId}` | `{status}` | `204` | [x] |

### 4.8 Idea (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/ideas` | `page,size,search,category,status,sort(createdAt/likes),dir` | `Page<ProjectIdeaListResponse>` | [x] (기본 page/size만) |
| GET | `/ideas/{id}` | - | `ProjectIdeaDetailResponse` | [x] |
| POST | `/ideas` | `title,category,content,benefits?,relatedRefs[]` | `{id}` | [x] (relatedRefs 제외) |
| PUT | `/ideas/{id}` | 생성 필드 + `status,statusNote?` | `204` | [x] (relatedRefs 제외) |
| PATCH | `/ideas/{id}/status` | `{status,statusNote?}` | `204` | [x] |
| POST | `/ideas/{id}/votes` | - | `{liked:true,likeCount}` | [x] |
| DELETE | `/ideas/{id}/votes/me` | - | `{liked:false,likeCount}` | [x] |

### 4.9 KnowledgeBase / Resource (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/knowledge-base` | `page,size,search,category,tags[]` | `Page<KnowledgeBaseArticleListResponse>` | [ ] |
| GET | `/knowledge-base/{id}` | - | `KnowledgeBaseArticleDetailResponse` | [ ] |
| POST | `/knowledge-base` | `title,category,tags[],summary,content,authorId,relatedRefs[]` | `{id}` | [ ] |
| PUT | `/knowledge-base/{id}` | 생성 필드 전체 | `204` | [ ] |
| POST | `/knowledge-base/{id}/view` | - | `204` | [ ] |
| GET | `/resources` | `page,size,search,category` | `Page<SharedResourceListResponse>` | [ ] |
| GET | `/resources/{id}` | - | `SharedResourceDetailResponse` | [ ] |
| POST | `/resources` | `title,url,category,description` | `{id}` | [ ] |
| PUT | `/resources/{id}` | `title,url,category,description` | `204` | [ ] |
| DELETE | `/resources/{id}` | - | `204` | [ ] |

### 4.10 공통 하위 리소스 + 대시보드 (P1)
| Method | Path | 핵심 Query/Body | Response | 구현 |
|---|---|---|---|---|
| GET | `/comments` | `refType,refId,page,size` | `Page<Comment>` | [ ] |
| POST | `/comments` | `{refType,refId,content}` | `Comment` | [ ] |
| PATCH | `/comments/{id}` | `{content}` | `204` | [ ] |
| DELETE | `/comments/{id}` | - | `204` | [ ] |
| GET | `/attachments` | `refType,refId` | `Attachment[]` | [ ] |
| POST | `/attachments` | `multipart/form-data(refType,refId,file)` | `Attachment` | [ ] |
| DELETE | `/attachments/{id}` | - | `204` | [ ] |
| GET | `/notifications` | `isRead?,page,size` | `Page<Notification>` | [ ] |
| PATCH | `/notifications/{id}/read` | - | `204` | [ ] |
| PATCH | `/notifications/read-all` | - | `204` | [ ] |
| GET | `/dashboard/summary` | - | `DashboardResponse` | [ ] |
| GET | `/dashboard/recent-work-requests` | `limit?` | `WorkRequest[]` | [ ] |
| GET | `/dashboard/calendar-events` | `from,to` | `[{date,refNo,title,priority}]` | [ ] |
| GET | `/statistics/overview` | `period(4w/8w/month)` | `StatisticsResponse` | [ ] |
| GET | `/statistics/trend` | `period` | `trend/domain/severity/member/status` | [ ] |
| GET | `/users/me/profile` | - | `{name,email,role,avatarUrl?}` | [ ] |
| PATCH | `/users/me/profile` | `{name,email,role,avatarUrl?}` | `204` | [ ] |
| PATCH | `/users/me/password` | `{currentPassword,newPassword}` | `204` | [ ] |
| GET/PATCH | `/users/me/preferences` | `{notification:{...},display:{landing,rowCount}}` | same | [ ] |

## 5. 스키마-프론트 갭 및 보완 필요
- `user_teams.team_role` 타입: JPA Enum 매핑과 DB 타입 일치 필요(현재 불일치 이슈 발생 이력 있음)
- 사용자 설정(알림/화면) 영속 저장 구조 부재: `user_preferences` 테이블 추가 또는 `users` 확장 필요
- 상세 화면의 “처리 이력” 데이터 원천 부재: `activity_logs`(ref_type, ref_id, action, actor_id, payload, created_at) 테이블 권장
- 첨부파일은 `stored_path`만 존재: 실제 파일 스토리지(S3/local) 전략과 업로드 정책 명시 필요

## 6. 체크리스트 운영 규칙
- 구현 완료 시 `구현` 체크
- 테스트 통과 시 `테스트(단위/API)` 체크
- 프론트 실제 연결 완료 시 `프론트연결` 체크

테스트 명령:
- 전체: `cd backend && ./gradlew test`
- auth: `./gradlew test --tests org.example.domain.auth.service.AuthServiceImplTest`
- team: `./gradlew test --tests org.example.domain.team.service.TeamServiceImplTest`
- work-request: `./gradlew test --tests org.example.domain.workRequest.service.WorkRequestServiceImplTest`
- tech-task: `./gradlew test --tests org.example.domain.techTask.service.TechTaskServiceImplTest`
