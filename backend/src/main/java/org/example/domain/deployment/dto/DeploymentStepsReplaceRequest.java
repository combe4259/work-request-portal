package org.example.domain.deployment.dto;

import java.util.List;

public record DeploymentStepsReplaceRequest(
        List<String> steps
) {
}
