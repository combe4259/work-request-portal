package org.example.domain.defect.service;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.mapper.DefectMapper;
import org.example.domain.defect.repository.DefectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DefectServiceImpl implements DefectService {

    private final DefectRepository defectRepository;

    public DefectServiceImpl(DefectRepository defectRepository) {
        this.defectRepository = defectRepository;
    }

    @Override
    public Page<DefectListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return defectRepository.findAll(pageable)
                .map(DefectMapper::toListResponse);
    }

    @Override
    public DefectDetailResponse findById(Long id) {
        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));
        return DefectMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(DefectCreateRequest request) {
        validateCreateRequest(request);

        Defect entity = DefectMapper.fromCreateRequest(request);

        // TODO: document_sequences 기반 채번으로 대체
        entity.setDefectNo("DF-" + System.currentTimeMillis());
        entity.setType(defaultIfBlank(request.type(), "기능"));
        entity.setSeverity(defaultIfBlank(request.severity(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수"));
        entity.setReproductionSteps(defaultIfBlank(request.reproductionSteps(), "[]"));
        normalizeRelatedRef(entity, request.relatedRefType(), request.relatedRefId());

        Defect saved = defectRepository.save(entity);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, DefectUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        DefectMapper.applyUpdate(entity, request);

        if (request.type() != null) {
            entity.setType(defaultIfBlank(request.type(), entity.getType()));
        }
        if (request.severity() != null) {
            entity.setSeverity(defaultIfBlank(request.severity(), entity.getSeverity()));
        }
        if (request.status() != null) {
            entity.setStatus(defaultIfBlank(request.status(), entity.getStatus()));
        }
        if (request.reproductionSteps() != null) {
            entity.setReproductionSteps(defaultIfBlank(request.reproductionSteps(), "[]"));
        }
        if (request.relatedRefType() != null || request.relatedRefId() != null) {
            normalizeRelatedRef(entity, request.relatedRefType(), request.relatedRefId());
        }
    }

    @Override
    @Transactional
    public void updateStatus(Long id, DefectStatusUpdateRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));

        entity.setStatus(request.status().trim());
        if (request.statusNote() != null) {
            entity.setStatusNote(normalizeNullable(request.statusNote()));
        }
    }

    private void validateCreateRequest(DefectCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
        if (request.reporterId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reporterId는 필수입니다.");
        }
        if (request.expectedBehavior() == null || request.expectedBehavior().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "expectedBehavior는 필수입니다.");
        }
        if (request.actualBehavior() == null || request.actualBehavior().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actualBehavior는 필수입니다.");
        }
        if (request.deadline() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline은 필수입니다.");
        }

        if (request.relatedRefType() != null || request.relatedRefId() != null) {
            normalizeRelatedRef(new Defect(), request.relatedRefType(), request.relatedRefId());
        }
    }

    private void normalizeRelatedRef(Defect entity, String relatedRefType, Long relatedRefId) {
        if (relatedRefType == null || relatedRefType.isBlank()) {
            entity.setRelatedRefType(null);
            entity.setRelatedRefId(null);
            return;
        }

        if (relatedRefId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "relatedRefId는 필수입니다.");
        }

        String normalizedRefType = relatedRefType.trim().toUpperCase(Locale.ROOT);
        if (!normalizedRefType.equals("WORK_REQUEST")
                && !normalizedRefType.equals("TECH_TASK")
                && !normalizedRefType.equals("TEST_SCENARIO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 relatedRefType입니다.");
        }

        entity.setRelatedRefType(normalizedRefType);
        entity.setRelatedRefId(relatedRefId);
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
