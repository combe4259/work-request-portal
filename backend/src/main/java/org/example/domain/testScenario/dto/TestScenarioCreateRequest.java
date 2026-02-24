package org.example.domain.testScenario.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TestScenarioCreateRequest(
        String title,
        String description,
        String type,
        String priority,
        String status,
        Long teamId,
        Long assigneeId,
        String precondition,
        String steps,
        String expectedResult,
        String actualResult,
        LocalDate deadline,
        LocalDateTime executedAt,
        String statusNote,
        Long createdBy
) {
}
