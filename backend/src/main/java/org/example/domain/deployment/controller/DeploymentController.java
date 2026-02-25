package org.example.domain.deployment.controller;

import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
import org.example.domain.deployment.dto.DeploymentListResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefsUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStepResponse;
import org.example.domain.deployment.dto.DeploymentStepsReplaceRequest;
import org.example.domain.deployment.dto.DeploymentStepUpdateRequest;
import org.example.domain.deployment.dto.DeploymentUpdateRequest;
import org.example.domain.deployment.service.DeploymentService;
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
@RequestMapping("/api/deployments")
public class DeploymentController {

    private final DeploymentService deploymentService;

    public DeploymentController(DeploymentService deploymentService) {
        this.deploymentService = deploymentService;
    }

    @GetMapping
    public Page<DeploymentListResponse> getDeployments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return deploymentService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public DeploymentDetailResponse getDeployment(@PathVariable Long id) {
        return deploymentService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createDeployment(@RequestBody DeploymentCreateRequest request) {
        Long id = deploymentService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateDeployment(
            @PathVariable Long id,
            @RequestBody DeploymentUpdateRequest request
    ) {
        deploymentService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeployment(@PathVariable Long id) {
        deploymentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateDeploymentStatus(
            @PathVariable Long id,
            @RequestBody DeploymentStatusUpdateRequest request
    ) {
        deploymentService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<DeploymentRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(deploymentService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody DeploymentRelatedRefsUpdateRequest request
    ) {
        deploymentService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/steps")
    public ResponseEntity<List<DeploymentStepResponse>> getSteps(@PathVariable Long id) {
        return ResponseEntity.ok(deploymentService.getSteps(id));
    }

    @PutMapping("/{id}/steps")
    public ResponseEntity<Void> replaceSteps(
            @PathVariable Long id,
            @RequestBody DeploymentStepsReplaceRequest request
    ) {
        deploymentService.replaceSteps(id, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/steps/{stepId}")
    public ResponseEntity<Void> updateStep(
            @PathVariable Long id,
            @PathVariable Long stepId,
            @RequestBody DeploymentStepUpdateRequest request
    ) {
        deploymentService.updateStep(id, stepId, request);
        return ResponseEntity.noContent().build();
    }
}
