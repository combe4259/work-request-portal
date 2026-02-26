package org.example.domain.idea.mapper;

import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.entity.ProjectIdea;

import java.util.List;

public final class ProjectIdeaMapper {

    private ProjectIdeaMapper() {
    }

    public static ProjectIdea fromCreateRequest(ProjectIdeaCreateRequest request, String benefitsJson) {
        ProjectIdea entity = new ProjectIdea();
        entity.setTitle(request.title());
        entity.setContent(request.content());
        entity.setBenefits(benefitsJson);
        entity.setCategory(request.category());
        entity.setStatus(request.status());
        entity.setStatusNote(request.statusNote());
        entity.setTeamId(request.teamId());
        entity.setProposedBy(request.proposedBy());
        return entity;
    }

    public static void applyUpdate(ProjectIdea entity, ProjectIdeaUpdateRequest request, String benefitsJson) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.content() != null) {
            entity.setContent(request.content());
        }
        if (benefitsJson != null) {
            entity.setBenefits(benefitsJson);
        }
        if (request.category() != null) {
            entity.setCategory(request.category());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.statusNote() != null) {
            entity.setStatusNote(request.statusNote());
        }
    }

    public static ProjectIdeaListResponse toListResponse(
            ProjectIdea entity,
            long likeCount,
            boolean likedByMe,
            long commentCount
    ) {
        return new ProjectIdeaListResponse(
                entity.getId(),
                entity.getIdeaNo(),
                entity.getTitle(),
                entity.getContent(),
                entity.getCategory(),
                entity.getStatus(),
                entity.getProposedBy(),
                likeCount,
                likedByMe,
                commentCount,
                entity.getCreatedAt()
        );
    }

    public static ProjectIdeaDetailResponse toDetailResponse(
            ProjectIdea entity,
            List<String> benefits,
            long likeCount,
            boolean likedByMe
    ) {
        return new ProjectIdeaDetailResponse(
                entity.getId(),
                entity.getIdeaNo(),
                entity.getTeamId(),
                entity.getTitle(),
                entity.getContent(),
                benefits,
                entity.getCategory(),
                entity.getStatus(),
                entity.getStatusNote(),
                entity.getProposedBy(),
                likeCount,
                likedByMe,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
