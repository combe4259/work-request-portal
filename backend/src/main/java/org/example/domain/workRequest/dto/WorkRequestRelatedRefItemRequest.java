package org.example.domain.workRequest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record WorkRequestRelatedRefItemRequest(
        @Schema(example = "TECH_TASK", description = "TECH_TASK | TEST_SCENARIO | DEPLOYMENT") String refType,
        @Schema(example = "1") Long refId,
        @Schema(example = "0") Integer sortOrder
) {
}
