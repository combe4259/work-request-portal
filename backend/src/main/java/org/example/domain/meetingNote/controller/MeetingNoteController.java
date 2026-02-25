package org.example.domain.meetingNote.controller;

import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.service.MeetingNoteService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meeting-notes")
public class MeetingNoteController {

    private final MeetingNoteService meetingNoteService;

    public MeetingNoteController(MeetingNoteService meetingNoteService) {
        this.meetingNoteService = meetingNoteService;
    }

    @GetMapping
    public Page<MeetingNoteListResponse> getMeetingNotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return meetingNoteService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public MeetingNoteDetailResponse getMeetingNote(@PathVariable Long id) {
        return meetingNoteService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createMeetingNote(@RequestBody MeetingNoteCreateRequest request) {
        Long id = meetingNoteService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateMeetingNote(
            @PathVariable Long id,
            @RequestBody MeetingNoteUpdateRequest request
    ) {
        meetingNoteService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMeetingNote(@PathVariable Long id) {
        meetingNoteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/action-items")
    public ResponseEntity<List<MeetingActionItemResponse>> getActionItems(@PathVariable Long id) {
        return ResponseEntity.ok(meetingNoteService.getActionItems(id));
    }

    @GetMapping("/{id}/attendees")
    public ResponseEntity<List<Long>> getAttendees(@PathVariable Long id) {
        return ResponseEntity.ok(meetingNoteService.getAttendeeIds(id));
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<MeetingNoteRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(meetingNoteService.getRelatedRefs(id));
    }

    @PatchMapping("/{id}/action-items/{itemId}")
    public ResponseEntity<Void> updateActionItemStatus(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestBody MeetingActionItemStatusUpdateRequest request
    ) {
        meetingNoteService.updateActionItemStatus(id, itemId, request);
        return ResponseEntity.noContent().build();
    }
}
