package org.example.domain.deployment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record DeploymentRelatedRefItemRequest(
        @Schema(example = "WORK_REQUEST", description = "WORK_REQUEST | TECH_TASK | TEST_SCENARIO") String refType,
        @Schema(example = "1") Long refId,
        @Schema(example = "0") Integer sortOrder
) {
}
