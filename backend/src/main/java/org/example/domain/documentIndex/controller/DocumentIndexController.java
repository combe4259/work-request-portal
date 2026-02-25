package org.example.domain.documentIndex.controller;

import org.example.domain.documentIndex.dto.DocumentIndexSearchItemResponse;
import org.example.domain.documentIndex.service.DocumentIndexService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/document-index")
public class DocumentIndexController {

    private final DocumentIndexService documentIndexService;

    public DocumentIndexController(DocumentIndexService documentIndexService) {
        this.documentIndexService = documentIndexService;
    }

    @GetMapping("/search")
    public Page<DocumentIndexSearchItemResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> types,
            @RequestParam(required = false) Long teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return documentIndexService.search(q, types, teamId, page, size);
    }
}
