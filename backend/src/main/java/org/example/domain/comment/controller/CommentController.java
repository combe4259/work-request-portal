package org.example.domain.comment.controller;

import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentDetailResponse;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.example.domain.comment.service.CommentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public Page<CommentListResponse> getComments(
            @RequestParam String refType,
            @RequestParam Long refId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return commentService.findPage(refType, refId, page, size);
    }

    @GetMapping("/{id}")
    public CommentDetailResponse getComment(@PathVariable Long id) {
        return commentService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createComment(@RequestBody CommentCreateRequest request) {
        Long id = commentService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> updateComment(
            @PathVariable Long id,
            @RequestBody CommentUpdateRequest request
    ) {
        commentService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
