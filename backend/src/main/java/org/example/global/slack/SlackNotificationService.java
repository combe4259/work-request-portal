package org.example.global.slack;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SlackNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SlackNotificationService.class);
    private static final String SLACK_API_URL = "https://slack.com/api/chat.postMessage";

    private final String botToken;
    private final String channel;
    private final String portalUrl;
    private final RestTemplate restTemplate;

    public SlackNotificationService(
            @Value("${app.slack.bot-token:}") String botToken,
            @Value("${app.slack.channel:}") String channel,
            @Value("${app.slack.portal-url:}") String portalUrl
    ) {
        this.botToken = botToken;
        this.channel = channel;
        this.portalUrl = portalUrl;
        this.restTemplate = new RestTemplate();
    }

    public void send(String type, String title, String message, String refType, Long refId) {
        if (botToken == null || botToken.isBlank()) {
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(botToken);

            Map<String, Object> body = buildPayload(type, title, message, refType, refId);
            restTemplate.postForObject(SLACK_API_URL, new HttpEntity<>(body, headers), String.class);
        } catch (Exception ex) {
            log.warn("Slack 메시지 발송 실패. type={}, title={}", type, title, ex);
        }
    }

    private Map<String, Object> buildPayload(String type, String title, String message, String refType, Long refId) {
        Map<String, Object> attachment = new HashMap<>();

        // 왼쪽 컬러 바
        attachment.put("color", resolveColor(type));

        // 유형 라벨 (상단 작은 텍스트)
        attachment.put("author_name", type);

        // 본문 — message 우선, 없으면 title fallback
        String body = (message != null && !message.isBlank()) ? message : title;

        // 포탈 링크 추가
        String link = buildPortalLink(refType, refId);
        String fullBody = (link != null) ? body + "\n" + link : body;
        attachment.put("text", fullBody);

        // 하단 컨텍스트 + 발생 시각
        if (refType != null && refId != null) {
            attachment.put("footer", resolveRefTypeLabel(refType) + "  ·  #" + refId);
        }
        attachment.put("ts", Instant.now().getEpochSecond());

        // mrkdwn 적용 범위
        attachment.put("mrkdwn_in", List.of("pretext", "text", "footer"));

        Map<String, Object> payload = new HashMap<>();
        payload.put("channel", channel);
        payload.put("attachments", List.of(attachment));
        return payload;
    }

    private String buildPortalLink(String refType, Long refId) {
        if (portalUrl == null || portalUrl.isBlank() || refType == null || refId == null) {
            return null;
        }
        String path = switch (refType) {
            case "WORK_REQUEST"  -> "/work-requests/";
            case "TECH_TASK"     -> "/tech-tasks/";
            case "TEST_SCENARIO" -> "/test-scenarios/";
            case "DEFECT"        -> "/defects/";
            case "DEPLOYMENT"    -> "/deployments/";
            case "IDEA"          -> "/ideas/";
            case "MEETING_NOTE"  -> "/meeting-notes/";
            default              -> null;
        };
        if (path == null) return null;
        return "<" + portalUrl + path + refId + "|바로가기 →>";
    }

    private String resolveColor(String type) {
        if (type == null) return "#868E96";
        return switch (type) {
            case "담당자배정"   -> "#4A90D9";
            case "상태변경"    -> "#F5A623";
            case "배포완료"    -> "#27AE60";
            case "배포실패"    -> "#E74C3C";
            case "아이디어채택" -> "#9B59B6";
            case "마감임박"    -> "#E67E22";
            case "댓글등록"    -> "#3498DB";
            case "멘션"       -> "#1ABC9C";
            default           -> "#868E96";
        };
    }

    private String resolveRefTypeLabel(String refType) {
        if (refType == null) return "";
        return switch (refType) {
            case "WORK_REQUEST"  -> "업무요청";
            case "TECH_TASK"     -> "기술과제";
            case "TEST_SCENARIO" -> "테스트 시나리오";
            case "DEFECT"        -> "결함";
            case "DEPLOYMENT"    -> "배포";
            case "IDEA"          -> "아이디어";
            case "MEETING_NOTE"  -> "회의록";
            default              -> refType;
        };
    }
}
