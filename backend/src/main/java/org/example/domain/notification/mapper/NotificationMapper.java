package org.example.domain.notification.mapper;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationDetailResponse;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.example.domain.notification.entity.Notification;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static Notification fromCreateRequest(NotificationCreateRequest request) {
        Notification entity = new Notification();
        entity.setUserId(request.userId());
        entity.setType(request.type());
        entity.setTitle(request.title());
        entity.setMessage(request.message());
        entity.setRefType(request.refType());
        entity.setRefId(request.refId());
        entity.setIsRead(false);
        entity.setSlackSent(request.slackSent() != null && request.slackSent());
        return entity;
    }

    public static void applyUpdate(Notification entity, NotificationUpdateRequest request) {
        if (request.type() != null) {
            entity.setType(request.type());
        }
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.message() != null) {
            entity.setMessage(request.message());
        }
        if (request.refType() != null) {
            entity.setRefType(request.refType());
        }
        if (request.refId() != null) {
            entity.setRefId(request.refId());
        }
        if (request.isRead() != null) {
            entity.setIsRead(request.isRead());
        }
        if (request.slackSent() != null) {
            entity.setSlackSent(request.slackSent());
        }
    }

    public static NotificationListResponse toListResponse(Notification entity) {
        return new NotificationListResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getIsRead(),
                entity.getSlackSent(),
                entity.getCreatedAt()
        );
    }

    public static NotificationDetailResponse toDetailResponse(Notification entity) {
        return new NotificationDetailResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getIsRead(),
                entity.getSlackSent(),
                entity.getCreatedAt()
        );
    }
}
