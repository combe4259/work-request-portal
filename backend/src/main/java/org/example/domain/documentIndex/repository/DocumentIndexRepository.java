package org.example.domain.documentIndex.repository;

import org.example.domain.documentIndex.entity.DocumentIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface DocumentIndexRepository extends JpaRepository<DocumentIndex, Long>, JpaSpecificationExecutor<DocumentIndex> {

    Optional<DocumentIndex> findByTeamIdAndRefTypeAndRefId(Long teamId, String refType, Long refId);

    void deleteByTeamIdAndRefTypeAndRefId(Long teamId, String refType, Long refId);
}
