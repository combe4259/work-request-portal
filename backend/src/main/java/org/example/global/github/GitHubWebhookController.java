package org.example.global.github;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhook")
public class GitHubWebhookController {

    private final GitHubWebhookSignatureVerifier signatureVerifier;
    private final GitHubWebhookService gitHubWebhookService;

    public GitHubWebhookController(
            GitHubWebhookSignatureVerifier signatureVerifier,
            GitHubWebhookService gitHubWebhookService
    ) {
        this.signatureVerifier = signatureVerifier;
        this.gitHubWebhookService = gitHubWebhookService;
    }

    @PostMapping("/github")
    public ResponseEntity<Void> receive(
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody(required = false) String payload
    ) {
        String body = payload == null ? "" : payload;
        if (!signatureVerifier.isValid(body, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (deliveryId == null || deliveryId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        gitHubWebhookService.handleEvent(deliveryId, eventType, body);
        return ResponseEntity.ok().build();
    }
}
