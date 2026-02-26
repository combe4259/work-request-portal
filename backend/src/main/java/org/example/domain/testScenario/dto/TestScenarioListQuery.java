package org.example.domain.testScenario.dto;

import java.time.LocalDate;

public record TestScenarioListQuery(
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
