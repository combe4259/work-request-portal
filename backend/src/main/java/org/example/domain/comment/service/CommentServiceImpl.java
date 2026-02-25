package org.example.domain.comment.service;

import org.example.domain.documentIndex.repository.DocumentIndexRepository;
import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentDetailResponse;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.example.domain.comment.entity.Comment;
import org.example.domain.comment.mapper.CommentMapper;
import org.example.domain.comment.repository.CommentRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class CommentServiceImpl implements CommentService {

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

    private final CommentRepository commentRepository;
    @Autowired(required = false)
    private DocumentIndexRepository documentIndexRepository;

    public CommentServiceImpl(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @Override
    public Page<CommentListResponse> findPage(String refType, Long refId, int page, int size) {
        String normalizedRefType = normalizeRequiredRefType(refType);
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }
        ensureRefAccessible(normalizedRefType, refId);

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return commentRepository.findByRefTypeAndRefIdOrderByIdDesc(normalizedRefType, refId, pageable)
                .map(CommentMapper::toListResponse);
    }

    @Override
    public CommentDetailResponse findById(Long id) {
        Comment entity = getCommentOrThrow(id);
        ensureRefAccessible(entity.getRefType(), entity.getRefId());
        return CommentMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(CommentCreateRequest request) {
        validateCreateRequest(request);
        String normalizedRefType = normalizeRequiredRefType(request.refType());
        ensureRefAccessible(normalizedRefType, request.refId());

        Comment entity = CommentMapper.fromCreateRequest(request);
        entity.setRefType(normalizedRefType);
        entity.setContent(request.content().trim());

        return commentRepository.save(entity).getId();
    }

    @Override
    @Transactional
    public void update(Long id, CommentUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }

        Comment entity = getCommentOrThrow(id);
        ensureRefAccessible(entity.getRefType(), entity.getRefId());
        CommentMapper.applyUpdate(entity, request);
        entity.setContent(request.content().trim());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Comment entity = getCommentOrThrow(id);
        ensureRefAccessible(entity.getRefType(), entity.getRefId());
        commentRepository.delete(entity);
    }

    private Comment getCommentOrThrow(Long id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));
    }

    private void validateCreateRequest(CommentCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        normalizeRequiredRefType(request.refType());
        if (request.refId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content는 필수입니다.");
        }
        if (request.authorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "authorId는 필수입니다.");
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

    private void ensureRefAccessible(String refType, Long refId) {
        Long teamId = TeamScopeUtil.currentTeamId();
        if (teamId == null || documentIndexRepository == null) {
            return;
        }
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }

        boolean exists = documentIndexRepository.findByTeamIdAndRefTypeAndRefId(teamId, refType, refId).isPresent();
        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "참조 문서를 찾을 수 없습니다.");
        }
    }
}
