package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationDetailResponse;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.example.domain.notification.entity.Notification;
import org.example.domain.notification.mapper.NotificationMapper;
import org.example.domain.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public Page<NotificationListResponse> findPage(Long userId, Boolean isRead, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));

        if (userId != null && isRead != null) {
            return notificationRepository.findByUserIdAndIsReadOrderByIdDesc(userId, isRead, pageable)
                    .map(NotificationMapper::toListResponse);
        }
        if (userId != null) {
            return notificationRepository.findByUserIdOrderByIdDesc(userId, pageable)
                    .map(NotificationMapper::toListResponse);
        }
        if (isRead != null) {
            return notificationRepository.findByIsReadOrderByIdDesc(isRead, pageable)
                    .map(NotificationMapper::toListResponse);
        }

        return notificationRepository.findAll(pageable)
                .map(NotificationMapper::toListResponse);
    }

    @Override
    public NotificationDetailResponse findById(Long id) {
        Notification entity = getNotificationOrThrow(id);
        return NotificationMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(NotificationCreateRequest request) {
        validateCreateRequest(request);

        Notification entity = NotificationMapper.fromCreateRequest(request);
        entity.setType(request.type().trim());
        entity.setTitle(request.title().trim());
        entity.setMessage(normalizeNullable(request.message()));
        entity.setRefType(normalizeNullable(request.refType()));

        return notificationRepository.save(entity).getId();
    }

    @Override
    @Transactional
    public void update(Long id, NotificationUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Notification entity = getNotificationOrThrow(id);

        if (request.type() != null && request.type().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type은 빈 값일 수 없습니다.");
        }
        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 빈 값일 수 없습니다.");
        }

        NotificationMapper.applyUpdate(entity, request);

        if (request.type() != null) {
            entity.setType(request.type().trim());
        }
        if (request.title() != null) {
            entity.setTitle(request.title().trim());
        }
        if (request.message() != null) {
            entity.setMessage(normalizeNullable(request.message()));
        }
        if (request.refType() != null) {
            entity.setRefType(normalizeNullable(request.refType()));
        }
    }

    @Override
    @Transactional
    public void updateReadState(Long id, boolean isRead) {
        Notification entity = getNotificationOrThrow(id);
        entity.setIsRead(isRead);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Notification entity = getNotificationOrThrow(id);
        notificationRepository.delete(entity);
    }

    private Notification getNotificationOrThrow(Long id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));
    }

    private void validateCreateRequest(NotificationCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.userId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId는 필수입니다.");
        }
        if (request.type() == null || request.type().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type은 필수입니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
