package org.example.domain.meetingNote.realtime;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class MeetingNotePresenceEventListener {

    private final MeetingNotePresenceService presenceService;

    public MeetingNotePresenceEventListener(MeetingNotePresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void onSessionDisconnect(SessionDisconnectEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        presenceService.disconnect(sessionId);
    }
}
