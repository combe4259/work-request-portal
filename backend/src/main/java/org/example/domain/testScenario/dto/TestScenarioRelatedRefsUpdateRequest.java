package org.example.domain.testScenario.dto;

import java.util.List;

public record TestScenarioRelatedRefsUpdateRequest(
        List<TestScenarioRelatedRefItemRequest> items
) {
}
