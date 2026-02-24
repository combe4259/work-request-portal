package org.example.domain.techTask.dto;

public record TechTaskStatusUpdateRequest(
        String status,
        String statusNote
) {
}
