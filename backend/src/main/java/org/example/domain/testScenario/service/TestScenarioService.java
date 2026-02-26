package org.example.domain.testScenario.service;

import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioExecutionUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioListQuery;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefsUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface TestScenarioService {
    Page<TestScenarioListResponse> findPage(int page, int size, TestScenarioListQuery query);

    TestScenarioDetailResponse findById(Long id);

    Long create(TestScenarioCreateRequest request);

    void update(Long id, TestScenarioUpdateRequest request);

    void delete(Long id);

    void updateStatus(Long id, TestScenarioStatusUpdateRequest request);

    void updateExecution(Long id, TestScenarioExecutionUpdateRequest request);

    List<TestScenarioRelatedRefResponse> getRelatedRefs(Long id);

    void replaceRelatedRefs(Long id, TestScenarioRelatedRefsUpdateRequest request);
}
