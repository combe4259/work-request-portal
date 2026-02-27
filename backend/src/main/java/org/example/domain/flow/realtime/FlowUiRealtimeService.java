package org.example.domain.flow.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class FlowUiRealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public FlowUiRealtimeService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishUpdated(Long workRequestId, Long actorUserId) {
        messagingTemplate.convertAndSend(
                "/topic/work-requests/" + workRequestId + "/flow-ui",
                new FlowUiSyncMessage(workRequestId, actorUserId, Instant.now().toEpochMilli())
        );
    }
}
