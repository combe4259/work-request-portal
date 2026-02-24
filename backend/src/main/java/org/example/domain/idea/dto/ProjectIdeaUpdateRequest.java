package org.example.domain.idea.dto;

import java.util.List;

public record ProjectIdeaUpdateRequest(
        String title,
        String content,
        List<String> benefits,
        String category,
        String status,
        String statusNote
) {
}
