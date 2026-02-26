package org.example.domain.idea.repository;

import org.example.domain.idea.entity.ProjectIdea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectIdeaRepository extends JpaRepository<ProjectIdea, Long> {

    @Query("""
            select i
            from ProjectIdea i
            where (:teamId is null or i.teamId = :teamId)
              and (:q is null or lower(i.title) like lower(concat('%', :q, '%'))
                   or lower(i.content) like lower(concat('%', :q, '%'))
                   or lower(i.ideaNo) like lower(concat('%', :q, '%')))
              and (:category is null or i.category = :category)
              and (:status is null or i.status = :status)
            """)
    Page<ProjectIdea> search(
            @Param("teamId") Long teamId,
            @Param("q") String q,
            @Param("category") String category,
            @Param("status") String status,
            Pageable pageable
    );

    @Query(
            value = """
                    select i
                    from ProjectIdea i
                    left join IdeaVote v on v.ideaId = i.id
                    where (:teamId is null or i.teamId = :teamId)
                      and (:q is null or lower(i.title) like lower(concat('%', :q, '%'))
                           or lower(i.content) like lower(concat('%', :q, '%'))
                           or lower(i.ideaNo) like lower(concat('%', :q, '%')))
                      and (:category is null or i.category = :category)
                      and (:status is null or i.status = :status)
                    group by i.id
                    order by count(v.id) desc, i.id desc
                    """,
            countQuery = """
                    select count(i)
                    from ProjectIdea i
                    where (:teamId is null or i.teamId = :teamId)
                      and (:q is null or lower(i.title) like lower(concat('%', :q, '%'))
                           or lower(i.content) like lower(concat('%', :q, '%'))
                           or lower(i.ideaNo) like lower(concat('%', :q, '%')))
                      and (:category is null or i.category = :category)
                      and (:status is null or i.status = :status)
                    """
    )
    Page<ProjectIdea> searchOrderByLikeCountDesc(
            @Param("teamId") Long teamId,
            @Param("q") String q,
            @Param("category") String category,
            @Param("status") String status,
            Pageable pageable
    );

    @Query(
            value = """
                    select i
                    from ProjectIdea i
                    left join IdeaVote v on v.ideaId = i.id
                    where (:teamId is null or i.teamId = :teamId)
                      and (:q is null or lower(i.title) like lower(concat('%', :q, '%'))
                           or lower(i.content) like lower(concat('%', :q, '%'))
                           or lower(i.ideaNo) like lower(concat('%', :q, '%')))
                      and (:category is null or i.category = :category)
                      and (:status is null or i.status = :status)
                    group by i.id
                    order by count(v.id) asc, i.id desc
                    """,
            countQuery = """
                    select count(i)
                    from ProjectIdea i
                    where (:teamId is null or i.teamId = :teamId)
                      and (:q is null or lower(i.title) like lower(concat('%', :q, '%'))
                           or lower(i.content) like lower(concat('%', :q, '%'))
                           or lower(i.ideaNo) like lower(concat('%', :q, '%')))
                      and (:category is null or i.category = :category)
                      and (:status is null or i.status = :status)
                    """
    )
    Page<ProjectIdea> searchOrderByLikeCountAsc(
            @Param("teamId") Long teamId,
            @Param("q") String q,
            @Param("category") String category,
            @Param("status") String status,
            Pageable pageable
    );
}
