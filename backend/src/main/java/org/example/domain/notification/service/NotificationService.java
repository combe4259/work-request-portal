package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationDetailResponse;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.springframework.data.domain.Page;

public interface NotificationService {

    Page<NotificationListResponse> findPage(Long userId, Boolean isRead, int page, int size);

    NotificationDetailResponse findById(Long id);

    Long create(NotificationCreateRequest request);

    void update(Long id, NotificationUpdateRequest request);

    void updateReadState(Long id, boolean isRead);

    void delete(Long id);
}
