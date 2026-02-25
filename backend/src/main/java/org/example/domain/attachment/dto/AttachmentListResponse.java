package org.example.domain.attachment.dto;

import java.time.LocalDateTime;

public record AttachmentListResponse(
        Long id,
        String refType,
        Long refId,
        String originalName,
        String storedPath,
        Long fileSize,
        String mimeType,
        Long uploadedBy,
        LocalDateTime createdAt
) {
}
