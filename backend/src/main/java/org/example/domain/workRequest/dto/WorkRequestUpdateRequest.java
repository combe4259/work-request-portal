package org.example.domain.workRequest.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WorkRequestUpdateRequest(
        String title,
        String background,
        String description,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String rejectedReason,
        LocalDateTime rejectedAt
) {
}
