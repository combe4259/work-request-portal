package org.example.global.team;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

public final class TeamScopeUtil {

    private TeamScopeUtil() {
    }

    public static Long currentTeamId() {
        Long contextTeamId = TeamRequestContext.getCurrentTeamId();
        if (contextTeamId != null) {
            return contextTeamId;
        }
        return resolveTeamIdFromRequest();
    }

    public static Long resolveTeamId(Long requestTeamId) {
        Long current = currentTeamId();
        if (current != null) {
            return current;
        }
        return requestTeamId;
    }

    public static void ensureAccessible(Long entityTeamId) {
        Long current = currentTeamId();
        if (current == null || entityTeamId == null) {
            return;
        }
        if (!current.equals(entityTeamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "현재 팀에서 접근할 수 없는 데이터입니다.");
        }
    }

    public static Long requireTeamId(Long requestTeamId) {
        Long resolved = resolveTeamId(requestTeamId);
        if (resolved == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
        return resolved;
    }

    private static Long resolveTeamIdFromRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }

        HttpServletRequest request = attributes.getRequest();

        String rawTeamId = request.getHeader("X-Team-Id");
        if (rawTeamId == null || rawTeamId.isBlank()) {
            rawTeamId = request.getParameter("teamId");
        }
        if (rawTeamId == null || rawTeamId.isBlank()) {
            return null;
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
