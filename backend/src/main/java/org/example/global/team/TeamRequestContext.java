package org.example.global.team;

public final class TeamRequestContext {

    private static final ThreadLocal<Long> CURRENT_USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> CURRENT_TEAM_ID = new ThreadLocal<>();

    private TeamRequestContext() {
    }

    public static void set(Long userId, Long teamId) {
        CURRENT_USER_ID.set(userId);
        CURRENT_TEAM_ID.set(teamId);
    }

    public static Long getCurrentUserId() {
        return CURRENT_USER_ID.get();
    }

    public static Long getCurrentTeamId() {
        return CURRENT_TEAM_ID.get();
    }

    public static void clear() {
        CURRENT_USER_ID.remove();
        CURRENT_TEAM_ID.remove();
    }
}
