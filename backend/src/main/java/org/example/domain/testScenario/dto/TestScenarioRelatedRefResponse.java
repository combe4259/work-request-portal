package org.example.domain.testScenario.dto;

public record TestScenarioRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
