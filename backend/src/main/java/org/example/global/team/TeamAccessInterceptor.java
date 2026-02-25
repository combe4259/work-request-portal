package org.example.global.team;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.domain.team.repository.UserTeamRepository;
import org.example.global.security.JwtTokenProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@ConditionalOnBean({JwtTokenProvider.class, UserTeamRepository.class})
public class TeamAccessInterceptor implements HandlerInterceptor {

    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String HEADER_TEAM_ID = "X-Team-Id";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserTeamRepository userTeamRepository;

    public TeamAccessInterceptor(
            JwtTokenProvider jwtTokenProvider,
            UserTeamRepository userTeamRepository
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userTeamRepository = userTeamRepository;
    }

    @Override
    @SuppressWarnings("java:S3516")
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String authorizationHeader = request.getHeader(HEADER_AUTHORIZATION);
        Long userId = extractUserId(authorizationHeader);
        Long teamId = extractTeamId(request.getHeader(HEADER_TEAM_ID), request.getParameter("teamId"));

        if (!userTeamRepository.existsByUserIdAndTeamId(userId, teamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "선택한 팀에 접근 권한이 없습니다.");
        }

        TeamRequestContext.set(userId, teamId);
        return true;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex
    ) {
        TeamRequestContext.clear();
    }

    private Long extractUserId(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || split[1].isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer 토큰 형식이 올바르지 않습니다.");
        }

        return jwtTokenProvider.extractUserId(split[1].trim());
    }

    private Long extractTeamId(String teamIdHeader, String teamIdParam) {
        String rawTeamId = teamIdHeader;
        if (rawTeamId == null || rawTeamId.isBlank()) {
            rawTeamId = teamIdParam;
        }
        if (rawTeamId == null || rawTeamId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Team-Id 헤더 또는 teamId 파라미터가 필요합니다.");
        }

        try {
            Long teamId = Long.parseLong(rawTeamId.trim());
            if (teamId <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 X-Team-Id 입니다.");
            }
            return teamId;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 X-Team-Id 입니다.");
        }
    }
}
