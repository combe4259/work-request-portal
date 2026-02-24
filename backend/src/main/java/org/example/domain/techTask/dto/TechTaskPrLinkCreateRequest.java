package org.example.domain.techTask.dto;

public record TechTaskPrLinkCreateRequest(
        String branchName,
        String prNo,
        String prUrl
) {
}
