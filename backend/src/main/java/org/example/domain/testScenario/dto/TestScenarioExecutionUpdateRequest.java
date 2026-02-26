package org.example.domain.testScenario.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TestScenarioExecutionUpdateRequest(
        List<String> stepResults,
        String actualResult,
        LocalDateTime executedAt
) {
}
