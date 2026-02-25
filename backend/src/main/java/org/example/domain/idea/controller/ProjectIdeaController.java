package org.example.domain.idea.controller;

import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaRelatedRefResponse;
import org.example.domain.idea.dto.ProjectIdeaRelatedRefsUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.example.domain.idea.service.ProjectIdeaService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ideas")
public class ProjectIdeaController {

    private final ProjectIdeaService projectIdeaService;

    public ProjectIdeaController(ProjectIdeaService projectIdeaService) {
        this.projectIdeaService = projectIdeaService;
    }

    @GetMapping
    public Page<ProjectIdeaListResponse> getProjectIdeas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return projectIdeaService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public ProjectIdeaDetailResponse getProjectIdea(@PathVariable Long id) {
        return projectIdeaService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createProjectIdea(@RequestBody ProjectIdeaCreateRequest request) {
        Long id = projectIdeaService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateProjectIdea(
            @PathVariable Long id,
            @RequestBody ProjectIdeaUpdateRequest request
    ) {
        projectIdeaService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjectIdea(@PathVariable Long id) {
        projectIdeaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateProjectIdeaStatus(
            @PathVariable Long id,
            @RequestBody ProjectIdeaStatusUpdateRequest request
    ) {
        projectIdeaService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<ProjectIdeaRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(projectIdeaService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody ProjectIdeaRelatedRefsUpdateRequest request
    ) {
        projectIdeaService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/votes")
    public ResponseEntity<ProjectIdeaVoteResponse> likeIdea(
            @PathVariable Long id,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(projectIdeaService.likeIdea(id, authorizationHeader));
    }

    @DeleteMapping("/{id}/votes/me")
    public ResponseEntity<ProjectIdeaVoteResponse> unlikeIdea(
            @PathVariable Long id,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(projectIdeaService.unlikeIdea(id, authorizationHeader));
    }
}
