package org.example.domain.comment.service;

import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentDetailResponse;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.springframework.data.domain.Page;

public interface CommentService {

    Page<CommentListResponse> findPage(String refType, Long refId, int page, int size);

    CommentDetailResponse findById(Long id);

    Long create(CommentCreateRequest request);

    void update(Long id, CommentUpdateRequest request);

    void delete(Long id);
}
