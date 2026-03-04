package org.example.global.github.repository;

import org.example.global.github.entity.GitHubWebhookDelivery;
import org.example.global.github.entity.GitHubWebhookDeliveryStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GitHubWebhookDeliveryRepository extends JpaRepository<GitHubWebhookDelivery, Long> {
    Optional<GitHubWebhookDelivery> findByDeliveryId(String deliveryId);

    List<GitHubWebhookDelivery> findByStatusAndNextRetryAtLessThanEqualOrderByNextRetryAtAscIdAsc(
            GitHubWebhookDeliveryStatus status,
            LocalDateTime nextRetryAt,
            Pageable pageable
    );
}
