package org.example.global.slack;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class SlackNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SlackNotificationService.class);
    private static final String SLACK_API_URL = "https://slack.com/api/chat.postMessage";

    private final String botToken;
    private final String channel;
    private final RestTemplate restTemplate;

    public SlackNotificationService(
            @Value("${app.slack.bot-token:}") String botToken,
            @Value("${app.slack.channel:}") String channel
    ) {
        this.botToken = botToken;
        this.channel = channel;
        this.restTemplate = new RestTemplate();
    }

    public void send(String type, String title, String message) {
        if (botToken == null || botToken.isBlank()) {
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(botToken);

            String text = buildText(type, title, message);
            Map<String, String> body = Map.of("channel", channel, "text", text);

            restTemplate.postForObject(SLACK_API_URL, new HttpEntity<>(body, headers), String.class);
        } catch (Exception ex) {
            log.warn("Slack 메시지 발송 실패. type={}, title={}", type, title, ex);
        }
    }

    private String buildText(String type, String title, String message) {
        StringBuilder sb = new StringBuilder();
        sb.append("*[").append(type).append("]* ").append(title);
        if (message != null && !message.isBlank()) {
            sb.append("\n").append(message);
        }
        return sb.toString();
    }
}
