package org.example.domain.idea.dto;

import java.util.List;

public record ProjectIdeaRelatedRefsUpdateRequest(
        List<ProjectIdeaRelatedRefItemRequest> items
) {
}
