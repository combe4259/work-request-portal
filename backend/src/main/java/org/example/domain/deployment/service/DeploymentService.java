package org.example.domain.deployment.service;

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
import org.springframework.data.domain.Page;

import java.util.List;

public interface DeploymentService {
    Page<DeploymentListResponse> findPage(int page, int size);

    DeploymentDetailResponse findById(Long id);

    Long create(DeploymentCreateRequest request);

    void update(Long id, DeploymentUpdateRequest request);

    void updateStatus(Long id, DeploymentStatusUpdateRequest request);

    List<DeploymentRelatedRefResponse> getRelatedRefs(Long id);

    void replaceRelatedRefs(Long id, DeploymentRelatedRefsUpdateRequest request);

    List<DeploymentStepResponse> getSteps(Long id);

    void replaceSteps(Long id, DeploymentStepsReplaceRequest request);

    void updateStep(Long id, Long stepId, DeploymentStepUpdateRequest request);
}
