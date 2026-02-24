package org.example.domain.techTask.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TechTaskListResponse(
        Long id,
        String taskNo,
        String title,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime createdAt
) {
}
