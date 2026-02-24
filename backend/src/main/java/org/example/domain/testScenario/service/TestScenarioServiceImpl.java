package org.example.domain.testScenario.service;

import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.mapper.TestScenarioMapper;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class TestScenarioServiceImpl implements TestScenarioService {

    private final TestScenarioRepository testScenarioRepository;

    public TestScenarioServiceImpl(TestScenarioRepository testScenarioRepository) {
        this.testScenarioRepository = testScenarioRepository;
    }

    @Override
    public Page<TestScenarioListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return testScenarioRepository.findAll(pageable)
                .map(TestScenarioMapper::toListResponse);
    }

    @Override
    public TestScenarioDetailResponse findById(Long id) {
        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "테스트 시나리오를 찾을 수 없습니다."));
        return TestScenarioMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(TestScenarioCreateRequest request) {
        validateCreateRequest(request);

        TestScenario entity = TestScenarioMapper.fromCreateRequest(request);

        // TODO: document_sequences 기반 채번으로 대체
        entity.setScenarioNo("TS-" + System.currentTimeMillis());
        entity.setType(defaultIfBlank(request.type(), "기능"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "작성중"));
        entity.setSteps(defaultIfBlank(request.steps(), "[]"));

        TestScenario saved = testScenarioRepository.save(entity);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, TestScenarioUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "테스트 시나리오를 찾을 수 없습니다."));

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        TestScenarioMapper.applyUpdate(entity, request);

        if (request.type() != null) {
            entity.setType(defaultIfBlank(request.type(), entity.getType()));
        }
        if (request.priority() != null) {
            entity.setPriority(defaultIfBlank(request.priority(), entity.getPriority()));
        }
        if (request.status() != null) {
            entity.setStatus(defaultIfBlank(request.status(), entity.getStatus()));
        }
        if (request.steps() != null) {
            entity.setSteps(defaultIfBlank(request.steps(), "[]"));
        }
    }

    @Override
    @Transactional
    public void updateStatus(Long id, TestScenarioStatusUpdateRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "테스트 시나리오를 찾을 수 없습니다."));

        entity.setStatus(request.status().trim());
        if (request.statusNote() != null) {
            entity.setStatusNote(normalizeNullable(request.statusNote()));
        }
    }

    private void validateCreateRequest(TestScenarioCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
        if (request.createdBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdBy는 필수입니다.");
        }
        if (request.deadline() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline은 필수입니다.");
        }
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
