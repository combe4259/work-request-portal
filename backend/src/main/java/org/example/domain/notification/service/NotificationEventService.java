package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.user.entity.UserPreference;
import org.example.domain.user.repository.UserPreferenceRepository;
import org.example.global.slack.SlackNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class NotificationEventService {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventService.class);

    private final NotificationService notificationService;
    private final UserPreferenceRepository userPreferenceRepository;
    private final SlackNotificationService slackNotificationService;

    public NotificationEventService(
            NotificationService notificationService,
            UserPreferenceRepository userPreferenceRepository,
            SlackNotificationService slackNotificationService
    ) {
        this.notificationService = notificationService;
        this.userPreferenceRepository = userPreferenceRepository;
        this.slackNotificationService = slackNotificationService;
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
        if (!isEnabled(userId, type)) {
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
            slackNotificationService.send(type, title, message);
        } catch (RuntimeException ex) {
            log.warn("알림 생성에 실패했습니다. userId={}, type={}, refType={}, refId={}", userId, type, refType, refId, ex);
        }
    }

    private boolean isEnabled(Long userId, String type) {
        UserPreference preference = userPreferenceRepository.findById(userId).orElse(null);
        if (preference == null) {
            // 기존 사용자 호환성을 위해 환경설정이 없으면 알림을 허용한다.
            return true;
        }

        NotificationCategory category = resolveCategory(type);
        if (category == null) {
            return true;
        }

        return switch (category) {
            case ASSIGN -> Boolean.TRUE.equals(preference.getNotifyAssign());
            case COMMENT -> Boolean.TRUE.equals(preference.getNotifyComment());
            case DEADLINE -> Boolean.TRUE.equals(preference.getNotifyDeadline());
            case STATUS -> Boolean.TRUE.equals(preference.getNotifyStatus());
            case DEPLOY -> Boolean.TRUE.equals(preference.getNotifyDeploy());
            case MENTION -> Boolean.TRUE.equals(preference.getNotifyMention());
        };
    }

    private NotificationCategory resolveCategory(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }

        String value = type.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "담당자배정" -> NotificationCategory.ASSIGN;
            case "댓글" -> NotificationCategory.COMMENT;
            case "마감임박" -> NotificationCategory.DEADLINE;
            case "상태변경", "배포실패", "아이디어채택" -> NotificationCategory.STATUS;
            case "배포완료" -> NotificationCategory.DEPLOY;
            case "멘션" -> NotificationCategory.MENTION;
            default -> null;
        };
    }

    private enum NotificationCategory {
        ASSIGN,
        COMMENT,
        DEADLINE,
        STATUS,
        DEPLOY,
        MENTION
    }
}
