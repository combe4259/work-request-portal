package org.example.domain.flow.realtime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FlowUiRealtimeServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private FlowUiRealtimeService flowUiRealtimeService;

    @Test
    @DisplayName("flow-ui 갱신 이벤트는 워크플로우 토픽으로 브로드캐스트된다")
    void publishUpdated() {
        flowUiRealtimeService.publishUpdated(15L, 2L);

        ArgumentCaptor<FlowUiSyncMessage> messageCaptor = ArgumentCaptor.forClass(FlowUiSyncMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/work-requests/15/flow-ui"), messageCaptor.capture());

        FlowUiSyncMessage message = messageCaptor.getValue();
        assertThat(message.workRequestId()).isEqualTo(15L);
        assertThat(message.actorUserId()).isEqualTo(2L);
        assertThat(message.syncedAtEpochMs()).isPositive();
    }
}
