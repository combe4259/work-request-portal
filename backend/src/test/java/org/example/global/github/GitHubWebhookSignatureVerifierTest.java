package org.example.global.github;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class GitHubWebhookSignatureVerifierTest {

    @Test
    @DisplayName("payload와 signature가 일치하면 true를 반환한다")
    void returnsTrueForMatchingSignature() {
        String secret = "secret-key";
        String payload = "{\"hello\":\"world\"}";
        String signature = "sha256=" + hmacHex(payload, secret);

        GitHubWebhookSignatureVerifier verifier = new GitHubWebhookSignatureVerifier(secret);

        assertThat(verifier.isValid(payload, signature)).isTrue();
    }

    @Test
    @DisplayName("signature가 다르면 false를 반환한다")
    void returnsFalseForDifferentSignature() {
        GitHubWebhookSignatureVerifier verifier = new GitHubWebhookSignatureVerifier("secret-key");

        assertThat(verifier.isValid("{\"hello\":\"world\"}", "sha256=not-matching")).isFalse();
    }

    @Test
    @DisplayName("secret이 비어 있으면 false를 반환한다")
    void returnsFalseWhenSecretMissing() {
        GitHubWebhookSignatureVerifier verifier = new GitHubWebhookSignatureVerifier("");

        assertThat(verifier.isValid("{}", "sha256=abc")).isFalse();
    }

    private String hmacHex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}

