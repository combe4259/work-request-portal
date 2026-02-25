package org.example.domain.user.dto;

public record UserPreferencesResponse(
        Notification notification,
        Display display
) {
    public record Notification(
            boolean assign,
            boolean comment,
            boolean deadline,
            boolean status,
            boolean deploy,
            boolean mention
    ) {
    }

    public record Display(
            String landing,
            int rowCount
    ) {
    }
}
