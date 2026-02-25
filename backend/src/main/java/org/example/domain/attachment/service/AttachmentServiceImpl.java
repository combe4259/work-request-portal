package org.example.domain.attachment.service;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.entity.Attachment;
import org.example.domain.attachment.mapper.AttachmentMapper;
import org.example.domain.attachment.repository.AttachmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class AttachmentServiceImpl implements AttachmentService {

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

    private final AttachmentRepository attachmentRepository;

    public AttachmentServiceImpl(AttachmentRepository attachmentRepository) {
        this.attachmentRepository = attachmentRepository;
    }

    @Override
    public List<AttachmentListResponse> findList(String refType, Long refId) {
        String normalizedRefType = normalizeRequiredRefType(refType);
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }

        return attachmentRepository.findByRefTypeAndRefIdOrderByIdDesc(normalizedRefType, refId).stream()
                .map(AttachmentMapper::toListResponse)
                .toList();
    }

    @Override
    public AttachmentDetailResponse findById(Long id) {
        Attachment entity = getAttachmentOrThrow(id);
        return AttachmentMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(AttachmentCreateRequest request) {
        validateCreateRequest(request);

        Attachment entity = AttachmentMapper.fromCreateRequest(request);
        entity.setRefType(normalizeRequiredRefType(request.refType()));
        entity.setOriginalName(request.originalName().trim());
        entity.setStoredPath(request.storedPath().trim());
        entity.setMimeType(normalizeNullable(request.mimeType()));

        return attachmentRepository.save(entity).getId();
    }

    @Override
    @Transactional
    public void update(Long id, AttachmentUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Attachment entity = getAttachmentOrThrow(id);
        validateUpdateRequest(request);

        AttachmentMapper.applyUpdate(entity, request);

        if (request.refType() != null) {
            entity.setRefType(normalizeRequiredRefType(request.refType()));
        }
        if (request.originalName() != null) {
            entity.setOriginalName(request.originalName().trim());
        }
        if (request.storedPath() != null) {
            entity.setStoredPath(request.storedPath().trim());
        }
        if (request.mimeType() != null) {
            entity.setMimeType(normalizeNullable(request.mimeType()));
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Attachment entity = getAttachmentOrThrow(id);
        attachmentRepository.delete(entity);
    }

    private Attachment getAttachmentOrThrow(Long id) {
        return attachmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다."));
    }

    private void validateCreateRequest(AttachmentCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        normalizeRequiredRefType(request.refType());
        if (request.refId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }
        if (request.originalName() == null || request.originalName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "originalName은 필수입니다.");
        }
        if (request.storedPath() == null || request.storedPath().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "storedPath는 필수입니다.");
        }
        if (request.uploadedBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "uploadedBy는 필수입니다.");
        }
    }

    private void validateUpdateRequest(AttachmentUpdateRequest request) {
        if (request.refType() != null) {
            normalizeRequiredRefType(request.refType());
        }
        if (request.refId() != null && request.refId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 1 이상이어야 합니다.");
        }
        if (request.originalName() != null && request.originalName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "originalName은 빈 값일 수 없습니다.");
        }
        if (request.storedPath() != null && request.storedPath().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "storedPath는 빈 값일 수 없습니다.");
        }
    }

    private String normalizeRequiredRefType(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refType은 필수입니다.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_REF_TYPES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
