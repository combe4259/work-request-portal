package org.example.domain.notification.repository;

import org.example.domain.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndIsReadOrderByIdDesc(Long userId, Boolean isRead, Pageable pageable);

    Page<Notification> findByIsReadOrderByIdDesc(Boolean isRead, Pageable pageable);
}
