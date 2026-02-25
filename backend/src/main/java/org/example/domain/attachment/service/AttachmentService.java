package org.example.domain.attachment.service;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;

import java.util.List;

public interface AttachmentService {

    List<AttachmentListResponse> findList(String refType, Long refId);

    AttachmentDetailResponse findById(Long id);

    Long create(AttachmentCreateRequest request);

    void update(Long id, AttachmentUpdateRequest request);

    void delete(Long id);
}
