package org.example.domain.workRequest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

public record WorkRequestCreateRequest(
        @Schema(example = "로그인 기능 개발") String title,
        @Schema(example = "사용자 인증 보안 강화를 위해 신규 로그인 기능이 필요합니다.") String background,
        @Schema(example = "JWT 기반 로그인/로그아웃 API 개발 및 세션 관리 구현") String description,
        @Schema(example = "신규개발", allowableValues = {"기능개선", "버그수정", "신규개발", "문의", "기타"}) String type,
        @Schema(example = "높음", allowableValues = {"긴급", "높음", "보통", "낮음"}) String priority,
        @Schema(example = "접수대기", allowableValues = {"접수대기", "접수완료", "개발중", "완료", "반려"}) String status,
        @Schema(example = "1") Long requesterId,
        @Schema(example = "2") Long assigneeId,
        @Schema(example = "2026-03-31") LocalDate deadline
) {
}
