package org.example.domain.comment.repository;

import org.example.domain.comment.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByRefTypeAndRefIdOrderByIdDesc(String refType, Long refId, Pageable pageable);
}
