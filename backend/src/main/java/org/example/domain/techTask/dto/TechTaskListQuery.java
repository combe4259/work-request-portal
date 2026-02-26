package org.example.domain.techTask.dto;

import java.time.LocalDate;

public record TechTaskListQuery(
        String q,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadlineFrom,
        LocalDate deadlineTo,
        String sortBy,
        String sortDir
) {
}
