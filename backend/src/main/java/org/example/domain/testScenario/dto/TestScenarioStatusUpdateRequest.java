package org.example.domain.testScenario.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TestScenarioStatusUpdateRequest(
        @Schema(example = "통과", description = "작성중 | 검토중 | 승인됨 | 실행중 | 통과 | 실패 | 보류") String status,
        @Schema(example = "모든 케이스 정상 통과 확인됨") String statusNote
) {
}
