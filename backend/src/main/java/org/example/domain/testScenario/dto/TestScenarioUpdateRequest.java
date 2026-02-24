package org.example.domain.testScenario.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TestScenarioUpdateRequest(
        String title,
        String description,
        String type,
        String priority,
        String status,
        Long assigneeId,
        String precondition,
        String steps,
        String expectedResult,
        String actualResult,
        LocalDate deadline,
        LocalDateTime executedAt,
        String statusNote
) {
}
