package org.example.domain.defect.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DefectUpdateRequest(
        @Schema(example = "로그인 시 토큰 만료 오류 발생 (수정)") String title,
        @Schema(example = "로그인 후 5분 이내에 토큰이 만료되어 재로그인이 필요한 현상 발생") String description,
        @Schema(example = "기능") String type,
        @Schema(example = "높음") String severity,
        @Schema(example = "분석중") String status,
        @Schema(example = "WORK_REQUEST") String relatedRefType,
        @Schema(example = "1") Long relatedRefId,
        @Schema(example = "운영") String environment,
        @Schema(example = "1. 로그인 -> 2. 5분 대기 -> 3. API 호출 -> 4. 401 오류 확인") String reproductionSteps,
        @Schema(example = "토큰이 30분간 유지되어야 합니다.") String expectedBehavior,
        @Schema(example = "5분 후 토큰이 만료되어 401 오류가 발생합니다.") String actualBehavior,
        @Schema(example = "2026-03-10") LocalDate deadline,
        @Schema(example = "원인 분석 중입니다.") String statusNote,
        @Schema(example = "2") Long assigneeId,
        @Schema(example = "2026-02-27T09:00:00") LocalDateTime startedAt,
        @Schema(example = "null") LocalDateTime verifiedAt,
        @Schema(example = "null") LocalDateTime resolvedAt
) {
}
