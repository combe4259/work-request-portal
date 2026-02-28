package org.example.domain.deployment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record DeploymentUpdateRequest(
        @Schema(example = "로그인 기능 v1.0 운영 배포 (수정)") String title,
        @Schema(example = "JWT 인증 기반 로그인/로그아웃 기능 신규 배포") String overview,
        @Schema(example = "이전 세션 기반 인증으로 롤백 스크립트 준비됨") String rollbackPlan,
        @Schema(example = "v1.0.0") String version,
        @Schema(example = "정기배포") String type,
        @Schema(example = "운영") String environment,
        @Schema(example = "진행중") String status,
        @Schema(example = "1") Long managerId,
        @Schema(example = "2026-03-31") LocalDate scheduledAt,
        @Schema(example = "2026-03-31T22:00:00") LocalDateTime startedAt,
        @Schema(example = "null") LocalDateTime completedAt,
        @Schema(example = "null") LocalDateTime failedAt,
        @Schema(example = "null") LocalDateTime rolledBackAt,
        @Schema(example = "배포 진행 중") String statusNote,
        @Schema(example = "null") LocalDateTime deployedAt,
        @Schema(example = "[]") List<DeploymentRelatedRefItemRequest> relatedRefs,
        @Schema(example = "[\"DB 마이그레이션 실행\",\"서버 재시작\",\"헬스체크 확인\"]") List<String> steps
) {
}
