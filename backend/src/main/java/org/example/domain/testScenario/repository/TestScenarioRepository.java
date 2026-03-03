package org.example.domain.testScenario.repository;

import org.example.domain.testScenario.entity.TestScenario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TestScenarioRepository extends JpaRepository<TestScenario, Long>, JpaSpecificationExecutor<TestScenario> {

    Page<TestScenario> findByTeamId(Long teamId, Pageable pageable);

    @Query("SELECT e FROM TestScenario e WHERE e.deadline = :date AND e.status NOT IN :excluded AND e.assigneeId IS NOT NULL")
    List<TestScenario> findActiveByDeadline(@Param("date") LocalDate date, @Param("excluded") List<String> excluded);
}
