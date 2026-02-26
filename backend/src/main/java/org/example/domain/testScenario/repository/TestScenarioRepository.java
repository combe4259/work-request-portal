package org.example.domain.testScenario.repository;

import org.example.domain.testScenario.entity.TestScenario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TestScenarioRepository extends JpaRepository<TestScenario, Long>, JpaSpecificationExecutor<TestScenario> {

    Page<TestScenario> findByTeamId(Long teamId, Pageable pageable);
}
