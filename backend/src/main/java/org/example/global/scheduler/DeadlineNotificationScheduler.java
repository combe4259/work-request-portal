package org.example.global.scheduler;

import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * 매일 오전 9시, 마감 3일 전인 미완료 항목의 담당자에게 마감임박 알림 발송
 */
@Component
public class DeadlineNotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeadlineNotificationScheduler.class);
    private static final int DAYS_BEFORE = 3;

    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final NotificationEventService notificationEventService;

    public DeadlineNotificationScheduler(
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            NotificationEventService notificationEventService
    ) {
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.notificationEventService = notificationEventService;
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void checkDeadlines() {
        LocalDate target = LocalDate.now().plusDays(DAYS_BEFORE);
        log.info("마감임박 알림 체크 시작: target={}", target);

        checkWorkRequests(target);
        checkTechTasks(target);
        checkTestScenarios(target);
        checkDefects(target);
        checkDeployments(target);

        log.info("마감임박 알림 체크 완료");
    }

    private void checkWorkRequests(LocalDate target) {
        var items = workRequestRepository.findActiveByDeadline(
                target, List.of("완료", "반려"));
        for (var item : items) {
            notify(item.getAssigneeId(), "WORK_REQUEST", item.getId(),
                    item.getRequestNo() + " '" + item.getTitle() + "' 마감일이 " + DAYS_BEFORE + "일 후입니다.");
        }
    }

    private void checkTechTasks(LocalDate target) {
        var items = techTaskRepository.findActiveByDeadline(
                target, List.of("완료", "반려"));
        for (var item : items) {
            notify(item.getAssigneeId(), "TECH_TASK", item.getId(),
                    item.getTaskNo() + " '" + item.getTitle() + "' 마감일이 " + DAYS_BEFORE + "일 후입니다.");
        }
    }

    private void checkTestScenarios(LocalDate target) {
        var items = testScenarioRepository.findActiveByDeadline(
                target, List.of("통과", "실패", "보류"));
        for (var item : items) {
            notify(item.getAssigneeId(), "TEST_SCENARIO", item.getId(),
                    item.getScenarioNo() + " '" + item.getTitle() + "' 마감일이 " + DAYS_BEFORE + "일 후입니다.");
        }
    }

    private void checkDefects(LocalDate target) {
        var items = defectRepository.findActiveByDeadline(
                target, List.of("완료", "재현불가", "보류"));
        for (var item : items) {
            notify(item.getAssigneeId(), "DEFECT", item.getId(),
                    item.getDefectNo() + " '" + item.getTitle() + "' 마감일이 " + DAYS_BEFORE + "일 후입니다.");
        }
    }

    private void checkDeployments(LocalDate target) {
        var items = deploymentRepository.findActiveByScheduledAt(
                target, List.of("완료", "실패", "롤백"));
        for (var item : items) {
            notify(item.getManagerId(), "DEPLOYMENT", item.getId(),
                    item.getDeployNo() + " '" + item.getTitle() + "' 배포 예정일이 " + DAYS_BEFORE + "일 후입니다.");
        }
    }

    private void notify(Long userId, String refType, Long refId, String message) {
        if (userId == null) {
            return;
        }
        try {
            notificationEventService.create(userId, "마감임박", "마감 " + DAYS_BEFORE + "일 전 알림", message, refType, refId);
        } catch (RuntimeException ex) {
            log.warn("마감임박 알림 발송 실패. refType={}, refId={}", refType, refId, ex);
        }
    }
}
