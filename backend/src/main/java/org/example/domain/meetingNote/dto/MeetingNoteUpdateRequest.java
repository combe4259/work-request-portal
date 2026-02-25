package org.example.domain.meetingNote.dto;

import java.time.LocalDate;
import java.util.List;

public record MeetingNoteUpdateRequest(
        String title,
        LocalDate meetingDate,
        String location,
        Long facilitatorId,
        List<String> agenda,
        String content,
        List<String> decisions,
        List<Long> attendeeIds,
        List<MeetingActionItemItemRequest> actionItems,
        List<MeetingNoteRelatedRefItemRequest> relatedRefs
) {
}
