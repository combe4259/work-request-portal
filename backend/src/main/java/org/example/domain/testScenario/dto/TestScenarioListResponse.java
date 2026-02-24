package org.example.domain.testScenario.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TestScenarioListResponse(
        Long id,
        String scenarioNo,
        String title,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime createdAt
) {
}
