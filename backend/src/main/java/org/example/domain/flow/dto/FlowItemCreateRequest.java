package org.example.domain.flow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record FlowItemCreateRequest(
        @Schema(example = "WORK_REQUEST", description = "WORK_REQUEST | TECH_TASK | TEST_SCENARIO | DEFECT | DEPLOYMENT") String parentType,
        @Schema(example = "1") Long parentId,
        @Schema(example = "TECH_TASK", description = "TECH_TASK | TEST_SCENARIO | DEPLOYMENT | DEFECT | KNOWLEDGE_BASE") String itemType,
        @Schema(example = "JWT 인증 모듈 개발") String title
) {}
