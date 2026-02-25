package org.example.domain.techTask.service;

import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskPrLinkCreateRequest;
import org.example.domain.techTask.dto.TechTaskPrLinkResponse;
import org.example.domain.techTask.dto.TechTaskRelatedRefsUpdateRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefResponse;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface TechTaskService {
    Page<TechTaskListResponse> findPage(int page, int size);

    TechTaskDetailResponse findById(Long id);

    Long create(TechTaskCreateRequest request);

    void update(Long id, TechTaskUpdateRequest request);

    void delete(Long id);

    void updateStatus(Long id, TechTaskStatusUpdateRequest request);

    List<TechTaskRelatedRefResponse> getRelatedRefs(Long id);

    void replaceRelatedRefs(Long id, TechTaskRelatedRefsUpdateRequest request);

    List<TechTaskPrLinkResponse> getPrLinks(Long id);

    Long createPrLink(Long id, TechTaskPrLinkCreateRequest request);

    void deletePrLink(Long id, Long linkId);
}
