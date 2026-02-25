package org.example.domain.documentIndex.service;

import org.example.domain.documentIndex.dto.DocumentIndexSearchItemResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface DocumentIndexService {

    Page<DocumentIndexSearchItemResponse> search(String query, List<String> types, Long teamId, int page, int size);
}
