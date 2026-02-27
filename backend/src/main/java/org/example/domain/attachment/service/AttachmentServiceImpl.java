package org.example.domain.attachment.service;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.entity.Attachment;
import org.example.domain.attachment.mapper.AttachmentMapper;
import org.example.domain.attachment.repository.AttachmentRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.documentIndex.repository.DocumentIndexRepository;
import org.example.domain.idea.entity.ProjectIdea;
import org.example.domain.idea.repository.ProjectIdeaRepository;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.domain.meetingNote.entity.MeetingNote;
import org.example.domain.meetingNote.repository.MeetingNoteRepository;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
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
    private final DocumentIndexRepository documentIndexRepository;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final MeetingNoteRepository meetingNoteRepository;
    private final ProjectIdeaRepository projectIdeaRepository;
    private final KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;

    public AttachmentServiceImpl(
            AttachmentRepository attachmentRepository,
            @Nullable DocumentIndexRepository documentIndexRepository,
            @Nullable WorkRequestRepository workRequestRepository,
            @Nullable TechTaskRepository techTaskRepository,
            @Nullable TestScenarioRepository testScenarioRepository,
            @Nullable DefectRepository defectRepository,
            @Nullable DeploymentRepository deploymentRepository,
            @Nullable MeetingNoteRepository meetingNoteRepository,
            @Nullable ProjectIdeaRepository projectIdeaRepository,
            @Nullable KnowledgeBaseArticleRepository knowledgeBaseArticleRepository
    ) {
        this.attachmentRepository = attachmentRepository;
        this.documentIndexRepository = documentIndexRepository;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.meetingNoteRepository = meetingNoteRepository;
        this.projectIdeaRepository = projectIdeaRepository;
        this.knowledgeBaseArticleRepository = knowledgeBaseArticleRepository;
    }

    @Override
    public List<AttachmentListResponse> findList(String refType, Long refId) {
        String normalizedRefType = normalizeRequiredRefType(refType);
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }
        ensureRefAccessible(normalizedRefType, refId);

        return attachmentRepository.findByRefTypeAndRefIdOrderByIdDesc(normalizedRefType, refId).stream()
                .map(AttachmentMapper::toListResponse)
                .toList();
    }

    @Override
    public AttachmentDetailResponse findById(Long id) {
        Attachment entity = getAttachmentOrThrow(id);
        ensureRefAccessible(entity.getRefType(), entity.getRefId());
        return AttachmentMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(AttachmentCreateRequest request) {
        validateCreateRequest(request);
        String normalizedRefType = normalizeRequiredRefType(request.refType());
        ensureRefAccessible(normalizedRefType, request.refId());

        Attachment entity = AttachmentMapper.fromCreateRequest(request);
        entity.setRefType(normalizedRefType);
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
        String targetRefType = request.refType() == null
                ? entity.getRefType()
                : normalizeRequiredRefType(request.refType());
        Long targetRefId = request.refId() == null ? entity.getRefId() : request.refId();
        ensureRefAccessible(targetRefType, targetRefId);

        AttachmentMapper.applyUpdate(entity, request);

        if (request.refType() != null) {
            entity.setRefType(targetRefType);
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
        ensureRefAccessible(entity.getRefType(), entity.getRefId());
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

    private void ensureRefAccessible(String refType, Long refId) {
        Long teamId = TeamScopeUtil.currentTeamId();
        if (teamId == null) {
            return;
        }
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }

        if (documentIndexRepository != null) {
            boolean exists = documentIndexRepository.findByTeamIdAndRefTypeAndRefId(teamId, refType, refId).isPresent();
            if (exists) {
                return;
            }
        }

        Long sourceTeamId = resolveTeamIdBySource(refType, refId);
        if (sourceTeamId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "참조 문서를 찾을 수 없습니다.");
        }
        TeamScopeUtil.ensureAccessible(sourceTeamId);
    }

    private Long resolveTeamIdBySource(String refType, Long refId) {
        return switch (refType) {
            case "WORK_REQUEST" -> workRequestRepository == null
                    ? null
                    : workRequestRepository.findById(refId).map(WorkRequest::getTeamId).orElse(null);
            case "TECH_TASK" -> techTaskRepository == null
                    ? null
                    : techTaskRepository.findById(refId).map(TechTask::getTeamId).orElse(null);
            case "TEST_SCENARIO" -> testScenarioRepository == null
                    ? null
                    : testScenarioRepository.findById(refId).map(TestScenario::getTeamId).orElse(null);
            case "DEFECT" -> defectRepository == null
                    ? null
                    : defectRepository.findById(refId).map(Defect::getTeamId).orElse(null);
            case "DEPLOYMENT" -> deploymentRepository == null
                    ? null
                    : deploymentRepository.findById(refId).map(Deployment::getTeamId).orElse(null);
            case "MEETING_NOTE" -> meetingNoteRepository == null
                    ? null
                    : meetingNoteRepository.findById(refId).map(MeetingNote::getTeamId).orElse(null);
            case "PROJECT_IDEA" -> projectIdeaRepository == null
                    ? null
                    : projectIdeaRepository.findById(refId).map(ProjectIdea::getTeamId).orElse(null);
            case "KNOWLEDGE_BASE" -> knowledgeBaseArticleRepository == null
                    ? null
                    : knowledgeBaseArticleRepository.findById(refId).map(KnowledgeBaseArticle::getTeamId).orElse(null);
            default -> null;
        };
    }
}
