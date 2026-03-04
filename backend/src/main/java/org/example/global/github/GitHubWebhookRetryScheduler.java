package org.example.global.github;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class GitHubWebhookRetryScheduler {

    private final GitHubWebhookService gitHubWebhookService;

    public GitHubWebhookRetryScheduler(GitHubWebhookService gitHubWebhookService) {
        this.gitHubWebhookService = gitHubWebhookService;
    }

    @Scheduled(fixedDelayString = "${app.github.retry.fixed-delay-ms:60000}")
    public void retryFailedDeliveries() {
        gitHubWebhookService.retryFailedDeliveries();
    }
}
