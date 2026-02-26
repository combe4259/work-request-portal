package org.example.domain.comment.repository;

import org.example.domain.comment.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByRefTypeAndRefIdOrderByIdDesc(String refType, Long refId, Pageable pageable);

    @Query("""
            select c.refId as refId, count(c.id) as commentCount
            from Comment c
            where c.refType = :refType
              and c.refId in :refIds
            group by c.refId
            """)
    List<CommentCountProjection> countByRefTypeAndRefIds(
            @Param("refType") String refType,
            @Param("refIds") List<Long> refIds
    );

    interface CommentCountProjection {
        Long getRefId();

        long getCommentCount();
    }
}
