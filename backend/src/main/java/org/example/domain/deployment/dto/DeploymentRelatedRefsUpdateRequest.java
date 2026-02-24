package org.example.domain.deployment.dto;

import java.util.List;

public record DeploymentRelatedRefsUpdateRequest(
        List<DeploymentRelatedRefItemRequest> items
) {
}
