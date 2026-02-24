package org.example.domain.defect.mapper;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;

public final class DefectMapper {

    private DefectMapper() {
    }

    public static Defect fromCreateRequest(DefectCreateRequest request) {
        Defect entity = new Defect();
        entity.setTitle(request.title());
        entity.setDescription(request.description());
        entity.setType(request.type());
        entity.setSeverity(request.severity());
        entity.setStatus(request.status());
        entity.setTeamId(request.teamId());
        entity.setRelatedRefType(request.relatedRefType());
        entity.setRelatedRefId(request.relatedRefId());
        entity.setEnvironment(request.environment());
        entity.setReproductionSteps(request.reproductionSteps());
        entity.setExpectedBehavior(request.expectedBehavior());
        entity.setActualBehavior(request.actualBehavior());
        entity.setDeadline(request.deadline());
        entity.setStatusNote(request.statusNote());
        entity.setReporterId(request.reporterId());
        entity.setAssigneeId(request.assigneeId());
        entity.setStartedAt(request.startedAt());
        entity.setVerifiedAt(request.verifiedAt());
        entity.setResolvedAt(request.resolvedAt());
        return entity;
    }

    public static void applyUpdate(Defect entity, DefectUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.type() != null) {
            entity.setType(request.type());
        }
        if (request.severity() != null) {
            entity.setSeverity(request.severity());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.relatedRefType() != null) {
            entity.setRelatedRefType(request.relatedRefType());
        }
        if (request.relatedRefId() != null) {
            entity.setRelatedRefId(request.relatedRefId());
        }
        if (request.environment() != null) {
            entity.setEnvironment(request.environment());
        }
        if (request.reproductionSteps() != null) {
            entity.setReproductionSteps(request.reproductionSteps());
        }
        if (request.expectedBehavior() != null) {
            entity.setExpectedBehavior(request.expectedBehavior());
        }
        if (request.actualBehavior() != null) {
            entity.setActualBehavior(request.actualBehavior());
        }
        if (request.deadline() != null) {
            entity.setDeadline(request.deadline());
        }
        if (request.statusNote() != null) {
            entity.setStatusNote(request.statusNote());
        }
        if (request.assigneeId() != null) {
            entity.setAssigneeId(request.assigneeId());
        }
        if (request.startedAt() != null) {
            entity.setStartedAt(request.startedAt());
        }
        if (request.verifiedAt() != null) {
            entity.setVerifiedAt(request.verifiedAt());
        }
        if (request.resolvedAt() != null) {
            entity.setResolvedAt(request.resolvedAt());
        }
    }

    public static DefectListResponse toListResponse(Defect entity) {
        return new DefectListResponse(
                entity.getId(),
                entity.getDefectNo(),
                entity.getTitle(),
                entity.getType(),
                entity.getSeverity(),
                entity.getStatus(),
                entity.getReporterId(),
                entity.getAssigneeId(),
                entity.getRelatedRefType(),
                entity.getRelatedRefId(),
                entity.getDeadline(),
                entity.getCreatedAt()
        );
    }

    public static DefectDetailResponse toDetailResponse(Defect entity) {
        return new DefectDetailResponse(
                entity.getId(),
                entity.getDefectNo(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getType(),
                entity.getSeverity(),
                entity.getStatus(),
                entity.getTeamId(),
                entity.getRelatedRefType(),
                entity.getRelatedRefId(),
                entity.getEnvironment(),
                entity.getReproductionSteps(),
                entity.getExpectedBehavior(),
                entity.getActualBehavior(),
                entity.getDeadline(),
                entity.getStatusNote(),
                entity.getReporterId(),
                entity.getAssigneeId(),
                entity.getStartedAt(),
                entity.getVerifiedAt(),
                entity.getResolvedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
