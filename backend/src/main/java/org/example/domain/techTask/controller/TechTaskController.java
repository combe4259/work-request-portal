package org.example.domain.techTask.controller;

import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListQuery;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskPrLinkCreateRequest;
import org.example.domain.techTask.dto.TechTaskPrLinkResponse;
import org.example.domain.techTask.dto.TechTaskRelatedRefsUpdateRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefResponse;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.example.domain.techTask.service.TechTaskService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tech-tasks")
public class TechTaskController {

    private final TechTaskService techTaskService;

    public TechTaskController(TechTaskService techTaskService) {
        this.techTaskService = techTaskService;
    }

    @GetMapping
    public Page<TechTaskListResponse> getTechTasks(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deadlineFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deadlineTo,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        TechTaskListQuery query = new TechTaskListQuery(
                q,
                type,
                priority,
                status,
                assigneeId,
                deadlineFrom,
                deadlineTo,
                sortBy,
                sortDir
        );
        return techTaskService.findPage(page, size, query);
    }

    @GetMapping("/{id}")
    public TechTaskDetailResponse getTechTask(@PathVariable Long id) {
        return techTaskService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createTechTask(@RequestBody TechTaskCreateRequest request) {
        Long id = techTaskService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateTechTask(
            @PathVariable Long id,
            @RequestBody TechTaskUpdateRequest request
    ) {
        techTaskService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTechTask(@PathVariable Long id) {
        techTaskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateTechTaskStatus(
            @PathVariable Long id,
            @RequestBody TechTaskStatusUpdateRequest request
    ) {
        techTaskService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<TechTaskRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(techTaskService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody TechTaskRelatedRefsUpdateRequest request
    ) {
        techTaskService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pr-links")
    public ResponseEntity<List<TechTaskPrLinkResponse>> getPrLinks(@PathVariable Long id) {
        return ResponseEntity.ok(techTaskService.getPrLinks(id));
    }

    @PostMapping("/{id}/pr-links")
    public ResponseEntity<Map<String, Long>> createPrLink(
            @PathVariable Long id,
            @RequestBody TechTaskPrLinkCreateRequest request
    ) {
        Long linkId = techTaskService.createPrLink(id, request);
        return ResponseEntity.ok(Map.of("id", linkId));
    }

    @DeleteMapping("/{id}/pr-links/{linkId}")
    public ResponseEntity<Void> deletePrLink(
            @PathVariable Long id,
            @PathVariable Long linkId
    ) {
        techTaskService.deletePrLink(id, linkId);
        return ResponseEntity.noContent().build();
    }
}
