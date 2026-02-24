package org.example.domain.workRequest.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WorkRequestDetailResponse(
        Long id,
        String requestNo,
        String title,
        String background,
        String description,
        String type,
        String priority,
        String status,
        Long teamId,
        Long requesterId,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String rejectedReason,
        LocalDateTime rejectedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
