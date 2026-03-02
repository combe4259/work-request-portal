package org.example.domain.techTask.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TechTaskUpdateRequest(
        @Schema(example = "JWT 인증 모듈 설계 (수정)") String title,
        @Schema(example = "현재 세션 기반 인증만 지원하여 확장성이 부족합니다.") String currentIssue,
        @Schema(example = "jjwt 라이브러리를 활용한 Access/Refresh 토큰 구조 설계") String solution,
        @Schema(example = "[\"토큰 발급 API 동작 확인\", \"토큰 만료/갱신 시나리오 검증\"]") String definitionOfDone,
        @Schema(example = "리팩토링", allowableValues = {"리팩토링", "기술부채", "성능개선", "보안", "테스트", "기타"}) String type,
        @Schema(example = "높음", allowableValues = {"긴급", "높음", "보통", "낮음"}) String priority,
        @Schema(example = "개발중", allowableValues = {"접수대기", "검토중", "개발중", "테스트중", "완료", "반려"}) String status,
        @Schema(example = "2") Long assigneeId,
        @Schema(example = "2026-03-15") LocalDate deadline,
        @Schema(example = "2026-02-27T09:00:00") LocalDateTime startedAt,
        @Schema(example = "null") LocalDateTime completedAt,
        @Schema(example = "null") String rejectedReason,
        @Schema(example = "null") LocalDateTime rejectedAt
) {
}
