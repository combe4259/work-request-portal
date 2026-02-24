package org.example.domain.techTask.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskPrLinkCreateRequest;
import org.example.domain.techTask.dto.TechTaskPrLinkResponse;
import org.example.domain.techTask.dto.TechTaskRelatedRefItemRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefsUpdateRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefResponse;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskPrLink;
import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.example.domain.techTask.mapper.TechTaskMapper;
import org.example.domain.techTask.repository.TechTaskPrLinkRepository;
import org.example.domain.techTask.repository.TechTaskRelatedRefRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
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
public class TechTaskServiceImpl implements TechTaskService {

    private final TechTaskRepository techTaskRepository;
    private final TechTaskRelatedRefRepository techTaskRelatedRefRepository;
    private final TechTaskPrLinkRepository techTaskPrLinkRepository;
    private final WorkRequestRepository workRequestRepository;

    public TechTaskServiceImpl(
            TechTaskRepository techTaskRepository,
            TechTaskRelatedRefRepository techTaskRelatedRefRepository,
            TechTaskPrLinkRepository techTaskPrLinkRepository,
            WorkRequestRepository workRequestRepository
    ) {
        this.techTaskRepository = techTaskRepository;
        this.techTaskRelatedRefRepository = techTaskRelatedRefRepository;
        this.techTaskPrLinkRepository = techTaskPrLinkRepository;
        this.workRequestRepository = workRequestRepository;
    }

    @Override
    public Page<TechTaskListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return techTaskRepository.findAll(pageable)
                .map(TechTaskMapper::toListResponse);
    }

    @Override
    public TechTaskDetailResponse findById(Long id) {
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
        return TechTaskMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(TechTaskCreateRequest request) {
        TechTask entity = TechTaskMapper.fromCreateRequest(request);

        // TODO: document_sequences 기반 채번으로 대체
        entity.setTaskNo("TK-" + (System.currentTimeMillis() / 1000));
        entity.setType(defaultIfBlank(request.type(), "기타"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수대기"));

        TechTask saved = techTaskRepository.save(entity);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, TechTaskUpdateRequest request) {
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));

        TechTaskMapper.applyUpdate(entity, request);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, TechTaskStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
        entity.setStatus(request.status().trim());
    }

    @Override
    public List<TechTaskRelatedRefResponse> getRelatedRefs(Long id) {
        ensureTechTaskExists(id);

        return techTaskRelatedRefRepository.findByTechTaskIdOrderByIdAsc(id).stream()
                .map(ref -> {
                    RefMetadata metadata = resolveRefMetadata(ref.getRefType(), ref.getRefId());
                    return new TechTaskRelatedRefResponse(
                            ref.getRefType(),
                            ref.getRefId(),
                            metadata.refNo(),
                            metadata.title()
                    );
                })
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, TechTaskRelatedRefsUpdateRequest request) {
        ensureTechTaskExists(id);

        techTaskRelatedRefRepository.deleteByTechTaskId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<TechTaskRelatedRefItemRequest> sortedItems = request.items().stream()
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<TechTaskRelatedRef> rows = new ArrayList<>();

        for (TechTaskRelatedRefItemRequest item : sortedItems) {
            if (item == null || item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            TechTaskRelatedRef row = new TechTaskRelatedRef();
            row.setTechTaskId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            rows.add(row);
        }

        if (!rows.isEmpty()) {
            techTaskRelatedRefRepository.saveAll(rows);
        }
    }

    @Override
    public List<TechTaskPrLinkResponse> getPrLinks(Long id) {
        ensureTechTaskExists(id);

        return techTaskPrLinkRepository.findByTechTaskIdOrderByIdAsc(id).stream()
                .map(link -> new TechTaskPrLinkResponse(
                        link.getId(),
                        link.getBranchName(),
                        link.getPrNo(),
                        link.getPrUrl()
                ))
                .toList();
    }

    @Override
    @Transactional
    public Long createPrLink(Long id, TechTaskPrLinkCreateRequest request) {
        ensureTechTaskExists(id);

        if (request == null || isBlank(request.branchName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "branchName은 필수입니다.");
        }

        TechTaskPrLink row = new TechTaskPrLink();
        row.setTechTaskId(id);
        row.setBranchName(request.branchName().trim());
        row.setPrNo(normalizeNullable(request.prNo()));
        row.setPrUrl(normalizeNullable(request.prUrl()));

        return techTaskPrLinkRepository.save(row).getId();
    }

    @Override
    @Transactional
    public void deletePrLink(Long id, Long linkId) {
        ensureTechTaskExists(id);

        TechTaskPrLink row = techTaskPrLinkRepository.findByIdAndTechTaskId(linkId, id)
                .orElseThrow(() -> new EntityNotFoundException("TechTaskPrLink not found: " + linkId));
        techTaskPrLinkRepository.delete(row);
    }

    private void ensureTechTaskExists(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id는 필수입니다.");
        }
        if (!techTaskRepository.existsById(id)) {
            throw new EntityNotFoundException("TechTask not found: " + id);
        }
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private RefMetadata resolveRefMetadata(String refType, Long refId) {
        String normalizedRefType = normalizeRefType(refType);

        if ("WORK_REQUEST".equals(normalizedRefType)) {
            WorkRequest wr = workRequestRepository.findById(refId).orElse(null);
            if (wr != null) {
                return new RefMetadata(wr.getRequestNo(), wr.getTitle());
            }
        }

        if ("TECH_TASK".equals(normalizedRefType)) {
            TechTask task = techTaskRepository.findById(refId).orElse(null);
            if (task != null) {
                return new RefMetadata(task.getTaskNo(), task.getTitle());
            }
        }

        return new RefMetadata(toFallbackRefNo(normalizedRefType, refId), null);
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case "WORK_REQUEST" -> "WR";
            case "TECH_TASK" -> "TK";
            case "TEST_SCENARIO" -> "TS";
            case "DEFECT" -> "DF";
            case "DEPLOYMENT" -> "DP";
            default -> "REF";
        };

        return prefix + "-" + refId;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (isBlank(value)) {
            return defaultValue;
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record RefMetadata(String refNo, String title) {
    }
}
