package org.example.domain.attachment.dto;

public record AttachmentUpdateRequest(
        String refType,
        Long refId,
        String originalName,
        String storedPath,
        Long fileSize,
        String mimeType
) {
}
