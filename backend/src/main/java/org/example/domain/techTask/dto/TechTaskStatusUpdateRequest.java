package org.example.domain.techTask.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TechTaskStatusUpdateRequest(
        @Schema(example = "개발중", allowableValues = {"접수대기", "검토중", "개발중", "테스트중", "완료", "반려"}) String status,
        @Schema(example = "API 구현 진행 중입니다.") String statusNote
) {
}
