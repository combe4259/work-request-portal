package org.example.domain.meetingNote.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.meetingNote.dto.MeetingActionItemItemRequest;
import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.entity.MeetingActionItem;
import org.example.domain.meetingNote.entity.MeetingNote;
import org.example.domain.meetingNote.mapper.MeetingNoteMapper;
import org.example.domain.meetingNote.repository.MeetingActionItemRepository;
import org.example.domain.meetingNote.repository.MeetingNoteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MeetingNoteServiceImpl implements MeetingNoteService {

    private final MeetingNoteRepository meetingNoteRepository;
    private final MeetingActionItemRepository meetingActionItemRepository;
    private final ObjectMapper objectMapper;

    public MeetingNoteServiceImpl(
            MeetingNoteRepository meetingNoteRepository,
            MeetingActionItemRepository meetingActionItemRepository,
            ObjectMapper objectMapper
    ) {
        this.meetingNoteRepository = meetingNoteRepository;
        this.meetingActionItemRepository = meetingActionItemRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Page<MeetingNoteListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return meetingNoteRepository.findAll(pageable)
                .map(entity -> {
                    long actionTotal = meetingActionItemRepository.countByMeetingNoteId(entity.getId());
                    long actionDone = meetingActionItemRepository.countByMeetingNoteIdAndStatus(entity.getId(), "완료");
                    return MeetingNoteMapper.toListResponse(entity, actionTotal, actionDone);
                });
    }

    @Override
    public MeetingNoteDetailResponse findById(Long id) {
        MeetingNote entity = getMeetingNoteOrThrow(id);
        return MeetingNoteMapper.toDetailResponse(entity, fromJsonList(entity.getAgenda()), fromJsonList(entity.getDecisions()));
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
        entity.setNoteNo("MN-" + System.currentTimeMillis());
        entity.setLocation(normalizeNullable(request.location()));

        MeetingNote saved = meetingNoteRepository.save(entity);

        if (request.actionItems() != null) {
            persistActionItems(saved.getId(), request.actionItems());
        }

        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, MeetingNoteUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        MeetingNote entity = getMeetingNoteOrThrow(id);

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
    }

    @Override
    public List<MeetingActionItemResponse> getActionItems(Long id) {
        ensureMeetingNoteExists(id);
        return meetingActionItemRepository.findByMeetingNoteIdOrderByIdAsc(id).stream()
                .map(MeetingNoteMapper::toActionItemResponse)
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
        if (request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
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

    private MeetingNote getMeetingNoteOrThrow(Long id) {
        return meetingNoteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다."));
    }

    private void ensureMeetingNoteExists(Long id) {
        if (!meetingNoteRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다.");
        }
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
        String normalized = rawType.trim().toUpperCase();
        if ("WORK_REQUEST".equals(normalized) || "TECH_TASK".equals(normalized)) {
            return normalized;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 linkedRefType입니다.");
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
}
