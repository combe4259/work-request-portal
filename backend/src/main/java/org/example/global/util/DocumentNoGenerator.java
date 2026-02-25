package org.example.global.util;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
public class DocumentNoGenerator {

    private final JdbcTemplate jdbcTemplate;

    public DocumentNoGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public String next(String prefix) {
        String normalizedPrefix = normalizePrefix(prefix);

        jdbcTemplate.update(
                "INSERT IGNORE INTO document_sequences (prefix, last_seq) VALUES (?, 0)",
                normalizedPrefix
        );

        Integer current = jdbcTemplate.queryForObject(
                "SELECT last_seq FROM document_sequences WHERE prefix = ? FOR UPDATE",
                Integer.class,
                normalizedPrefix
        );

        if (current == null) {
            throw new IllegalStateException("Failed to load document sequence for prefix: " + normalizedPrefix);
        }

        int next = current + 1;
        jdbcTemplate.update(
                "UPDATE document_sequences SET last_seq = ? WHERE prefix = ?",
                next,
                normalizedPrefix
        );

        return normalizedPrefix + "-" + String.format("%03d", next);
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            throw new IllegalArgumentException("Document prefix must not be blank.");
        }

        String normalized = prefix.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > 5) {
            throw new IllegalArgumentException("Document prefix must be 5 characters or less.");
        }
        return normalized;
    }
}
