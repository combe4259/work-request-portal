package org.example.domain.idea.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.example.domain.idea.entity.IdeaVote;
import org.example.domain.idea.entity.ProjectIdea;
import org.example.domain.idea.mapper.ProjectIdeaMapper;
import org.example.domain.idea.repository.IdeaVoteRepository;
import org.example.domain.idea.repository.ProjectIdeaRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.global.security.JwtTokenProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProjectIdeaServiceImpl implements ProjectIdeaService {

    private final ProjectIdeaRepository projectIdeaRepository;
    private final IdeaVoteRepository ideaVoteRepository;
    private final PortalUserRepository portalUserRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    public ProjectIdeaServiceImpl(
            ProjectIdeaRepository projectIdeaRepository,
            IdeaVoteRepository ideaVoteRepository,
            PortalUserRepository portalUserRepository,
            JwtTokenProvider jwtTokenProvider,
            ObjectMapper objectMapper
    ) {
        this.projectIdeaRepository = projectIdeaRepository;
        this.ideaVoteRepository = ideaVoteRepository;
        this.portalUserRepository = portalUserRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    public Page<ProjectIdeaListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return projectIdeaRepository.findAll(pageable)
                .map(entity -> ProjectIdeaMapper.toListResponse(entity, ideaVoteRepository.countByIdeaId(entity.getId())));
    }

    @Override
    public ProjectIdeaDetailResponse findById(Long id) {
        ProjectIdea entity = getIdeaOrThrow(id);
        long likeCount = ideaVoteRepository.countByIdeaId(id);
        return ProjectIdeaMapper.toDetailResponse(entity, fromJsonList(entity.getBenefits()), likeCount);
    }

    @Override
    @Transactional
    public Long create(ProjectIdeaCreateRequest request) {
        validateCreateRequest(request);

        String benefitsJson = toJsonList(request.benefits());

        ProjectIdea entity = ProjectIdeaMapper.fromCreateRequest(request, benefitsJson);
        entity.setIdeaNo("ID-" + System.currentTimeMillis());
        entity.setCategory(normalizeCategory(request.category()));
        entity.setStatus(normalizeStatus(defaultIfBlank(request.status(), "제안됨")));
        entity.setStatusNote(normalizeNullable(request.statusNote()));
        entity.setContent(request.content().trim());

        ProjectIdea saved = projectIdeaRepository.save(entity);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, ProjectIdeaUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        ProjectIdea entity = getIdeaOrThrow(id);

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.content() != null && request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }

        String benefitsJson = request.benefits() == null ? null : toJsonList(request.benefits());

        ProjectIdeaMapper.applyUpdate(entity, request, benefitsJson);

        if (request.category() != null) {
            entity.setCategory(normalizeCategory(request.category()));
        }
        if (request.status() != null) {
            entity.setStatus(normalizeStatus(request.status()));
        }
        if (request.statusNote() != null) {
            entity.setStatusNote(normalizeNullable(request.statusNote()));
        }
        if (request.title() != null) {
            entity.setTitle(request.title().trim());
        }
        if (request.content() != null) {
            entity.setContent(request.content().trim());
        }
    }

    @Override
    @Transactional
    public void updateStatus(Long id, ProjectIdeaStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        ProjectIdea entity = getIdeaOrThrow(id);
        entity.setStatus(normalizeStatus(request.status()));
        entity.setStatusNote(normalizeNullable(request.statusNote()));
    }

    @Override
    @Transactional
    public ProjectIdeaVoteResponse likeIdea(Long id, String authorizationHeader) {
        ProjectIdea entity = getIdeaOrThrow(id);
        Long userId = extractUserId(authorizationHeader);
        ensureActiveUser(userId);

        if (!ideaVoteRepository.existsByIdeaIdAndUserId(entity.getId(), userId)) {
            IdeaVote row = new IdeaVote();
            row.setIdeaId(entity.getId());
            row.setUserId(userId);
            ideaVoteRepository.save(row);
        }

        return new ProjectIdeaVoteResponse(true, ideaVoteRepository.countByIdeaId(entity.getId()));
    }

    @Override
    @Transactional
    public ProjectIdeaVoteResponse unlikeIdea(Long id, String authorizationHeader) {
        ProjectIdea entity = getIdeaOrThrow(id);
        Long userId = extractUserId(authorizationHeader);
        ensureActiveUser(userId);

        ideaVoteRepository.deleteByIdeaIdAndUserId(entity.getId(), userId);
        return new ProjectIdeaVoteResponse(false, ideaVoteRepository.countByIdeaId(entity.getId()));
    }

    private void validateCreateRequest(ProjectIdeaCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (isBlank(request.content())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }
        if (request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
        if (request.proposedBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "proposedBy는 필수입니다.");
        }
    }

    private ProjectIdea getIdeaOrThrow(Long id) {
        return projectIdeaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이디어를 찾을 수 없습니다."));
    }

    private String normalizeCategory(String rawCategory) {
        if (isBlank(rawCategory)) {
            return "기타";
        }
        String category = rawCategory.trim();
        return switch (category) {
            case "UX/UI", "기능", "인프라", "프로세스", "기타" -> category;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 category입니다.");
        };
    }

    private String normalizeStatus(String rawStatus) {
        String status = rawStatus == null ? "" : rawStatus.trim();
        return switch (status) {
            case "제안됨", "검토중", "채택", "보류", "기각" -> status;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 status입니다.");
        };
    }

    private String toJsonList(List<String> values) {
        List<String> normalized = values == null
                ? List.of()
                : values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .toList();

        try {
            return objectMapper.writeValueAsString(normalized);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JSON 변환 중 오류가 발생했습니다.");
        }
    }

    private List<String> fromJsonList(String value) {
        if (isBlank(value)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "저장된 JSON 데이터 파싱에 실패했습니다.");
        }
    }

    private Long extractUserId(String authorizationHeader) {
        if (isBlank(authorizationHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || isBlank(split[1])) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer 토큰 형식이 올바르지 않습니다.");
        }

        return jwtTokenProvider.extractUserId(split[1].trim());
    }

    private void ensureActiveUser(Long userId) {
        PortalUser user = portalUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 사용자입니다.");
        }
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
