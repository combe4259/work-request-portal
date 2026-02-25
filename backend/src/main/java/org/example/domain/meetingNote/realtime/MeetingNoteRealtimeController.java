package org.example.domain.meetingNote.realtime;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class MeetingNoteRealtimeController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MeetingNotePresenceService presenceService;

    public MeetingNoteRealtimeController(
            SimpMessagingTemplate messagingTemplate,
            MeetingNotePresenceService presenceService
    ) {
        this.messagingTemplate = messagingTemplate;
        this.presenceService = presenceService;
    }

    @MessageMapping("/meeting-notes/{id}/patch")
    public void patchMeetingNote(
            @DestinationVariable Long id,
            MeetingNotePatchMessage message
    ) {
        if (id == null || message == null || message.patch() == null || message.patch().isEmpty()) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/meeting-notes/" + id, message);
    }

    @MessageMapping("/meeting-notes/{id}/presence/join")
    public void joinPresence(
            @DestinationVariable Long id,
            @Header("simpSessionId") String sessionId,
            MeetingNotePresenceMessage message
    ) {
        presenceService.join(id, sessionId, message);
    }

    @MessageMapping("/meeting-notes/{id}/presence/leave")
    public void leavePresence(
            @DestinationVariable Long id,
            @Header("simpSessionId") String sessionId,
            MeetingNotePresenceMessage message
    ) {
        presenceService.leave(id, sessionId, message);
    }
}
