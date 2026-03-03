package org.example.domain.flow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record FlowEdgeDeleteRequest(
        @Schema(example = "TT-12") String sourceNodeId,
        @Schema(example = "TS-27") String targetNodeId
) {
}
