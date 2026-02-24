package org.example.domain.deployment.dto;

public record DeploymentRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
