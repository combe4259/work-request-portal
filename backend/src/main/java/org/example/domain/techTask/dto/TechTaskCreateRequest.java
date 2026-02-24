package org.example.domain.techTask.dto;

import java.time.LocalDate;

public record TechTaskCreateRequest(
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
        LocalDate deadline
) {
}
