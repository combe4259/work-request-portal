package org.example.domain.idea.service;

import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.springframework.data.domain.Page;

public interface ProjectIdeaService {
    Page<ProjectIdeaListResponse> findPage(int page, int size);

    ProjectIdeaDetailResponse findById(Long id);

    Long create(ProjectIdeaCreateRequest request);

    void update(Long id, ProjectIdeaUpdateRequest request);

    void updateStatus(Long id, ProjectIdeaStatusUpdateRequest request);

    ProjectIdeaVoteResponse likeIdea(Long id, String authorizationHeader);

    ProjectIdeaVoteResponse unlikeIdea(Long id, String authorizationHeader);
}
