package org.example.domain.meetingNote.service;

import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface MeetingNoteService {
    Page<MeetingNoteListResponse> findPage(int page, int size);

    MeetingNoteDetailResponse findById(Long id);

    Long create(MeetingNoteCreateRequest request);

    void update(Long id, MeetingNoteUpdateRequest request);

    void delete(Long id);

    List<MeetingActionItemResponse> getActionItems(Long id);

    List<Long> getAttendeeIds(Long id);

    List<MeetingNoteRelatedRefResponse> getRelatedRefs(Long id);

    void updateActionItemStatus(Long id, Long itemId, MeetingActionItemStatusUpdateRequest request);
}
