package org.example.domain.workRequest.controller;

import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefsUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.service.WorkRequestService;
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
@RequestMapping("/api/work-requests")
public class WorkRequestController {

    private final WorkRequestService workRequestService;

    public WorkRequestController(WorkRequestService workRequestService) {
        this.workRequestService = workRequestService;
    }

    @GetMapping
    public Page<WorkRequestListResponse> getWorkRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return workRequestService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public WorkRequestDetailResponse getWorkRequest(@PathVariable Long id) {
        return workRequestService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createWorkRequest(@RequestBody WorkRequestCreateRequest request) {
        Long id = workRequestService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateWorkRequest(
            @PathVariable Long id,
            @RequestBody WorkRequestUpdateRequest request
    ) {
        workRequestService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateWorkRequestStatus(
            @PathVariable Long id,
            @RequestBody WorkRequestStatusUpdateRequest request
    ) {
        workRequestService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkRequest(@PathVariable Long id) {
        workRequestService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<WorkRequestRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(workRequestService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody WorkRequestRelatedRefsUpdateRequest request
    ) {
        workRequestService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }
}
