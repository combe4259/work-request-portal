package org.example.domain.resource.repository;

import org.example.domain.resource.entity.SharedResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SharedResourceRepository extends JpaRepository<SharedResource, Long> {

    Page<SharedResource> findByTeamId(Long teamId, Pageable pageable);
}
