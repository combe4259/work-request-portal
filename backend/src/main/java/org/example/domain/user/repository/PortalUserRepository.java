package org.example.domain.user.repository;

import org.example.domain.user.entity.PortalUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PortalUserRepository extends JpaRepository<PortalUser, Long> {
    Optional<PortalUser> findByEmail(String email);

    boolean existsByEmail(String email);
}
