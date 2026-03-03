package org.example.global.config;

import org.example.domain.team.repository.UserTeamRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketFlowSecurityInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserTeamRepository userTeamRepository;

    @Mock
    private WorkRequestRepository workRequestRepository;

    @InjectMocks
    private WebSocketFlowSecurityInterceptor interceptor;

    @Test
    @DisplayName("CONNECT 헤더 인증정보는 세션에 캐시된다")
    void connectCachesAuthContext() {
        when(jwtTokenProvider.extractUserId("token")).thenReturn(2L);

        Map<String, Object> sessionAttributes = new HashMap<>();
        Message<byte[]> connectMessage = buildMessage(
                StompCommand.CONNECT,
                null,
                "Bearer token",
                "10",
                sessionAttributes
        );

        interceptor.preSend(connectMessage, null);

        assertThat(sessionAttributes.get("wsUserId")).isEqualTo(2L);
        assertThat(sessionAttributes.get("wsTeamId")).isEqualTo(10L);
    }

    @Test
    @DisplayName("유효한 팀 멤버는 flow-ui 구독을 허용한다")
    void subscribeAllowsAuthorizedMember() {
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("wsUserId", 2L);
        sessionAttributes.put("wsTeamId", 10L);

        WorkRequest workRequest = new WorkRequest();
        workRequest.setId(15L);
        workRequest.setTeamId(10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(workRequest));
        when(userTeamRepository.existsByUserIdAndTeamId(2L, 10L)).thenReturn(true);

        Message<byte[]> subscribeMessage = buildMessage(
                StompCommand.SUBSCRIBE,
                "/topic/work-requests/15/flow-ui",
                null,
                null,
                sessionAttributes
        );

        Message<?> result = interceptor.preSend(subscribeMessage, null);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("flow-ui 구독 시 팀이 다르면 예외를 던진다")
    void subscribeRejectsWhenTeamMismatched() {
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("wsUserId", 2L);
        sessionAttributes.put("wsTeamId", 11L);

        WorkRequest workRequest = new WorkRequest();
        workRequest.setId(15L);
        workRequest.setTeamId(10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(workRequest));

        Message<byte[]> subscribeMessage = buildMessage(
                StompCommand.SUBSCRIBE,
                "/topic/work-requests/15/flow-ui",
                null,
                null,
                sessionAttributes
        );

        assertThatThrownBy(() -> interceptor.preSend(subscribeMessage, null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    private Message<byte[]> buildMessage(
            StompCommand command,
            String destination,
            String authorization,
            String teamId,
            Map<String, Object> sessionAttributes
    ) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("session-1");
        accessor.setSessionAttributes(sessionAttributes);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        if (teamId != null) {
            accessor.setNativeHeader("X-Team-Id", teamId);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
