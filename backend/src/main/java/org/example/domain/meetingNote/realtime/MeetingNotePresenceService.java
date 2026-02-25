package org.example.domain.meetingNote.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MeetingNotePresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<Long, Map<String, PresenceEntry>> editorsByMeetingNoteId = new ConcurrentHashMap<>();
    private final Map<String, LinkedHashSet<SessionEditorRef>> sessionIndex = new ConcurrentHashMap<>();

    public MeetingNotePresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void join(Long meetingNoteId, String sessionId, MeetingNotePresenceMessage message) {
        if (meetingNoteId == null || isBlank(sessionId) || message == null || isBlank(message.clientId())) {
            return;
        }

        String userName = isBlank(message.userName()) ? "익명" : message.userName().trim();
        PresenceEntry entry = new PresenceEntry(message.clientId().trim(), userName, sessionId);

        editorsByMeetingNoteId
                .computeIfAbsent(meetingNoteId, ignored -> new ConcurrentHashMap<>())
                .put(entry.clientId(), entry);

        sessionIndex.computeIfAbsent(sessionId, ignored -> new LinkedHashSet<>())
                .add(new SessionEditorRef(meetingNoteId, entry.clientId()));

        broadcastSnapshot(meetingNoteId);
    }

    public void leave(Long meetingNoteId, String sessionId, MeetingNotePresenceMessage message) {
        if (meetingNoteId == null || isBlank(sessionId) || message == null || isBlank(message.clientId())) {
            return;
        }

        removeEditor(meetingNoteId, sessionId, message.clientId().trim());
        broadcastSnapshot(meetingNoteId);
    }

    public void disconnect(String sessionId) {
        if (isBlank(sessionId)) {
            return;
        }

        LinkedHashSet<SessionEditorRef> refs = sessionIndex.remove(sessionId);
        if (refs == null || refs.isEmpty()) {
            return;
        }

        LinkedHashSet<Long> touchedMeetingNotes = new LinkedHashSet<>();
        for (SessionEditorRef ref : refs) {
            removeEditor(ref.meetingNoteId(), sessionId, ref.clientId());
            touchedMeetingNotes.add(ref.meetingNoteId());
        }

        for (Long meetingNoteId : touchedMeetingNotes) {
            broadcastSnapshot(meetingNoteId);
        }
    }

    private void removeEditor(Long meetingNoteId, String sessionId, String clientId) {
        Map<String, PresenceEntry> noteEditors = editorsByMeetingNoteId.get(meetingNoteId);
        if (noteEditors == null) {
            return;
        }

        PresenceEntry existing = noteEditors.get(clientId);
        if (existing == null || !sessionId.equals(existing.sessionId())) {
            return;
        }

        noteEditors.remove(clientId);
        if (noteEditors.isEmpty()) {
            editorsByMeetingNoteId.remove(meetingNoteId);
        }

        LinkedHashSet<SessionEditorRef> refs = sessionIndex.get(sessionId);
        if (refs != null) {
            refs.remove(new SessionEditorRef(meetingNoteId, clientId));
            if (refs.isEmpty()) {
                sessionIndex.remove(sessionId);
            }
        }
    }

    private void broadcastSnapshot(Long meetingNoteId) {
        Map<String, PresenceEntry> noteEditors = editorsByMeetingNoteId.get(meetingNoteId);
        List<MeetingNotePresenceSnapshotMessage.MeetingNotePresenceUser> editors = new ArrayList<>();

        if (noteEditors != null) {
            List<PresenceEntry> sorted = new ArrayList<>(new LinkedHashMap<>(noteEditors).values());
            sorted.sort((a, b) -> a.userName().compareToIgnoreCase(b.userName()));
            for (PresenceEntry entry : sorted) {
                editors.add(new MeetingNotePresenceSnapshotMessage.MeetingNotePresenceUser(
                        entry.clientId(),
                        entry.userName()
                ));
            }
        }

        messagingTemplate.convertAndSend(
                "/topic/meeting-notes/" + meetingNoteId + "/presence",
                new MeetingNotePresenceSnapshotMessage("snapshot", editors)
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record PresenceEntry(
            String clientId,
            String userName,
            String sessionId
    ) {
    }

    private record SessionEditorRef(
            Long meetingNoteId,
            String clientId
    ) {
    }
}
