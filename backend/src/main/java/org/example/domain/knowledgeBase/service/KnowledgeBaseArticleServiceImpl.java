package org.example.domain.knowledgeBase.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseRelatedRef;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefItemRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefsUpdateRequest;
import org.example.domain.knowledgeBase.mapper.KnowledgeBaseArticleMapper;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseRelatedRefRepository;
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

@Service
@Transactional(readOnly = true)
public class KnowledgeBaseArticleServiceImpl implements KnowledgeBaseArticleService {

    private final KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;
    private final KnowledgeBaseRelatedRefRepository knowledgeBaseRelatedRefRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final ObjectMapper objectMapper;
    private final DocumentIndexSyncService documentIndexSyncService;

    public KnowledgeBaseArticleServiceImpl(
            KnowledgeBaseArticleRepository knowledgeBaseArticleRepository,
            KnowledgeBaseRelatedRefRepository knowledgeBaseRelatedRefRepository,
            DocumentNoGenerator documentNoGenerator,
            ObjectMapper objectMapper,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.knowledgeBaseArticleRepository = knowledgeBaseArticleRepository;
        this.knowledgeBaseRelatedRefRepository = knowledgeBaseRelatedRefRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.objectMapper = objectMapper;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<KnowledgeBaseArticleListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? knowledgeBaseArticleRepository.findAll(pageable)
                : knowledgeBaseArticleRepository.findByTeamId(teamId, pageable))
                .map(entity -> KnowledgeBaseArticleMapper.toListResponse(entity, fromJsonList(entity.getTags())));
    }

    @Override
    public KnowledgeBaseArticleDetailResponse findById(Long id) {
        KnowledgeBaseArticle entity = getArticleOrThrow(id);
        return KnowledgeBaseArticleMapper.toDetailResponse(entity, fromJsonList(entity.getTags()));
    }

    @Override
    @Transactional
    public Long create(KnowledgeBaseArticleCreateRequest request) {
        validateCreateRequest(request);

        String tagsJson = toJsonList(request.tags());
        KnowledgeBaseArticle entity = KnowledgeBaseArticleMapper.fromCreateRequest(request, tagsJson);

        entity.setArticleNo(documentNoGenerator.next("KB"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setCategory(normalizeCategory(request.category()));
        entity.setTitle(request.title().trim());
        entity.setSummary(request.summary().trim());
        entity.setContent(request.content().trim());
        entity.setViewCount(0);

        KnowledgeBaseArticle saved = knowledgeBaseArticleRepository.save(entity);
        syncDocumentIndex(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, KnowledgeBaseArticleUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        KnowledgeBaseArticle entity = getArticleOrThrow(id);

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.summary() != null && request.summary().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "summary는 필수입니다.");
        }
        if (request.content() != null && request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }

        String tagsJson = request.tags() == null ? null : toJsonList(request.tags());
        KnowledgeBaseArticleMapper.applyUpdate(entity, request, tagsJson);

        if (request.category() != null) {
            entity.setCategory(normalizeCategory(request.category()));
        }
        if (request.title() != null) {
            entity.setTitle(request.title().trim());
        }
        if (request.summary() != null) {
            entity.setSummary(request.summary().trim());
        }
        if (request.content() != null) {
            entity.setContent(request.content().trim());
        }
        syncDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        KnowledgeBaseArticle entity = getArticleOrThrow(id);

        knowledgeBaseRelatedRefRepository.deleteByArticleId(id);
        knowledgeBaseArticleRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void increaseViewCount(Long id) {
        KnowledgeBaseArticle entity = getArticleOrThrow(id);
        int current = entity.getViewCount() == null ? 0 : entity.getViewCount();
        entity.setViewCount(current + 1);
    }

    @Override
    public List<KnowledgeBaseRelatedRefResponse> getRelatedRefs(Long id) {
        getArticleOrThrow(id);
        return knowledgeBaseRelatedRefRepository.findByArticleIdOrderBySortOrderAscIdAsc(id).stream()
                .map(ref -> new KnowledgeBaseRelatedRefResponse(
                        ref.getRefType(),
                        ref.getRefId(),
                        toFallbackRefNo(ref.getRefType(), ref.getRefId()),
                        null
                ))
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, KnowledgeBaseRelatedRefsUpdateRequest request) {
        getArticleOrThrow(id);
        knowledgeBaseRelatedRefRepository.deleteByArticleId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<KnowledgeBaseRelatedRefItemRequest> sortedItems = request.items().stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<KnowledgeBaseRelatedRef> rows = new ArrayList<>();
        int defaultSortOrder = 1;
        for (KnowledgeBaseRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || item.refType() == null || item.refType().isBlank()) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            KnowledgeBaseRelatedRef row = new KnowledgeBaseRelatedRef();
            row.setArticleId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            row.setSortOrder(item.sortOrder() == null ? defaultSortOrder : item.sortOrder());
            rows.add(row);
            defaultSortOrder++;
        }

        if (!rows.isEmpty()) {
            knowledgeBaseRelatedRefRepository.saveAll(rows);
        }
    }

    private KnowledgeBaseArticle getArticleOrThrow(Long id) {
        KnowledgeBaseArticle article = knowledgeBaseArticleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "지식 베이스 문서를 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(article.getTeamId());
        return article;
    }

    private void validateCreateRequest(KnowledgeBaseArticleCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.authorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "authorId는 필수입니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.summary() == null || request.summary().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "summary는 필수입니다.");
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }
    }

    private String normalizeCategory(String rawCategory) {
        String category = rawCategory == null ? "" : rawCategory.trim();
        if (category.isEmpty()) {
            return "기타";
        }

        return switch (category) {
            case "개발 가이드", "아키텍처", "트러블슈팅", "온보딩", "기타" -> category;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 category입니다.");
        };
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT", "MEETING_NOTE", "PROJECT_IDEA" ->
                    value;
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
            case "PROJECT_IDEA" -> "ID";
            default -> "REF";
        };
        return prefix + "-" + refId;
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
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "저장된 JSON 데이터 파싱에 실패했습니다.");
        }
    }

    private void syncDocumentIndex(KnowledgeBaseArticle entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                "KNOWLEDGE_BASE",
                entity.getId(),
                entity.getTeamId(),
                entity.getArticleNo(),
                entity.getTitle(),
                null
        );
    }

    private void deleteDocumentIndex(KnowledgeBaseArticle entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                "KNOWLEDGE_BASE",
                entity.getId(),
                entity.getTeamId()
        );
    }
}
