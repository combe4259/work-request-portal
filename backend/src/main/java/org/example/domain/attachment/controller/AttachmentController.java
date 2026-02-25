package org.example.domain.attachment.controller;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.service.AttachmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public List<AttachmentListResponse> getAttachments(
            @RequestParam String refType,
            @RequestParam Long refId
    ) {
        return attachmentService.findList(refType, refId);
    }

    @GetMapping("/{id}")
    public AttachmentDetailResponse getAttachment(@PathVariable Long id) {
        return attachmentService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createAttachment(@RequestBody AttachmentCreateRequest request) {
        Long id = attachmentService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateAttachment(
            @PathVariable Long id,
            @RequestBody AttachmentUpdateRequest request
    ) {
        attachmentService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id) {
        attachmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
