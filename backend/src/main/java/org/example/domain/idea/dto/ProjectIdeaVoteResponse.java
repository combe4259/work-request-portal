package org.example.domain.idea.dto;

public record ProjectIdeaVoteResponse(
        boolean liked,
        long likeCount
) {
}
