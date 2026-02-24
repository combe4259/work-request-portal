package org.example.domain.workRequest.repository;

import jakarta.persistence.EntityManager;
import org.example.domain.workRequest.entity.WorkRequest;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class WorkRequestQueryRepository {

    private final EntityManager entityManager;

    public WorkRequestQueryRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public List<WorkRequest> findRecentByTeam(Long teamId, int size) {
        String jpql = """
                select wr
                from WorkRequest wr
                where wr.teamId = :teamId
                order by wr.id desc
                """;

        return entityManager.createQuery(jpql, WorkRequest.class)
                .setParameter("teamId", teamId)
                .setMaxResults(size)
                .getResultList();
    }
}
