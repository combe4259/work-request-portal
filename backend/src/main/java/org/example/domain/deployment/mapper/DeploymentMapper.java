package org.example.domain.deployment.mapper;

import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
import org.example.domain.deployment.dto.DeploymentListResponse;
import org.example.domain.deployment.dto.DeploymentUpdateRequest;
import org.example.domain.deployment.entity.Deployment;

public final class DeploymentMapper {

    private DeploymentMapper() {
    }

    public static Deployment fromCreateRequest(DeploymentCreateRequest request) {
        Deployment entity = new Deployment();
        entity.setTitle(request.title());
        entity.setOverview(request.overview());
        entity.setRollbackPlan(request.rollbackPlan());
        entity.setVersion(request.version());
        entity.setType(request.type());
        entity.setEnvironment(request.environment());
        entity.setStatus(request.status());
        entity.setTeamId(request.teamId());
        entity.setManagerId(request.managerId());
        entity.setScheduledAt(request.scheduledAt());
        entity.setStartedAt(request.startedAt());
        entity.setCompletedAt(request.completedAt());
        entity.setFailedAt(request.failedAt());
        entity.setRolledBackAt(request.rolledBackAt());
        entity.setStatusNote(request.statusNote());
        entity.setDeployedAt(request.deployedAt());
        return entity;
    }

    public static void applyUpdate(Deployment entity, DeploymentUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.overview() != null) {
            entity.setOverview(request.overview());
        }
        if (request.rollbackPlan() != null) {
            entity.setRollbackPlan(request.rollbackPlan());
        }
        if (request.version() != null) {
            entity.setVersion(request.version());
        }
        if (request.type() != null) {
            entity.setType(request.type());
        }
        if (request.environment() != null) {
            entity.setEnvironment(request.environment());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.managerId() != null) {
            entity.setManagerId(request.managerId());
        }
        if (request.scheduledAt() != null) {
            entity.setScheduledAt(request.scheduledAt());
        }
        if (request.startedAt() != null) {
            entity.setStartedAt(request.startedAt());
        }
        if (request.completedAt() != null) {
            entity.setCompletedAt(request.completedAt());
        }
        if (request.failedAt() != null) {
            entity.setFailedAt(request.failedAt());
        }
        if (request.rolledBackAt() != null) {
            entity.setRolledBackAt(request.rolledBackAt());
        }
        if (request.statusNote() != null) {
            entity.setStatusNote(request.statusNote());
        }
        if (request.deployedAt() != null) {
            entity.setDeployedAt(request.deployedAt());
        }
    }

    public static DeploymentListResponse toListResponse(Deployment entity) {
        return new DeploymentListResponse(
                entity.getId(),
                entity.getDeployNo(),
                entity.getTitle(),
                entity.getVersion(),
                entity.getType(),
                entity.getEnvironment(),
                entity.getStatus(),
                entity.getManagerId(),
                entity.getScheduledAt(),
                entity.getCreatedAt()
        );
    }

    public static DeploymentDetailResponse toDetailResponse(Deployment entity) {
        return new DeploymentDetailResponse(
                entity.getId(),
                entity.getDeployNo(),
                entity.getTitle(),
                entity.getOverview(),
                entity.getRollbackPlan(),
                entity.getVersion(),
                entity.getType(),
                entity.getEnvironment(),
                entity.getStatus(),
                entity.getTeamId(),
                entity.getManagerId(),
                entity.getScheduledAt(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getFailedAt(),
                entity.getRolledBackAt(),
                entity.getStatusNote(),
                entity.getDeployedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
