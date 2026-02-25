package org.example.domain.workRequest.dto;

public record WorkRequestStatusUpdateRequest(
        String status,
        String statusNote
) {
}
