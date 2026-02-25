package org.example.domain.testScenario.repository;

import org.example.domain.testScenario.entity.TestScenarioRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestScenarioRelatedRefRepository extends JpaRepository<TestScenarioRelatedRef, Long> {
    List<TestScenarioRelatedRef> findByTestScenarioIdOrderByIdAsc(Long testScenarioId);

    void deleteByTestScenarioId(Long testScenarioId);
}
