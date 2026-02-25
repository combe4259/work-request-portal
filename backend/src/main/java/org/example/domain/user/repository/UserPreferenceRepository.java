package org.example.domain.user.repository;

import org.example.domain.user.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
}
