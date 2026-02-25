package org.example.domain.activityLog.repository;

import org.example.domain.activityLog.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findByTeamIdAndRefTypeAndRefIdOrderByIdDesc(
            Long teamId,
            String refType,
            Long refId,
            Pageable pageable
    );
}
