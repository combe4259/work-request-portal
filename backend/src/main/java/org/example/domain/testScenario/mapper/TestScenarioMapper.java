package org.example.domain.testScenario.mapper;

import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.entity.TestScenario;

public final class TestScenarioMapper {

    private TestScenarioMapper() {
    }

    public static TestScenario fromCreateRequest(TestScenarioCreateRequest request) {
        TestScenario entity = new TestScenario();
        entity.setTitle(request.title());
        entity.setDescription(request.description());
        entity.setType(request.type());
        entity.setPriority(request.priority());
        entity.setStatus(request.status());
        entity.setTeamId(request.teamId());
        entity.setAssigneeId(request.assigneeId());
        entity.setPrecondition(request.precondition());
        entity.setSteps(request.steps());
        entity.setExpectedResult(request.expectedResult());
        entity.setActualResult(request.actualResult());
        entity.setDeadline(request.deadline());
        entity.setExecutedAt(request.executedAt());
        entity.setStatusNote(request.statusNote());
        entity.setCreatedBy(request.createdBy());
        return entity;
    }

    public static void applyUpdate(TestScenario entity, TestScenarioUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
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
        if (request.precondition() != null) {
            entity.setPrecondition(request.precondition());
        }
        if (request.steps() != null) {
            entity.setSteps(request.steps());
        }
        if (request.expectedResult() != null) {
            entity.setExpectedResult(request.expectedResult());
        }
        if (request.actualResult() != null) {
            entity.setActualResult(request.actualResult());
        }
        if (request.deadline() != null) {
            entity.setDeadline(request.deadline());
        }
        if (request.executedAt() != null) {
            entity.setExecutedAt(request.executedAt());
        }
        if (request.statusNote() != null) {
            entity.setStatusNote(request.statusNote());
        }
    }

    public static TestScenarioListResponse toListResponse(TestScenario entity) {
        return new TestScenarioListResponse(
                entity.getId(),
                entity.getScenarioNo(),
                entity.getTitle(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getAssigneeId(),
                entity.getDeadline(),
                entity.getCreatedAt()
        );
    }

    public static TestScenarioDetailResponse toDetailResponse(TestScenario entity) {
        return new TestScenarioDetailResponse(
                entity.getId(),
                entity.getScenarioNo(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getType(),
                entity.getPriority(),
                entity.getStatus(),
                entity.getTeamId(),
                entity.getAssigneeId(),
                entity.getPrecondition(),
                entity.getSteps(),
                entity.getExpectedResult(),
                entity.getActualResult(),
                entity.getDeadline(),
                entity.getExecutedAt(),
                entity.getStatusNote(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
