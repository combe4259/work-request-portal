package org.example.global.slack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.defect.service.DefectService;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.deployment.service.DeploymentService;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.techTask.service.TechTaskService;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.testScenario.service.TestScenarioService;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.domain.workRequest.service.WorkRequestService;
import org.example.global.team.TeamRequestContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/slack")
public class SlackInteractionController {

    private static final Logger log = LoggerFactory.getLogger(SlackInteractionController.class);

    private final ObjectMapper objectMapper;
    private final WorkRequestService workRequestService;
    private final TechTaskService techTaskService;
    private final TestScenarioService testScenarioService;
    private final DefectService defectService;
    private final DeploymentService deploymentService;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;

    public SlackInteractionController(
            ObjectMapper objectMapper,
            WorkRequestService workRequestService,
            TechTaskService techTaskService,
            TestScenarioService testScenarioService,
            DefectService defectService,
            DeploymentService deploymentService,
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository
    ) {
        this.objectMapper = objectMapper;
        this.workRequestService = workRequestService;
        this.techTaskService = techTaskService;
        this.testScenarioService = testScenarioService;
        this.defectService = defectService;
        this.deploymentService = deploymentService;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
    }

    // Slack은 3초 이내 200 응답을 요구함
    @PostMapping("/interactions")
    public ResponseEntity<Void> handleInteraction(@RequestParam("payload") String payloadJson) {
        try {
            JsonNode payload = objectMapper.readTree(payloadJson);
            JsonNode actions = payload.path("actions");
            if (actions.isEmpty()) {
                return ResponseEntity.ok().build();
            }

            String actionName = actions.get(0).path("name").asText();
            String actionValue = actions.get(0).path("value").asText();

            if ("start_work".equals(actionName)) {
                handleStartWork(actionValue);
            }
        } catch (Exception ex) {
            log.warn("Slack 인터랙션 처리 실패", ex);
        }
        return ResponseEntity.ok().build();
    }

    // value 형식: {refType}:{refId}
    private void handleStartWork(String value) {
        String[] parts = value.split(":");
        if (parts.length < 2) {
            log.warn("처리 시작 버튼 value 형식 오류: {}", value);
            return;
        }

        String refType = parts[0];
        Long refId = parseLongOrNull(parts[1]);
        if (refId == null) {
            log.warn("처리 시작 버튼 refId 누락: {}", value);
            return;
        }

        // 엔티티에서 teamId 직접 조회
        Long teamId = resolveTeamId(refType, refId);
        if (teamId == null) {
            log.warn("teamId 조회 실패. refType={}, refId={}", refType, refId);
            return;
        }

        TeamRequestContext.set(null, teamId);
        try {
            switch (refType) {
                case "WORK_REQUEST"  -> workRequestService.updateStatus(refId, new WorkRequestStatusUpdateRequest("개발중", "Slack에서 처리 시작"));
                case "TECH_TASK"     -> techTaskService.updateStatus(refId, new TechTaskStatusUpdateRequest("개발중", "Slack에서 처리 시작"));
                case "TEST_SCENARIO" -> testScenarioService.updateStatus(refId, new TestScenarioStatusUpdateRequest("실행중", "Slack에서 처리 시작"));
                case "DEFECT"        -> defectService.updateStatus(refId, new DefectStatusUpdateRequest("분석중", "Slack에서 처리 시작"));
                case "DEPLOYMENT"    -> deploymentService.updateStatus(refId, new DeploymentStatusUpdateRequest("진행중", "Slack에서 처리 시작"));
                default -> log.warn("처리 시작 미지원 도메인: {}", refType);
            }
            log.info("Slack 처리 시작 완료. refType={}, refId={}, teamId={}", refType, refId, teamId);
        } finally {
            TeamRequestContext.clear();
        }
    }

    private Long resolveTeamId(String refType, Long refId) {
        return switch (refType) {
            case "WORK_REQUEST"  -> workRequestRepository.findById(refId).map(e -> e.getTeamId()).orElse(null);
            case "TECH_TASK"     -> techTaskRepository.findById(refId).map(e -> e.getTeamId()).orElse(null);
            case "TEST_SCENARIO" -> testScenarioRepository.findById(refId).map(e -> e.getTeamId()).orElse(null);
            case "DEFECT"        -> defectRepository.findById(refId).map(e -> e.getTeamId()).orElse(null);
            case "DEPLOYMENT"    -> deploymentRepository.findById(refId).map(e -> e.getTeamId()).orElse(null);
            default -> null;
        };
    }

    private Long parseLongOrNull(String s) {
        if (s == null || s.isBlank() || "null".equals(s)) return null;
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
