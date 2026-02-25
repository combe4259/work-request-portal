package org.example.domain.testScenario.controller;

import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefsUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.service.TestScenarioService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test-scenarios")
public class TestScenarioController {

    private final TestScenarioService testScenarioService;

    public TestScenarioController(TestScenarioService testScenarioService) {
        this.testScenarioService = testScenarioService;
    }

    @GetMapping
    public Page<TestScenarioListResponse> getTestScenarios(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return testScenarioService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public TestScenarioDetailResponse getTestScenario(@PathVariable Long id) {
        return testScenarioService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createTestScenario(@RequestBody TestScenarioCreateRequest request) {
        Long id = testScenarioService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateTestScenario(
            @PathVariable Long id,
            @RequestBody TestScenarioUpdateRequest request
    ) {
        testScenarioService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestScenario(@PathVariable Long id) {
        testScenarioService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateTestScenarioStatus(
            @PathVariable Long id,
            @RequestBody TestScenarioStatusUpdateRequest request
    ) {
        testScenarioService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<TestScenarioRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(testScenarioService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody TestScenarioRelatedRefsUpdateRequest request
    ) {
        testScenarioService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }
}
