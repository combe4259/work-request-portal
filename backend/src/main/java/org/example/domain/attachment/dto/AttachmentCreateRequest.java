package org.example.domain.attachment.dto;

public record AttachmentCreateRequest(
        String refType,
        Long refId,
        String originalName,
        String storedPath,
        Long fileSize,
        String mimeType,
        Long uploadedBy
) {
}
