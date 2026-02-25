package org.example.domain.resource.mapper;

import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceDetailResponse;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.example.domain.resource.entity.SharedResource;

public final class SharedResourceMapper {

    private SharedResourceMapper() {
    }

    public static SharedResource fromCreateRequest(SharedResourceCreateRequest request) {
        SharedResource entity = new SharedResource();
        entity.setTitle(request.title());
        entity.setUrl(request.url());
        entity.setCategory(request.category());
        entity.setDescription(request.description());
        entity.setTeamId(request.teamId());
        entity.setRegisteredBy(request.registeredBy());
        return entity;
    }

    public static void applyUpdate(SharedResource entity, SharedResourceUpdateRequest request) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.url() != null) {
            entity.setUrl(request.url());
        }
        if (request.category() != null) {
            entity.setCategory(request.category());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
    }

    public static SharedResourceListResponse toListResponse(SharedResource entity) {
        return new SharedResourceListResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getUrl(),
                entity.getCategory(),
                entity.getDescription(),
                entity.getRegisteredBy(),
                entity.getCreatedAt()
        );
    }

    public static SharedResourceDetailResponse toDetailResponse(SharedResource entity) {
        return new SharedResourceDetailResponse(
                entity.getId(),
                entity.getTeamId(),
                entity.getTitle(),
                entity.getUrl(),
                entity.getCategory(),
                entity.getDescription(),
                entity.getRegisteredBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
