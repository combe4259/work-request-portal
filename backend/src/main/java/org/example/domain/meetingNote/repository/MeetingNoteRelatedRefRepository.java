package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingNoteRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingNoteRelatedRefRepository extends JpaRepository<MeetingNoteRelatedRef, Long> {
    List<MeetingNoteRelatedRef> findByMeetingNoteIdOrderBySortOrderAscIdAsc(Long meetingNoteId);

    void deleteByMeetingNoteId(Long meetingNoteId);
}
