package org.example.domain.idea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ProjectIdeaStatusUpdateRequest(
        @Schema(example = "채택", allowableValues = {"제안됨", "검토중", "채택", "보류", "기각"}) String status,
        @Schema(example = "Q2 스프린트에 반영 예정") String statusNote
) {
}
