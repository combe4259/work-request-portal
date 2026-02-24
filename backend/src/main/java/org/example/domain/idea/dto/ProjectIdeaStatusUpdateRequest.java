package org.example.domain.idea.dto;

public record ProjectIdeaStatusUpdateRequest(
        String status,
        String statusNote
) {
}
