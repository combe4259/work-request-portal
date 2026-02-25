package org.example.domain.attachment.mapper;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.entity.Attachment;

public final class AttachmentMapper {

    private AttachmentMapper() {
    }

    public static Attachment fromCreateRequest(AttachmentCreateRequest request) {
        Attachment entity = new Attachment();
        entity.setRefType(request.refType());
        entity.setRefId(request.refId());
        entity.setOriginalName(request.originalName());
        entity.setStoredPath(request.storedPath());
        entity.setFileSize(request.fileSize());
        entity.setMimeType(request.mimeType());
        entity.setUploadedBy(request.uploadedBy());
        return entity;
    }

    public static void applyUpdate(Attachment entity, AttachmentUpdateRequest request) {
        if (request.refType() != null) {
            entity.setRefType(request.refType());
        }
        if (request.refId() != null) {
            entity.setRefId(request.refId());
        }
        if (request.originalName() != null) {
            entity.setOriginalName(request.originalName());
        }
        if (request.storedPath() != null) {
            entity.setStoredPath(request.storedPath());
        }
        if (request.fileSize() != null) {
            entity.setFileSize(request.fileSize());
        }
        if (request.mimeType() != null) {
            entity.setMimeType(request.mimeType());
        }
    }

    public static AttachmentListResponse toListResponse(Attachment entity) {
        return new AttachmentListResponse(
                entity.getId(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getOriginalName(),
                entity.getStoredPath(),
                entity.getFileSize(),
                entity.getMimeType(),
                entity.getUploadedBy(),
                entity.getCreatedAt()
        );
    }

    public static AttachmentDetailResponse toDetailResponse(Attachment entity) {
        return new AttachmentDetailResponse(
                entity.getId(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getOriginalName(),
                entity.getStoredPath(),
                entity.getFileSize(),
                entity.getMimeType(),
                entity.getUploadedBy(),
                entity.getCreatedAt()
        );
    }
}
