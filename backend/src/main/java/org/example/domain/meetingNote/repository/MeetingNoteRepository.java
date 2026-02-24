package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingNote;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, Long> {
}
