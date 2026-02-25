package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEventServiceTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationEventService notificationEventService;

    @Captor
    private ArgumentCaptor<NotificationCreateRequest> requestCaptor;

    @Test
    @DisplayName("userId가 없으면 알림을 생성하지 않는다")
    void createSkipsWhenUserIdIsNull() {
        notificationEventService.create(
                null,
                "상태변경",
                "업무요청 상태 변경",
                "WR-001 상태 변경",
                "WORK_REQUEST",
                1L
        );

        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("이벤트 생성 시 NotificationService.create를 호출한다")
    void createDelegatesToNotificationService() {
        when(notificationService.create(any(NotificationCreateRequest.class))).thenReturn(10L);

        notificationEventService.create(
                7L,
                "담당자배정",
                "기술과제 배정",
                "TK-001 배정",
                "TECH_TASK",
                100L
        );

        verify(notificationService).create(requestCaptor.capture());
        NotificationCreateRequest request = requestCaptor.getValue();
        assertThat(request.userId()).isEqualTo(7L);
        assertThat(request.type()).isEqualTo("담당자배정");
        assertThat(request.title()).isEqualTo("기술과제 배정");
        assertThat(request.message()).isEqualTo("TK-001 배정");
        assertThat(request.refType()).isEqualTo("TECH_TASK");
        assertThat(request.refId()).isEqualTo(100L);
        assertThat(request.slackSent()).isFalse();
    }

    @Test
    @DisplayName("알림 생성 실패 예외는 삼키고 흐름을 계속한다")
    void createSwallowsRuntimeException() {
        when(notificationService.create(any(NotificationCreateRequest.class)))
                .thenThrow(new IllegalStateException("downstream failed"));

        assertThatCode(() -> notificationEventService.create(
                7L,
                "상태변경",
                "배포 상태 변경",
                "DP-001 상태 변경",
                "DEPLOYMENT",
                200L
        )).doesNotThrowAnyException();
    }
}
