package org.example.domain.workRequest.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.mapper.WorkRequestMapper;
import org.example.domain.workRequest.repository.WorkRequestQueryRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WorkRequestServiceImpl implements WorkRequestService {

    private final WorkRequestRepository workRequestRepository;
    @SuppressWarnings("unused")
    private final WorkRequestQueryRepository workRequestQueryRepository;
    private final DocumentNoGenerator documentNoGenerator;

    public WorkRequestServiceImpl(
            WorkRequestRepository workRequestRepository,
            WorkRequestQueryRepository workRequestQueryRepository,
            DocumentNoGenerator documentNoGenerator
    ) {
        this.workRequestRepository = workRequestRepository;
        this.workRequestQueryRepository = workRequestQueryRepository;
        this.documentNoGenerator = documentNoGenerator;
    }

    @Override
    public Page<WorkRequestListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return workRequestRepository.findAll(pageable)
                .map(WorkRequestMapper::toListResponse);
    }

    @Override
    public WorkRequestDetailResponse findById(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));
        return WorkRequestMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(WorkRequestCreateRequest request) {
        WorkRequest entity = WorkRequestMapper.fromCreateRequest(request);

        entity.setRequestNo(documentNoGenerator.next("WR"));
        entity.setType(defaultIfBlank(request.type(), "기능개선"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수대기"));

        WorkRequest saved = workRequestRepository.save(entity);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, WorkRequestUpdateRequest request) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));

        WorkRequestMapper.applyUpdate(entity, request);
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }
}
