package org.example.domain.notification.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationDetailResponse;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUnreadCountsResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.example.domain.notification.service.NotificationService;
import org.example.global.security.JwtTokenProvider;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtTokenProvider jwtTokenProvider;

    public NotificationController(NotificationService notificationService, JwtTokenProvider jwtTokenProvider) {
        this.notificationService = notificationService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @GetMapping
    public Page<NotificationListResponse> getNotifications(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Boolean read,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return notificationService.findPage(userId, read, page, size);
    }

    @GetMapping("/unread-counts")
    public NotificationUnreadCountsResponse getUnreadCounts(HttpServletRequest request) {
        Long userId = extractUserIdFromToken(request);
        return notificationService.findUnreadCounts(userId);
    }

    @GetMapping("/{id}")
    public NotificationDetailResponse getNotification(@PathVariable Long id) {
        return notificationService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createNotification(@RequestBody NotificationCreateRequest request) {
        Long id = notificationService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateNotification(
            @PathVariable Long id,
            @RequestBody NotificationUpdateRequest request
    ) {
        notificationService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> updateReadState(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean read
    ) {
        notificationService.updateReadState(id, read);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> updateAllReadState(
            @RequestParam(defaultValue = "true") boolean read,
            HttpServletRequest request
    ) {
        Long userId = extractUserIdFromToken(request);
        notificationService.updateAllReadState(userId, read);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-by-ref")
    public ResponseEntity<Void> updateReadStateByRef(
            @RequestParam String refType,
            @RequestParam Long refId,
            @RequestParam(defaultValue = "true") boolean read,
            HttpServletRequest request
    ) {
        Long userId = extractUserIdFromToken(request);
        notificationService.updateReadStateByRef(userId, refType, refId, read);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Long extractUserIdFromToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }
        return jwtTokenProvider.extractUserId(authorization.substring(7).trim());
    }
}
