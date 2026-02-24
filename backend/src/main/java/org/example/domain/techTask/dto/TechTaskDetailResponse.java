package org.example.domain.techTask.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TechTaskDetailResponse(
        Long id,
        String taskNo,
        String title,
        String currentIssue,
        String solution,
        String definitionOfDone,
        String type,
        String priority,
        String status,
        Long teamId,
        Long registrantId,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String rejectedReason,
        LocalDateTime rejectedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
