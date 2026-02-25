package org.example.domain.documentIndex.service;

import org.example.domain.documentIndex.dto.DocumentIndexSearchItemResponse;
import org.example.domain.documentIndex.entity.DocumentIndex;
import org.example.domain.documentIndex.repository.DocumentIndexRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class DocumentIndexServiceImpl implements DocumentIndexService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_REF_TYPES = Set.of(
            "WORK_REQUEST",
            "TECH_TASK",
            "TEST_SCENARIO",
            "DEFECT",
            "DEPLOYMENT",
            "MEETING_NOTE",
            "PROJECT_IDEA",
            "KNOWLEDGE_BASE"
    );

    private final DocumentIndexRepository documentIndexRepository;

    public DocumentIndexServiceImpl(DocumentIndexRepository documentIndexRepository) {
        this.documentIndexRepository = documentIndexRepository;
    }

    @Override
    public Page<DocumentIndexSearchItemResponse> search(String query, List<String> types, Long teamId, int page, int size) {
        Long scopedTeamId = TeamScopeUtil.requireTeamId(teamId);
        List<String> normalizedTypes = normalizeTypes(types);
        String keyword = normalizeKeyword(query);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        PageRequest pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))
        );

        Specification<DocumentIndex> spec = byTeam(scopedTeamId)
                .and(byKeyword(keyword))
                .and(byTypes(normalizedTypes));

        return documentIndexRepository.findAll(spec, pageable)
                .map(item -> new DocumentIndexSearchItemResponse(
                        item.getRefType(),
                        item.getRefId(),
                        item.getDocNo(),
                        item.getTitle(),
                        item.getStatus()
                ));
    }

    private Specification<DocumentIndex> byTeam(Long teamId) {
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<DocumentIndex> byKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("docNo")), likeKeyword),
                    builder.like(builder.lower(root.get("title")), likeKeyword)
            );
        };
    }

    private Specification<DocumentIndex> byTypes(List<String> types) {
        if (types == null || types.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> root.get("refType").in(types);
    }

    private List<String> normalizeTypes(List<String> rawTypes) {
        if (rawTypes == null || rawTypes.isEmpty()) {
            return List.of();
        }

        return rawTypes.stream()
                .filter(value -> value != null && !value.isBlank())
                .flatMap(value -> List.of(value.split(",")).stream())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .distinct()
                .peek(this::validateRefType)
                .toList();
    }

    private void validateRefType(String refType) {
        if (!ALLOWED_REF_TYPES.contains(refType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 types 값입니다.");
        }
    }

    private String normalizeKeyword(String rawKeyword) {
        if (rawKeyword == null || rawKeyword.isBlank()) {
            return null;
        }
        return rawKeyword.trim();
    }
}
