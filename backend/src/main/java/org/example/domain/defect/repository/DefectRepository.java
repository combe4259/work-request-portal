package org.example.domain.defect.repository;

import org.example.domain.defect.entity.Defect;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DefectRepository extends JpaRepository<Defect, Long> {

    Page<Defect> findByTeamId(Long teamId, Pageable pageable);
}
