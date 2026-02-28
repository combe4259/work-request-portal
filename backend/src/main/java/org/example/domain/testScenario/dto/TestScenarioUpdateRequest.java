package org.example.domain.testScenario.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TestScenarioUpdateRequest(
        @Schema(example = "로그인 성공 시나리오 검증 (수정)") String title,
        @Schema(example = "정상 자격증명으로 로그인 시 JWT 토큰이 발급되는지 확인합니다.") String description,
        @Schema(example = "기능") String type,
        @Schema(example = "높음") String priority,
        @Schema(example = "실행중") String status,
        @Schema(example = "2") Long assigneeId,
        @Schema(example = "사용자가 DB에 존재하고, 이메일/비밀번호가 올바른 상태") String precondition,
        @Schema(example = "[\"POST /api/auth/login 요청\",\"응답 status 200 확인\",\"accessToken 존재 확인\"]") String steps,
        @Schema(example = "HTTP 200, accessToken 및 refreshToken 반환") String expectedResult,
        @Schema(example = "null") String actualResult,
        @Schema(example = "2026-03-20") LocalDate deadline,
        @Schema(example = "null") LocalDateTime executedAt,
        @Schema(example = "null") String statusNote
) {
}
