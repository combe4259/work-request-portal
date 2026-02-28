package org.example.domain.techTask.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TechTaskRelatedRefItemRequest(
        @Schema(example = "TEST_SCENARIO", description = "WORK_REQUEST | TEST_SCENARIO | DEPLOYMENT") String refType,
        @Schema(example = "1") Long refId,
        @Schema(example = "0") Integer sortOrder
) {
}
