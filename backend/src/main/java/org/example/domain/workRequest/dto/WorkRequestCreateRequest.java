package org.example.domain.workRequest.dto;

import java.time.LocalDate;

public record WorkRequestCreateRequest(
        String title,
        String background,
        String description,
        String type,
        String priority,
        String status,
        Long teamId,
        Long requesterId,
        Long assigneeId,
        LocalDate deadline
) {
}
