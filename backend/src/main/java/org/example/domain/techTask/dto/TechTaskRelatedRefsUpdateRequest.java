package org.example.domain.techTask.dto;

import java.util.List;

public record TechTaskRelatedRefsUpdateRequest(
        List<TechTaskRelatedRefItemRequest> items
) {
}
