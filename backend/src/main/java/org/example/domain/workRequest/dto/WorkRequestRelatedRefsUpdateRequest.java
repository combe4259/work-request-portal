package org.example.domain.workRequest.dto;

import java.util.List;

public record WorkRequestRelatedRefsUpdateRequest(
        List<WorkRequestRelatedRefItemRequest> items
) {
}
