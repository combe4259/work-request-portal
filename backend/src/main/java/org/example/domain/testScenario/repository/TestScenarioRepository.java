package org.example.domain.testScenario.repository;

import org.example.domain.testScenario.entity.TestScenario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestScenarioRepository extends JpaRepository<TestScenario, Long> {
}
