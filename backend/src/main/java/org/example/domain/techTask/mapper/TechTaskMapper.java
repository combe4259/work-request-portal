package org.example.domain.techTask.mapper;

import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.example.domain.techTask.entity.TechTask;

public final class TechTaskMapper {

    private TechTaskMapper() {
    }

    public static TechTask fromCreateRequest(TechTaskCreateRequest request) {
        TechTask entity = new TechTask();
        entity.setTitle(request.title());
        entity.setCurrentIssue(request.currentIssue());
        entity.setSolution(request.solution());
        entity.setDefinitionOfDone(request.definitionOfDone());
        entity.setType(request.type());
        entity.setPriority(request.priority());
        entity.setStatus(request.status());
        entity.setTeamId(request.teamId());
        entity.setRegistrantId(request.registrantId());
        entity.setAssigneeId(request.assigneeId());
        entity.setDeadline(request.deadline());
        return entity;
    }

    public static void applyUpdate(TechTask entity, TechTaskUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.currentIssue() != null) {
            entity.setCurrentIssue(request.currentIssue());
        }
        if (request.solution() != null) {
            entity.setSolution(request.solution());
        }
        if (request.definitionOfDone() != null) {
            entity.setDefinitionOfDone(request.definitionOfDone());
        }
        if (request.type() != null) {
            entity.setType(request.type());
        }
        if (request.priority() != null) {
            entity.setPriority(request.priority());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.assigneeId() != null) {
            entity.setAssigneeId(request.assigneeId());
        }
        if (request.deadline() != null) {
            entity.setDeadline(request.deadline());
        }
        if (request.startedAt() != null) {
            entity.setStartedAt(request.startedAt());
        }
        if (request.completedAt() != null) {
            entity.setCompletedAt(request.completedAt());
        }
        if (request.rejectedReason() != null) {
            entity.setRejectedReason(request.rejectedReason());
        }
        if (request.rejectedAt() != null) {
            entity.setRejectedAt(request.rejectedAt());
        }
    }

    public static TechTaskListResponse toListResponse(TechTask entity) {
        return new TechTaskListResponse(
                entity.getId(),
                entity.getTaskNo(),
                entity.getTitle(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getAssigneeId(),
                entity.getDeadline(),
                entity.getCreatedAt()
        );
    }

    public static TechTaskDetailResponse toDetailResponse(TechTask entity) {
        return new TechTaskDetailResponse(
                entity.getId(),
                entity.getTaskNo(),
                entity.getTitle(),
                entity.getCurrentIssue(),
                entity.getSolution(),
                entity.getDefinitionOfDone(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getTeamId(),
                entity.getRegistrantId(),
                entity.getAssigneeId(),
                entity.getDeadline(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getRejectedReason(),
                entity.getRejectedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
