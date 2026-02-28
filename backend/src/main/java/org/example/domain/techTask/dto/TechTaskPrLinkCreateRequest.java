package org.example.domain.techTask.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record TechTaskPrLinkCreateRequest(
        @Schema(example = "feature/login-jwt") String branchName,
        @Schema(example = "PR-42") String prNo,
        @Schema(example = "https://github.com/org/repo/pull/42") String prUrl
) {
}
