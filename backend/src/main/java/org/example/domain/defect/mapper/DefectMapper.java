package org.example.domain.defect.mapper;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;

import java.util.function.Consumer;

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
        setIfPresent(request.title(), entity::setTitle);
        setIfPresent(request.description(), entity::setDescription);
        setIfPresent(request.type(), entity::setType);
        setIfPresent(request.severity(), entity::setSeverity);
        setIfPresent(request.status(), entity::setStatus);
        setIfPresent(request.relatedRefType(), entity::setRelatedRefType);
        setIfPresent(request.relatedRefId(), entity::setRelatedRefId);
        setIfPresent(request.environment(), entity::setEnvironment);
        setIfPresent(request.reproductionSteps(), entity::setReproductionSteps);
        setIfPresent(request.expectedBehavior(), entity::setExpectedBehavior);
        setIfPresent(request.actualBehavior(), entity::setActualBehavior);
        setIfPresent(request.deadline(), entity::setDeadline);
        setIfPresent(request.statusNote(), entity::setStatusNote);
        setIfPresent(request.assigneeId(), entity::setAssigneeId);
        setIfPresent(request.startedAt(), entity::setStartedAt);
        setIfPresent(request.verifiedAt(), entity::setVerifiedAt);
        setIfPresent(request.resolvedAt(), entity::setResolvedAt);
    }

    private static <T> void setIfPresent(T value, Consumer<T> setter) {
        if (value != null) {
            setter.accept(value);
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
