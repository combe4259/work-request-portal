package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingAttendeeRepository extends JpaRepository<MeetingAttendee, Long> {
    List<MeetingAttendee> findByMeetingNoteIdOrderByIdAsc(Long meetingNoteId);

    void deleteByMeetingNoteId(Long meetingNoteId);
}
