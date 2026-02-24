package org.example.domain.testScenario.dto;

public record TestScenarioStatusUpdateRequest(
        String status,
        String statusNote
) {
}
