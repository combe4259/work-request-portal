package org.example.global.github.repository;

import org.example.global.github.entity.GitHubRepoTeamMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GitHubRepoTeamMappingRepository extends JpaRepository<GitHubRepoTeamMapping, Long> {
    Optional<GitHubRepoTeamMapping> findByRepositoryFullNameAndActiveTrue(String repositoryFullName);
}
