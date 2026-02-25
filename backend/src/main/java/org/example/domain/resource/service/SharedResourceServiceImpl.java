package org.example.domain.resource.service;

import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceDetailResponse;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.example.domain.resource.entity.SharedResource;
import org.example.domain.resource.mapper.SharedResourceMapper;
import org.example.domain.resource.repository.SharedResourceRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class SharedResourceServiceImpl implements SharedResourceService {

    private final SharedResourceRepository sharedResourceRepository;

    public SharedResourceServiceImpl(SharedResourceRepository sharedResourceRepository) {
        this.sharedResourceRepository = sharedResourceRepository;
    }

    @Override
    public Page<SharedResourceListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? sharedResourceRepository.findAll(pageable)
                : sharedResourceRepository.findByTeamId(teamId, pageable))
                .map(SharedResourceMapper::toListResponse);
    }

    @Override
    public SharedResourceDetailResponse findById(Long id) {
        SharedResource entity = getResourceOrThrow(id);
        return SharedResourceMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(SharedResourceCreateRequest request) {
        validateCreateRequest(request);

        SharedResource entity = SharedResourceMapper.fromCreateRequest(request);
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setTitle(request.title().trim());
        entity.setUrl(request.url().trim());
        entity.setDescription(request.description().trim());
        entity.setCategory(normalizeCategory(request.category()));

        return sharedResourceRepository.save(entity).getId();
    }

    @Override
    @Transactional
    public void update(Long id, SharedResourceUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        SharedResource entity = getResourceOrThrow(id);

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.url() != null && request.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "url은 필수입니다.");
        }
        if (request.description() != null && request.description().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "description은 필수입니다.");
        }

        SharedResourceMapper.applyUpdate(entity, request);

        if (request.title() != null) {
            entity.setTitle(request.title().trim());
        }
        if (request.url() != null) {
            entity.setUrl(request.url().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description().trim());
        }
        if (request.category() != null) {
            entity.setCategory(normalizeCategory(request.category()));
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SharedResource entity = getResourceOrThrow(id);
        sharedResourceRepository.delete(entity);
    }

    private SharedResource getResourceOrThrow(Long id) {
        SharedResource resource = sharedResourceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "공유 리소스를 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(resource.getTeamId());
        return resource;
    }

    private void validateCreateRequest(SharedResourceCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.registeredBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "registeredBy는 필수입니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.url() == null || request.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "url은 필수입니다.");
        }
        if (request.description() == null || request.description().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "description은 필수입니다.");
        }
    }

    private String normalizeCategory(String rawCategory) {
        String category = rawCategory == null ? "" : rawCategory.trim();
        if (category.isEmpty()) {
            return "기타";
        }

        return switch (category) {
            case "Figma", "Notion", "GitHub", "Confluence", "문서", "기타" -> category;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 category입니다.");
        };
    }
}
