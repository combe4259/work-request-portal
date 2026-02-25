package org.example.domain.documentIndex.service;

import org.example.domain.documentIndex.entity.DocumentIndex;
import org.example.domain.documentIndex.repository.DocumentIndexRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class DocumentIndexSyncService {

    private static final Set<String> ALLOWED_REF_TYPES = Set.of(
            "WORK_REQUEST",
            "TECH_TASK",
            "TEST_SCENARIO",
            "DEFECT",
            "DEPLOYMENT",
            "MEETING_NOTE",
            "PROJECT_IDEA",
            "KNOWLEDGE_BASE"
    );

    private final DocumentIndexRepository documentIndexRepository;

    public DocumentIndexSyncService(DocumentIndexRepository documentIndexRepository) {
        this.documentIndexRepository = documentIndexRepository;
    }

    @Transactional
    public void upsert(String refType, Long refId, Long teamId, String docNo, String title, String status) {
        if (refId == null || teamId == null || isBlank(refType) || isBlank(docNo) || isBlank(title)) {
            return;
        }

        String normalizedRefType = normalizeRefType(refType);
        if (normalizedRefType == null) {
            return;
        }

        DocumentIndex row = documentIndexRepository.findByTeamIdAndRefTypeAndRefId(teamId, normalizedRefType, refId)
                .orElseGet(DocumentIndex::new);

        row.setTeamId(teamId);
        row.setRefType(normalizedRefType);
        row.setRefId(refId);
        row.setDocNo(docNo.trim());
        row.setTitle(title.trim());
        row.setStatus(normalizeNullable(status));

        documentIndexRepository.save(row);
    }

    @Transactional
    public void delete(String refType, Long refId, Long teamId) {
        if (refId == null || teamId == null || isBlank(refType)) {
            return;
        }

        String normalizedRefType = normalizeRefType(refType);
        if (normalizedRefType == null) {
            return;
        }

        documentIndexRepository.deleteByTeamIdAndRefTypeAndRefId(teamId, normalizedRefType, refId);
    }

    private String normalizeRefType(String rawRefType) {
        String normalized = rawRefType.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_REF_TYPES.contains(normalized)) {
            return null;
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (isBlank(value)) {
            return null;
        }
        return value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
