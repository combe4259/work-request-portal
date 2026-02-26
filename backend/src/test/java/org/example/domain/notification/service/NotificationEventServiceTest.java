package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.user.entity.UserPreference;
import org.example.domain.user.repository.UserPreferenceRepository;
import org.example.global.slack.SlackNotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEventServiceTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserPreferenceRepository userPreferenceRepository;

    @Mock
    private SlackNotificationService slackNotificationService;

    @InjectMocks
    private NotificationEventService notificationEventService;

    @Test
    @DisplayName("알림 설정이 비활성이면 이벤트 알림을 생성하지 않는다")
    void skipNotificationWhenPreferenceDisabled() {
        UserPreference preference = new UserPreference();
        preference.setUserId(3L);
        preference.setNotifyAssign(false);

        when(userPreferenceRepository.findById(3L)).thenReturn(Optional.of(preference));

        notificationEventService.create(
                3L,
                "담당자배정",
                "업무요청 배정",
                "WR-001 업무가 배정되었습니다.",
                "WORK_REQUEST",
                1L
        );

        verify(notificationService, never()).create(org.mockito.ArgumentMatchers.any(NotificationCreateRequest.class));
    }

    @Test
    @DisplayName("알림 설정이 활성일 때 이벤트 알림을 생성한다")
    void createNotificationWhenPreferenceEnabled() {
        UserPreference preference = new UserPreference();
        preference.setUserId(3L);
        preference.setNotifyAssign(true);

        when(userPreferenceRepository.findById(3L)).thenReturn(Optional.of(preference));

        notificationEventService.create(
                3L,
                "담당자배정",
                "업무요청 배정",
                "WR-001 업무가 배정되었습니다.",
                "WORK_REQUEST",
                1L
        );

        ArgumentCaptor<NotificationCreateRequest> captor = ArgumentCaptor.forClass(NotificationCreateRequest.class);
        verify(notificationService).create(captor.capture());

        NotificationCreateRequest request = captor.getValue();
        assertThat(request.userId()).isEqualTo(3L);
        assertThat(request.type()).isEqualTo("담당자배정");
        assertThat(request.refType()).isEqualTo("WORK_REQUEST");
    }

    @Test
    @DisplayName("사용자 환경설정이 없으면 기존 동작대로 알림을 생성한다")
    void createNotificationWhenPreferenceMissing() {
        when(userPreferenceRepository.findById(7L)).thenReturn(Optional.empty());

        notificationEventService.create(
                7L,
                "상태변경",
                "업무요청 상태 변경",
                "WR-001 상태가 변경되었습니다.",
                "WORK_REQUEST",
                1L
        );

        verify(notificationService).create(org.mockito.ArgumentMatchers.any(NotificationCreateRequest.class));
    }
}
