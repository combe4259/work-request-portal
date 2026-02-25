package org.example.domain.meetingNote.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.domain.meetingNote.dto.MeetingActionItemItemRequest;
import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefItemRequest;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.entity.MeetingActionItem;
import org.example.domain.meetingNote.entity.MeetingAttendee;
import org.example.domain.meetingNote.entity.MeetingNote;
import org.example.domain.meetingNote.entity.MeetingNoteRelatedRef;
import org.example.domain.meetingNote.mapper.MeetingNoteMapper;
import org.example.domain.meetingNote.repository.MeetingActionItemRepository;
import org.example.domain.meetingNote.repository.MeetingAttendeeRepository;
import org.example.domain.meetingNote.repository.MeetingNoteRepository;
import org.example.domain.meetingNote.repository.MeetingNoteRelatedRefRepository;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
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
public class MeetingNoteServiceImpl implements MeetingNoteService {

    private static final String REF_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String REF_TYPE_TECH_TASK = "TECH_TASK";
    private static final String REF_TYPE_TEST_SCENARIO = "TEST_SCENARIO";
    private static final String REF_TYPE_DEFECT = "DEFECT";
    private static final String REF_TYPE_DEPLOYMENT = "DEPLOYMENT";
    private static final String REF_TYPE_MEETING_NOTE = "MEETING_NOTE";
    private static final String REF_TYPE_KNOWLEDGE_BASE = "KNOWLEDGE_BASE";

    private final MeetingNoteRepository meetingNoteRepository;
    private final MeetingActionItemRepository meetingActionItemRepository;
    private final MeetingAttendeeRepository meetingAttendeeRepository;
    private final MeetingNoteRelatedRefRepository meetingNoteRelatedRefRepository;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final ObjectMapper objectMapper;
    private final DocumentIndexSyncService documentIndexSyncService;

    public MeetingNoteServiceImpl(
            MeetingNoteRepository meetingNoteRepository,
            MeetingActionItemRepository meetingActionItemRepository,
            MeetingAttendeeRepository meetingAttendeeRepository,
            MeetingNoteRelatedRefRepository meetingNoteRelatedRefRepository,
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            KnowledgeBaseArticleRepository knowledgeBaseArticleRepository,
            DocumentNoGenerator documentNoGenerator,
            ObjectMapper objectMapper,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.meetingNoteRepository = meetingNoteRepository;
        this.meetingActionItemRepository = meetingActionItemRepository;
        this.meetingAttendeeRepository = meetingAttendeeRepository;
        this.meetingNoteRelatedRefRepository = meetingNoteRelatedRefRepository;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.knowledgeBaseArticleRepository = knowledgeBaseArticleRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.objectMapper = objectMapper;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<MeetingNoteListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? meetingNoteRepository.findAll(pageable)
                : meetingNoteRepository.findByTeamId(teamId, pageable))
                .map(entity -> {
                    long actionTotal = meetingActionItemRepository.countByMeetingNoteId(entity.getId());
                    long actionDone = meetingActionItemRepository.countByMeetingNoteIdAndStatus(entity.getId(), "완료");
                    return MeetingNoteMapper.toListResponse(entity, actionTotal, actionDone);
                });
    }

    @Override
    public MeetingNoteDetailResponse findById(Long id) {
        MeetingNote entity = getMeetingNoteOrThrow(id);
        List<Long> attendeeIds = meetingAttendeeRepository.findByMeetingNoteIdOrderByIdAsc(id).stream()
                .map(MeetingAttendee::getUserId)
                .toList();
        return MeetingNoteMapper.toDetailResponse(
                entity,
                attendeeIds,
                fromJsonList(entity.getAgenda()),
                fromJsonList(entity.getDecisions())
        );
    }

    @Override
    @Transactional
    public Long create(MeetingNoteCreateRequest request) {
        validateCreateRequest(request);

        String agendaJson = toJsonList(request.agenda());
        String decisionsJson = toJsonList(request.decisions());

        MeetingNote entity = MeetingNoteMapper.fromCreateRequest(
                request,
                agendaJson,
                decisionsJson,
                normalizeContent(request.content())
        );
        entity.setNoteNo(documentNoGenerator.next("MN"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setLocation(normalizeNullable(request.location()));

        MeetingNote saved = meetingNoteRepository.save(entity);
        syncDocumentIndex(saved);

        if (request.actionItems() != null) {
            persistActionItems(saved.getId(), request.actionItems());
        }
        if (request.attendeeIds() != null) {
            persistAttendees(saved.getId(), request.attendeeIds());
        }
        if (request.relatedRefs() != null) {
            persistRelatedRefs(saved.getId(), request.relatedRefs());
        }

        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, MeetingNoteUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        MeetingNote entity = meetingNoteRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        String agendaJson = request.agenda() == null ? null : toJsonList(request.agenda());
        String decisionsJson = request.decisions() == null ? null : toJsonList(request.decisions());
        String normalizedContent = request.content() == null ? null : normalizeContent(request.content());

        MeetingNoteMapper.applyUpdate(entity, request, agendaJson, decisionsJson, normalizedContent);

        if (request.location() != null) {
            entity.setLocation(normalizeNullable(request.location()));
        }

        if (request.actionItems() != null) {
            persistActionItems(id, request.actionItems());
        }
        if (request.attendeeIds() != null) {
            persistAttendees(id, request.attendeeIds());
        }
        if (request.relatedRefs() != null) {
            persistRelatedRefs(id, request.relatedRefs());
        }
        syncDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        MeetingNote entity = getMeetingNoteOrThrow(id);

        meetingActionItemRepository.deleteByMeetingNoteId(id);
        meetingAttendeeRepository.deleteByMeetingNoteId(id);
        meetingNoteRelatedRefRepository.deleteByMeetingNoteId(id);
        meetingNoteRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    public List<MeetingActionItemResponse> getActionItems(Long id) {
        ensureMeetingNoteExists(id);
        return meetingActionItemRepository.findByMeetingNoteIdOrderByIdAsc(id).stream()
                .map(MeetingNoteMapper::toActionItemResponse)
                .toList();
    }

    @Override
    public List<Long> getAttendeeIds(Long id) {
        ensureMeetingNoteExists(id);
        return meetingAttendeeRepository.findByMeetingNoteIdOrderByIdAsc(id).stream()
                .map(MeetingAttendee::getUserId)
                .toList();
    }

    @Override
    public List<MeetingNoteRelatedRefResponse> getRelatedRefs(Long id) {
        ensureMeetingNoteExists(id);

        return meetingNoteRelatedRefRepository.findByMeetingNoteIdOrderBySortOrderAscIdAsc(id).stream()
                .map(ref -> {
                    RefMetadata metadata = resolveRefMetadata(ref.getRefType(), ref.getRefId());
                    return MeetingNoteMapper.toRelatedRefResponse(ref, metadata.refNo(), metadata.title());
                })
                .toList();
    }

    @Override
    @Transactional
    public void updateActionItemStatus(Long id, Long itemId, MeetingActionItemStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        ensureMeetingNoteExists(id);

        MeetingActionItem row = meetingActionItemRepository.findByIdAndMeetingNoteId(itemId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회의 액션 아이템을 찾을 수 없습니다."));

        row.setStatus(normalizeActionStatus(request.status()));
    }

    private void validateCreateRequest(MeetingNoteCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.meetingDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "meetingDate는 필수입니다.");
        }
        if (request.facilitatorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "facilitatorId는 필수입니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.createdBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdBy는 필수입니다.");
        }
    }

    private void persistActionItems(Long meetingNoteId, List<MeetingActionItemItemRequest> items) {
        meetingActionItemRepository.deleteByMeetingNoteId(meetingNoteId);

        if (items == null || items.isEmpty()) {
            return;
        }

        List<MeetingActionItem> rows = new ArrayList<>();
        for (MeetingActionItemItemRequest item : items) {
            if (item == null) {
                continue;
            }

            if (isBlank(item.content())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actionItems.content는 필수입니다.");
            }
            if (item.assigneeId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actionItems.assigneeId는 필수입니다.");
            }
            if (item.dueDate() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actionItems.dueDate는 필수입니다.");
            }

            String normalizedStatus = normalizeActionStatus(item.status() == null ? "대기" : item.status());
            MeetingActionItem row = MeetingNoteMapper.toActionItemEntity(meetingNoteId, item, normalizedStatus);
            row.setContent(item.content().trim());
            row.setLinkedRefType(normalizeLinkedRefType(item.linkedRefType()));
            rows.add(row);
        }

        if (!rows.isEmpty()) {
            meetingActionItemRepository.saveAll(rows);
        }
    }

    private void persistAttendees(Long meetingNoteId, List<Long> attendeeIds) {
        meetingAttendeeRepository.deleteByMeetingNoteId(meetingNoteId);
        meetingAttendeeRepository.flush();

        if (attendeeIds == null || attendeeIds.isEmpty()) {
            return;
        }

        LinkedHashSet<Long> uniqueIds = attendeeIds.stream()
                .filter(userId -> userId != null && userId > 0)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        if (uniqueIds.isEmpty()) {
            return;
        }

        for (Long userId : uniqueIds) {
            meetingAttendeeRepository.insertIgnore(meetingNoteId, userId);
        }
    }

    private void persistRelatedRefs(Long meetingNoteId, List<MeetingNoteRelatedRefItemRequest> items) {
        meetingNoteRelatedRefRepository.deleteByMeetingNoteId(meetingNoteId);

        if (items == null || items.isEmpty()) {
            return;
        }

        List<MeetingNoteRelatedRefItemRequest> sortedItems = items.stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<MeetingNoteRelatedRef> rows = new ArrayList<>();
        int defaultSortOrder = 1;

        for (MeetingNoteRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRelatedRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            Integer sortOrder = item.sortOrder() == null ? defaultSortOrder : item.sortOrder();
            rows.add(MeetingNoteMapper.toRelatedRefEntity(meetingNoteId, item, normalizedRefType, sortOrder));
            defaultSortOrder++;
        }

        if (!rows.isEmpty()) {
            meetingNoteRelatedRefRepository.saveAll(rows);
        }
    }

    private MeetingNote getMeetingNoteOrThrow(Long id) {
        MeetingNote note = meetingNoteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(note.getTeamId());
        return note;
    }

    private void ensureMeetingNoteExists(Long id) {
        Long scopedTeamId = TeamScopeUtil.currentTeamId();
        if (scopedTeamId == null) {
            if (!meetingNoteRepository.existsById(id)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다.");
            }
            return;
        }
        getMeetingNoteOrThrow(id);
    }

    private String normalizeActionStatus(String rawStatus) {
        String status = rawStatus == null ? "" : rawStatus.trim();
        return switch (status) {
            case "대기", "진행중", "완료" -> status;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 action item status입니다.");
        };
    }

    private String normalizeLinkedRefType(String rawType) {
        if (isBlank(rawType)) {
            return null;
        }
        String normalized = rawType.trim().toUpperCase(Locale.ROOT);
        if (REF_TYPE_WORK_REQUEST.equals(normalized) || REF_TYPE_TECH_TASK.equals(normalized)) {
            return normalized;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 linkedRefType입니다.");
    }

    private String normalizeRelatedRefType(String rawType) {
        String normalized = rawType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case REF_TYPE_WORK_REQUEST, REF_TYPE_TECH_TASK, REF_TYPE_TEST_SCENARIO, REF_TYPE_DEFECT,
                    REF_TYPE_DEPLOYMENT, REF_TYPE_MEETING_NOTE, REF_TYPE_KNOWLEDGE_BASE ->
                    normalized;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 relatedRefType입니다.");
        };
    }

    private RefMetadata resolveRefMetadata(String rawRefType, Long refId) {
        String refType = normalizeRelatedRefType(rawRefType);
        RefMetadata resolved = switch (refType) {
            case REF_TYPE_WORK_REQUEST -> findWorkRequestRefMetadata(refId);
            case REF_TYPE_TECH_TASK -> findTechTaskRefMetadata(refId);
            case REF_TYPE_TEST_SCENARIO -> findTestScenarioRefMetadata(refId);
            case REF_TYPE_DEFECT -> findDefectRefMetadata(refId);
            case REF_TYPE_DEPLOYMENT -> findDeploymentRefMetadata(refId);
            case REF_TYPE_MEETING_NOTE -> findMeetingNoteRefMetadata(refId);
            case REF_TYPE_KNOWLEDGE_BASE -> findKnowledgeBaseRefMetadata(refType, refId);
            default -> null;
        };
        return resolved == null ? new RefMetadata(toFallbackRefNo(refType, refId), null) : resolved;
    }

    private RefMetadata findWorkRequestRefMetadata(Long refId) {
        WorkRequest row = workRequestRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getRequestNo(), row.getTitle());
    }

    private RefMetadata findTechTaskRefMetadata(Long refId) {
        TechTask row = techTaskRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getTaskNo(), row.getTitle());
    }

    private RefMetadata findTestScenarioRefMetadata(Long refId) {
        TestScenario row = testScenarioRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getScenarioNo(), row.getTitle());
    }

    private RefMetadata findDefectRefMetadata(Long refId) {
        Defect row = defectRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getDefectNo(), row.getTitle());
    }

    private RefMetadata findDeploymentRefMetadata(Long refId) {
        Deployment row = deploymentRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getDeployNo(), row.getTitle());
    }

    private RefMetadata findMeetingNoteRefMetadata(Long refId) {
        MeetingNote row = meetingNoteRepository.findById(refId).orElse(null);
        return row == null ? null : new RefMetadata(row.getNoteNo(), row.getTitle());
    }

    private RefMetadata findKnowledgeBaseRefMetadata(String refType, Long refId) {
        if (knowledgeBaseArticleRepository.existsById(refId)) {
            return new RefMetadata(toFallbackRefNo(refType, refId), null);
        }
        return null;
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case REF_TYPE_WORK_REQUEST -> "WR";
            case REF_TYPE_TECH_TASK -> "TK";
            case REF_TYPE_TEST_SCENARIO -> "TS";
            case REF_TYPE_DEFECT -> "DF";
            case REF_TYPE_DEPLOYMENT -> "DP";
            case REF_TYPE_MEETING_NOTE -> "MN";
            case REF_TYPE_KNOWLEDGE_BASE -> "KB";
            default -> "REF";
        };

        return prefix + "-" + refId;
    }

    private String normalizeContent(String content) {
        return content == null ? "" : content;
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record RefMetadata(String refNo, String title) {
    }

    private void syncDocumentIndex(MeetingNote entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                "MEETING_NOTE",
                entity.getId(),
                entity.getTeamId(),
                entity.getNoteNo(),
                entity.getTitle(),
                null
        );
    }

    private void deleteDocumentIndex(MeetingNote entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                "MEETING_NOTE",
                entity.getId(),
                entity.getTeamId()
        );
    }
}
