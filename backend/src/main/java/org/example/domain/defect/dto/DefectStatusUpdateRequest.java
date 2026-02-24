package org.example.domain.defect.dto;

public record DefectStatusUpdateRequest(
        String status,
        String statusNote
) {
}
