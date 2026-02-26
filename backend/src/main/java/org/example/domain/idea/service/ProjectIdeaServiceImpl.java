package org.example.domain.idea.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.comment.repository.CommentRepository;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListQuery;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaRelatedRefItemRequest;
import org.example.domain.idea.dto.ProjectIdeaRelatedRefResponse;
import org.example.domain.idea.dto.ProjectIdeaRelatedRefsUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.example.domain.idea.entity.IdeaVote;
import org.example.domain.idea.entity.ProjectIdea;
import org.example.domain.idea.entity.ProjectIdeaRelatedRef;
import org.example.domain.idea.mapper.ProjectIdeaMapper;
import org.example.domain.idea.repository.IdeaVoteRepository;
import org.example.domain.idea.repository.ProjectIdeaRelatedRefRepository;
import org.example.domain.idea.repository.ProjectIdeaRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.global.security.JwtTokenProvider;
import org.example.global.team.TeamRequestContext;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProjectIdeaServiceImpl implements ProjectIdeaService {

    private static final String REF_TYPE_PROJECT_IDEA = "PROJECT_IDEA";

    private final ProjectIdeaRepository projectIdeaRepository;
    private final ProjectIdeaRelatedRefRepository projectIdeaRelatedRefRepository;
    private final CommentRepository commentRepository;
    private final IdeaVoteRepository ideaVoteRepository;
    private final PortalUserRepository portalUserRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final DocumentNoGenerator documentNoGenerator;
    private final ObjectMapper objectMapper;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;

    public ProjectIdeaServiceImpl(
            ProjectIdeaRepository projectIdeaRepository,
            ProjectIdeaRelatedRefRepository projectIdeaRelatedRefRepository,
            CommentRepository commentRepository,
            IdeaVoteRepository ideaVoteRepository,
            PortalUserRepository portalUserRepository,
            JwtTokenProvider jwtTokenProvider,
            DocumentNoGenerator documentNoGenerator,
            ObjectMapper objectMapper,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.projectIdeaRepository = projectIdeaRepository;
        this.projectIdeaRelatedRefRepository = projectIdeaRelatedRefRepository;
        this.commentRepository = commentRepository;
        this.ideaVoteRepository = ideaVoteRepository;
        this.portalUserRepository = portalUserRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.documentNoGenerator = documentNoGenerator;
        this.objectMapper = objectMapper;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<ProjectIdeaListResponse> findPage(int page, int size, ProjectIdeaListQuery query) {
        Long teamId = TeamScopeUtil.currentTeamId();
        Long currentUserId = TeamRequestContext.getCurrentUserId();
        String keyword = normalizeNullable(query == null ? null : query.q());
        String category = normalizeNullable(query == null ? null : query.category());
        String status = normalizeNullable(query == null ? null : query.status());
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());
        Sort.Direction direction = "asc".equalsIgnoreCase(requestedSortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;

        Page<ProjectIdea> pageResult = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "likes", "likecount" -> {
                PageRequest pageable = PageRequest.of(page, size);
                if (direction == Sort.Direction.ASC) {
                    yield projectIdeaRepository.searchOrderByLikeCountAsc(teamId, keyword, category, status, pageable);
                }
                yield projectIdeaRepository.searchOrderByLikeCountDesc(teamId, keyword, category, status, pageable);
            }
            default -> {
                String sortBy = resolveSortBy(requestedSortBy);
                Sort sort = Sort.by(direction, sortBy).and(Sort.by(Sort.Direction.DESC, "id"));
                PageRequest pageable = PageRequest.of(page, size, sort);
                yield projectIdeaRepository.search(teamId, keyword, category, status, pageable);
            }
        };

        Map<Long, Long> commentCountByIdeaId = loadCommentCounts(
                pageResult.getContent().stream().map(ProjectIdea::getId).toList()
        );

        return pageResult
                .map(entity -> {
                    long likeCount = ideaVoteRepository.countByIdeaId(entity.getId());
                    boolean likedByMe = isLikedByMe(entity.getId(), currentUserId);
                    long commentCount = commentCountByIdeaId.getOrDefault(entity.getId(), 0L);
                    return ProjectIdeaMapper.toListResponse(entity, likeCount, likedByMe, commentCount);
                });
    }

    @Override
    public ProjectIdeaDetailResponse findById(Long id) {
        ProjectIdea entity = getIdeaOrThrow(id);
        Long currentUserId = TeamRequestContext.getCurrentUserId();
        long likeCount = ideaVoteRepository.countByIdeaId(id);
        boolean likedByMe = isLikedByMe(entity.getId(), currentUserId);
        return ProjectIdeaMapper.toDetailResponse(entity, fromJsonList(entity.getBenefits()), likeCount, likedByMe);
    }

    @Override
    @Transactional
    public Long create(ProjectIdeaCreateRequest request) {
        validateCreateRequest(request);

        String benefitsJson = toJsonList(request.benefits());

        ProjectIdea entity = ProjectIdeaMapper.fromCreateRequest(request, benefitsJson);
        entity.setIdeaNo(documentNoGenerator.next("ID"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setCategory(normalizeCategory(request.category()));
        entity.setStatus(normalizeStatus(defaultIfBlank(request.status(), "제안됨")));
        entity.setStatusNote(normalizeNullable(request.statusNote()));
        entity.setContent(request.content().trim());

        ProjectIdea saved = projectIdeaRepository.save(entity);
        syncDocumentIndex(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, ProjectIdeaUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        ProjectIdea entity = getIdeaOrThrow(id);
        String previousStatus = entity.getStatus();

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
        syncDocumentIndex(entity);

        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ProjectIdea entity = getIdeaOrThrow(id);

        projectIdeaRelatedRefRepository.deleteByProjectIdeaId(id);
        ideaVoteRepository.deleteByIdeaId(id);
        projectIdeaRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, ProjectIdeaStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        ProjectIdea entity = getIdeaOrThrow(id);
        String previousStatus = entity.getStatus();
        entity.setStatus(normalizeStatus(request.status()));
        entity.setStatusNote(normalizeNullable(request.statusNote()));
        syncDocumentIndex(entity);

        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    public List<ProjectIdeaRelatedRefResponse> getRelatedRefs(Long id) {
        getIdeaOrThrow(id);
        return projectIdeaRelatedRefRepository.findByProjectIdeaIdOrderBySortOrderAscIdAsc(id).stream()
                .map(ref -> new ProjectIdeaRelatedRefResponse(
                        ref.getRefType(),
                        ref.getRefId(),
                        toFallbackRefNo(ref.getRefType(), ref.getRefId()),
                        null
                ))
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, ProjectIdeaRelatedRefsUpdateRequest request) {
        getIdeaOrThrow(id);
        projectIdeaRelatedRefRepository.deleteByProjectIdeaId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<ProjectIdeaRelatedRefItemRequest> sortedItems = request.items().stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<ProjectIdeaRelatedRef> rows = new ArrayList<>();
        int defaultSortOrder = 1;
        for (ProjectIdeaRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            ProjectIdeaRelatedRef row = new ProjectIdeaRelatedRef();
            row.setProjectIdeaId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            row.setSortOrder(item.sortOrder() == null ? defaultSortOrder : item.sortOrder());
            rows.add(row);
            defaultSortOrder++;
        }

        if (!rows.isEmpty()) {
            projectIdeaRelatedRefRepository.saveAll(rows);
        }
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
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.proposedBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "proposedBy는 필수입니다.");
        }
    }

    private ProjectIdea getIdeaOrThrow(Long id) {
        ProjectIdea idea = projectIdeaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이디어를 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(idea.getTeamId());
        return idea;
    }

    private String resolveSortBy(String rawSortBy) {
        String sortBy = rawSortBy == null ? "" : rawSortBy.toLowerCase(Locale.ROOT);
        return switch (sortBy) {
            case "docno", "ideano" -> "ideaNo";
            case "title" -> "title";
            case "category" -> "category";
            case "status" -> "status";
            case "id" -> "id";
            case "createdat", "latest", "" -> "createdAt";
            default -> "createdAt";
        };
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

    private String normalizeRefType(String rawRefType) {
        String refType = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (refType) {
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT", "MEETING_NOTE", "KNOWLEDGE_BASE" ->
                    refType;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case "WORK_REQUEST" -> "WR";
            case "TECH_TASK" -> "TK";
            case "TEST_SCENARIO" -> "TS";
            case "DEFECT" -> "DF";
            case "DEPLOYMENT" -> "DP";
            case "MEETING_NOTE" -> "MN";
            case "KNOWLEDGE_BASE" -> "KB";
            default -> "REF";
        };
        return prefix + "-" + refId;
    }

    private boolean isLikedByMe(Long ideaId, Long currentUserId) {
        if (currentUserId == null) {
            return false;
        }
        return ideaVoteRepository.existsByIdeaIdAndUserId(ideaId, currentUserId);
    }

    private Map<Long, Long> loadCommentCounts(List<Long> ideaIds) {
        if (commentRepository == null || ideaIds == null || ideaIds.isEmpty()) {
            return Map.of();
        }

        return commentRepository.countByRefTypeAndRefIds(REF_TYPE_PROJECT_IDEA, ideaIds).stream()
                .collect(Collectors.toMap(
                        CommentRepository.CommentCountProjection::getRefId,
                        CommentRepository.CommentCountProjection::getCommentCount
                ));
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

    private void notifyStatusChanged(ProjectIdea entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        String type = "채택".equals(currentStatus) ? "아이디어채택" : "상태변경";
        String title = "채택".equals(currentStatus) ? "아이디어 채택" : "아이디어 상태 변경";

        notificationEventService.create(
                entity.getProposedBy(),
                type,
                title,
                entity.getIdeaNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                REF_TYPE_PROJECT_IDEA,
                entity.getId()
        );
    }

    private void syncDocumentIndex(ProjectIdea entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_PROJECT_IDEA,
                entity.getId(),
                entity.getTeamId(),
                entity.getIdeaNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(ProjectIdea entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                REF_TYPE_PROJECT_IDEA,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
