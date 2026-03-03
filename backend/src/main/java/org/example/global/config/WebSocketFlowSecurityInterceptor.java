package org.example.global.config;

import org.example.domain.team.repository.UserTeamRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.security.JwtTokenProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WebSocketFlowSecurityInterceptor implements ChannelInterceptor {

    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String HEADER_TEAM_ID = "X-Team-Id";
    private static final String SESSION_USER_ID_KEY = "wsUserId";
    private static final String SESSION_TEAM_ID_KEY = "wsTeamId";
    private static final Pattern FLOW_UI_TOPIC_PATTERN = Pattern.compile("^/topic/work-requests/(\\d+)/flow-ui$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserTeamRepository userTeamRepository;
    private final WorkRequestRepository workRequestRepository;

    public WebSocketFlowSecurityInterceptor(
            JwtTokenProvider jwtTokenProvider,
            UserTeamRepository userTeamRepository,
            WorkRequestRepository workRequestRepository
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userTeamRepository = userTeamRepository;
        this.workRequestRepository = workRequestRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            cacheSessionContextFromHeaders(accessor);
            return message;
        }

        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            return message;
        }

        Matcher matcher = FLOW_UI_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            return message;
        }

        Long workRequestId = parsePositiveLong(matcher.group(1), "유효하지 않은 워크플로우 대상입니다.");
        SessionContext context = resolveRequiredSessionContext(accessor);
        WorkRequest workRequest = workRequestRepository.findById(workRequestId)
                .orElseThrow(() -> new MessageDeliveryException("워크플로우 대상 업무요청이 존재하지 않습니다."));

        if (!Objects.equals(workRequest.getTeamId(), context.teamId())) {
            throw new MessageDeliveryException("현재 팀으로는 이 워크플로우를 구독할 수 없습니다.");
        }

        boolean teamMember = userTeamRepository.existsByUserIdAndTeamId(context.userId(), context.teamId());
        if (!teamMember) {
            throw new MessageDeliveryException("현재 팀에 접근 권한이 없습니다.");
        }

        return message;
    }

    private void cacheSessionContextFromHeaders(StompHeaderAccessor accessor) {
        Long userId = extractUserId(accessor.getFirstNativeHeader(HEADER_AUTHORIZATION), false);
        Long teamId = extractTeamId(accessor.getFirstNativeHeader(HEADER_TEAM_ID), false);
        if (userId == null || teamId == null) {
            return;
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return;
        }
        sessionAttributes.put(SESSION_USER_ID_KEY, userId);
        sessionAttributes.put(SESSION_TEAM_ID_KEY, teamId);
    }

    private SessionContext resolveRequiredSessionContext(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        Long sessionUserId = sessionAttributes == null ? null : asLong(sessionAttributes.get(SESSION_USER_ID_KEY));
        Long sessionTeamId = sessionAttributes == null ? null : asLong(sessionAttributes.get(SESSION_TEAM_ID_KEY));

        if (sessionUserId != null && sessionTeamId != null) {
            return new SessionContext(sessionUserId, sessionTeamId);
        }

        Long userId = extractUserId(accessor.getFirstNativeHeader(HEADER_AUTHORIZATION), true);
        Long teamId = extractTeamId(accessor.getFirstNativeHeader(HEADER_TEAM_ID), true);

        if (sessionAttributes != null) {
            sessionAttributes.put(SESSION_USER_ID_KEY, userId);
            sessionAttributes.put(SESSION_TEAM_ID_KEY, teamId);
        }

        return new SessionContext(userId, teamId);
    }

    private Long extractUserId(String authorizationHeader, boolean required) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            if (required) {
                throw new MessageDeliveryException("웹소켓 인증 토큰이 필요합니다.");
            }
            return null;
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || split[1].isBlank()) {
            throw new MessageDeliveryException("웹소켓 Authorization 헤더 형식이 올바르지 않습니다.");
        }

        try {
            return jwtTokenProvider.extractUserId(split[1].trim());
        } catch (Exception ex) {
            throw new MessageDeliveryException("웹소켓 인증 토큰이 유효하지 않습니다.");
        }
    }

    private Long extractTeamId(String rawTeamId, boolean required) {
        if (rawTeamId == null || rawTeamId.isBlank()) {
            if (required) {
                throw new MessageDeliveryException("웹소켓 팀 정보(X-Team-Id)가 필요합니다.");
            }
            return null;
        }
        return parsePositiveLong(rawTeamId.trim(), "웹소켓 팀 정보(X-Team-Id)가 올바르지 않습니다.");
    }

    private Long parsePositiveLong(String rawValue, String errorMessage) {
        try {
            long value = Long.parseLong(rawValue);
            if (value <= 0) {
                throw new MessageDeliveryException(errorMessage);
            }
            return value;
        } catch (NumberFormatException ex) {
            throw new MessageDeliveryException(errorMessage);
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Long longValue) {
            return longValue;
        }
        if (value instanceof Integer integerValue) {
            return integerValue.longValue();
        }
        return null;
    }

    private record SessionContext(Long userId, Long teamId) {
    }
}
