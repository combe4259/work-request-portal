package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationEventService {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventService.class);

    private final NotificationService notificationService;

    public NotificationEventService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    public void create(
            Long userId,
            String type,
            String title,
            String message,
            String refType,
            Long refId
    ) {
        if (userId == null) {
            return;
        }

        try {
            notificationService.create(new NotificationCreateRequest(
                    userId,
                    type,
                    title,
                    message,
                    refType,
                    refId,
                    false
            ));
        } catch (RuntimeException ex) {
            log.warn("알림 생성에 실패했습니다. userId={}, type={}, refType={}, refId={}", userId, type, refType, refId, ex);
        }
    }
}
