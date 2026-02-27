package org.example.domain.flow.repository;

import org.example.domain.flow.entity.FlowUiState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FlowUiStateRepository extends JpaRepository<FlowUiState, Long> {
    Optional<FlowUiState> findByWorkRequestIdAndUserId(Long workRequestId, Long userId);
}
