package org.example.domain.documentIndex.dto;

public record DocumentIndexSearchItemResponse(
        String refType,
        Long refId,
        String docNo,
        String title,
        String status
) {
}
