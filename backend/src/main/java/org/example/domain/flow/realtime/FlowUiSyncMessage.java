package org.example.domain.flow.realtime;

public record FlowUiSyncMessage(
        Long workRequestId,
        Long actorUserId,
        long syncedAtEpochMs
) {
}
