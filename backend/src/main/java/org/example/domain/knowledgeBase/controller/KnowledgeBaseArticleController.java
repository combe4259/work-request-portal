package org.example.domain.knowledgeBase.controller;

import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefsUpdateRequest;
import org.example.domain.knowledgeBase.service.KnowledgeBaseArticleService;
import org.springframework.data.domain.Page;
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
@RequestMapping("/api/knowledge-base")
public class KnowledgeBaseArticleController {

    private final KnowledgeBaseArticleService knowledgeBaseArticleService;

    public KnowledgeBaseArticleController(KnowledgeBaseArticleService knowledgeBaseArticleService) {
        this.knowledgeBaseArticleService = knowledgeBaseArticleService;
    }

    @GetMapping
    public Page<KnowledgeBaseArticleListResponse> getArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return knowledgeBaseArticleService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public KnowledgeBaseArticleDetailResponse getArticle(@PathVariable Long id) {
        return knowledgeBaseArticleService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createArticle(@RequestBody KnowledgeBaseArticleCreateRequest request) {
        Long id = knowledgeBaseArticleService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateArticle(
            @PathVariable Long id,
            @RequestBody KnowledgeBaseArticleUpdateRequest request
    ) {
        knowledgeBaseArticleService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        knowledgeBaseArticleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Void> increaseViewCount(@PathVariable Long id) {
        knowledgeBaseArticleService.increaseViewCount(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related-refs")
    public ResponseEntity<List<KnowledgeBaseRelatedRefResponse>> getRelatedRefs(@PathVariable Long id) {
        return ResponseEntity.ok(knowledgeBaseArticleService.getRelatedRefs(id));
    }

    @PutMapping("/{id}/related-refs")
    public ResponseEntity<Void> replaceRelatedRefs(
            @PathVariable Long id,
            @RequestBody KnowledgeBaseRelatedRefsUpdateRequest request
    ) {
        knowledgeBaseArticleService.replaceRelatedRefs(id, request);
        return ResponseEntity.noContent().build();
    }
}
