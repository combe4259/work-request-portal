package org.example.domain.auth.repository;

import org.example.domain.auth.entity.AuthRefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, Long> {

    Optional<AuthRefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    List<AuthRefreshToken> findByUserIdAndRevokedAtIsNull(Long userId);
}
