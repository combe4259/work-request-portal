package org.example.domain.testScenario.dto;

public record TestScenarioRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
