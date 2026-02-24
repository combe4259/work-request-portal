package org.example.domain.testScenario.service;

import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.springframework.data.domain.Page;

public interface TestScenarioService {
    Page<TestScenarioListResponse> findPage(int page, int size);

    TestScenarioDetailResponse findById(Long id);

    Long create(TestScenarioCreateRequest request);

    void update(Long id, TestScenarioUpdateRequest request);

    void updateStatus(Long id, TestScenarioStatusUpdateRequest request);
}
