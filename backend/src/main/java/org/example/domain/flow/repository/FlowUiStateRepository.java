package org.example.domain.flow.repository;

import org.example.domain.flow.entity.FlowUiState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FlowUiStateRepository extends JpaRepository<FlowUiState, Long> {
    Optional<FlowUiState> findByWorkRequestIdAndUserId(Long workRequestId, Long userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update FlowUiState state
               set state.stateJson = :stateJson,
                   state.version = :nextVersion,
                   state.teamId = :teamId
             where state.workRequestId = :workRequestId
               and state.userId = :userId
               and state.version = :expectedVersion
            """)
    int updateStateWithVersion(
            @Param("workRequestId") Long workRequestId,
            @Param("userId") Long userId,
            @Param("teamId") Long teamId,
            @Param("stateJson") String stateJson,
            @Param("expectedVersion") Long expectedVersion,
            @Param("nextVersion") Long nextVersion
    );
}
