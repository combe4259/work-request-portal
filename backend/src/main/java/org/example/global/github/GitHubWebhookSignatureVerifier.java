package org.example.global.github;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class GitHubWebhookSignatureVerifier {

    private static final Logger log = LoggerFactory.getLogger(GitHubWebhookSignatureVerifier.class);

    private static final String SIGNATURE_PREFIX = "sha256=";
    private static final String HMAC_SHA_256 = "HmacSHA256";

    private final String webhookSecret;

    public GitHubWebhookSignatureVerifier(@Value("${app.github.webhook-secret:}") String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public boolean isValid(String payload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("GitHub webhook secret이 설정되지 않았습니다.");
            return false;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
            return false;
        }

        try {
            String normalizedPayload = payload == null ? "" : payload;
            String expectedSignature = SIGNATURE_PREFIX + hmacHex(normalizedPayload, webhookSecret);

            return MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    signatureHeader.getBytes(StandardCharsets.UTF_8)
            );
        } catch (RuntimeException ex) {
            log.warn("GitHub webhook 서명 검증 중 오류가 발생했습니다.", ex);
            return false;
        }
    }

    private String hmacHex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA_256);
            mac.init(keySpec);
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("GitHub webhook HMAC 계산에 실패했습니다.", ex);
        }
    }
}
