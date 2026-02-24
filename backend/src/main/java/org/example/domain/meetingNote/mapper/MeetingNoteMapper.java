package org.example.domain.meetingNote.mapper;

import org.example.domain.meetingNote.dto.MeetingActionItemItemRequest;
import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.entity.MeetingActionItem;
import org.example.domain.meetingNote.entity.MeetingNote;

import java.util.List;

public final class MeetingNoteMapper {

    private MeetingNoteMapper() {
    }

    public static MeetingNote fromCreateRequest(
            MeetingNoteCreateRequest request,
            String agendaJson,
            String decisionsJson,
            String normalizedContent
    ) {
        MeetingNote entity = new MeetingNote();
        entity.setTitle(request.title());
        entity.setMeetingDate(request.meetingDate());
        entity.setLocation(request.location());
        entity.setFacilitatorId(request.facilitatorId());
        entity.setAgenda(agendaJson);
        entity.setContent(normalizedContent);
        entity.setDecisions(decisionsJson);
        entity.setTeamId(request.teamId());
        entity.setCreatedBy(request.createdBy());
        return entity;
    }

    public static void applyUpdate(
            MeetingNote entity,
            MeetingNoteUpdateRequest request,
            String agendaJson,
            String decisionsJson,
            String normalizedContent
    ) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.meetingDate() != null) {
            entity.setMeetingDate(request.meetingDate());
        }
        if (request.location() != null) {
            entity.setLocation(request.location());
        }
        if (request.facilitatorId() != null) {
            entity.setFacilitatorId(request.facilitatorId());
        }
        if (agendaJson != null) {
            entity.setAgenda(agendaJson);
        }
        if (normalizedContent != null) {
            entity.setContent(normalizedContent);
        }
        if (decisionsJson != null) {
            entity.setDecisions(decisionsJson);
        }
    }

    public static MeetingNoteListResponse toListResponse(MeetingNote entity, long actionTotal, long actionDone) {
        return new MeetingNoteListResponse(
                entity.getId(),
                entity.getNoteNo(),
                entity.getTitle(),
                entity.getMeetingDate(),
                entity.getFacilitatorId(),
                actionTotal,
                actionDone,
                entity.getCreatedAt()
        );
    }

    public static MeetingNoteDetailResponse toDetailResponse(MeetingNote entity, List<String> agenda, List<String> decisions) {
        return new MeetingNoteDetailResponse(
                entity.getId(),
                entity.getNoteNo(),
                entity.getTeamId(),
                entity.getTitle(),
                entity.getMeetingDate(),
                entity.getLocation(),
                entity.getFacilitatorId(),
                agenda,
                entity.getContent(),
                decisions,
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static MeetingActionItem toActionItemEntity(Long meetingNoteId, MeetingActionItemItemRequest request, String normalizedStatus) {
        MeetingActionItem row = new MeetingActionItem();
        row.setMeetingNoteId(meetingNoteId);
        row.setContent(request.content());
        row.setAssigneeId(request.assigneeId());
        row.setDueDate(request.dueDate());
        row.setStatus(normalizedStatus);
        row.setLinkedRefType(request.linkedRefType());
        row.setLinkedRefId(request.linkedRefId());
        return row;
    }

    public static MeetingActionItemResponse toActionItemResponse(MeetingActionItem entity) {
        return new MeetingActionItemResponse(
                entity.getId(),
                entity.getContent(),
                entity.getAssigneeId(),
                entity.getDueDate(),
                entity.getStatus(),
                entity.getLinkedRefType(),
                entity.getLinkedRefId()
        );
    }
}
