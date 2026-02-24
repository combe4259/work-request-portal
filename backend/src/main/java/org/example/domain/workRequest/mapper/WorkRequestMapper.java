package org.example.domain.workRequest.mapper;

import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;

public final class WorkRequestMapper {

    private WorkRequestMapper() {
    }

    public static WorkRequest fromCreateRequest(WorkRequestCreateRequest request) {
        WorkRequest entity = new WorkRequest();
        entity.setTitle(request.title());
        entity.setBackground(request.background());
        entity.setDescription(request.description());
        entity.setType(request.type());
        entity.setPriority(request.priority());
        entity.setStatus(request.status());
        entity.setTeamId(request.teamId());
        entity.setRequesterId(request.requesterId());
        entity.setAssigneeId(request.assigneeId());
        entity.setDeadline(request.deadline());
        return entity;
    }

    public static void applyUpdate(WorkRequest entity, WorkRequestUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.background() != null) {
            entity.setBackground(request.background());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
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

    public static WorkRequestListResponse toListResponse(WorkRequest entity) {
        return new WorkRequestListResponse(
                entity.getId(),
                entity.getRequestNo(),
                entity.getTitle(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getAssigneeId(),
                entity.getDeadline(),
                entity.getCreatedAt()
        );
    }

    public static WorkRequestDetailResponse toDetailResponse(WorkRequest entity) {
        return new WorkRequestDetailResponse(
                entity.getId(),
                entity.getRequestNo(),
                entity.getTitle(),
                entity.getBackground(),
                entity.getDescription(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getTeamId(),
                entity.getRequesterId(),
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
