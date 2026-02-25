package org.example.domain.notification.repository;

import org.example.domain.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndIsReadOrderByIdDesc(Long userId, Boolean isRead, Pageable pageable);

    Page<Notification> findByIsReadOrderByIdDesc(Boolean isRead, Pageable pageable);

    @Modifying
    @Query("update Notification n set n.isRead = :isRead where n.userId = :userId")
    int updateReadStateByUserId(@Param("userId") Long userId, @Param("isRead") boolean isRead);
}
