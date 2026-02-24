package org.example.domain.techTask.dto;

public record TechTaskPrLinkResponse(
        Long id,
        String branchName,
        String prNo,
        String prUrl
) {
}
