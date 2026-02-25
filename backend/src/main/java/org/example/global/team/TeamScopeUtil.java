package org.example.global.team;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class TeamScopeUtil {

    private TeamScopeUtil() {
    }

    public static Long currentTeamId() {
        return TeamRequestContext.getCurrentTeamId();
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
}
