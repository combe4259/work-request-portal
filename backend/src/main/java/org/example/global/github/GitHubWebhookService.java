package org.example.global.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.defect.service.DefectService;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.deployment.service.DeploymentService;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskPrLink;
import org.example.domain.techTask.repository.TechTaskPrLinkRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.techTask.service.TechTaskService;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.domain.workRequest.service.WorkRequestService;
import org.example.global.github.entity.GitHubRepoTeamMapping;
import org.example.global.github.entity.GitHubWebhookDelivery;
import org.example.global.github.entity.GitHubWebhookDeliveryStatus;
import org.example.global.github.repository.GitHubRepoTeamMappingRepository;
import org.example.global.github.repository.GitHubWebhookDeliveryRepository;
import org.example.global.team.TeamRequestContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GitHubWebhookService {

    private static final Logger log = LoggerFactory.getLogger(GitHubWebhookService.class);

    private static final String EVENT_PULL_REQUEST = "pull_request";

    private static final Pattern DOC_NO_PATTERN = Pattern.compile("\\b([A-Za-z]{2,3}-\\d{1,9})\\b");
    private static final Pattern CLOSE_KEYWORD_PATTERN = Pattern.compile("\\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\b", Pattern.CASE_INSENSITIVE);

    private static final String STATUS_DONE = "완료";
    private static final String REF_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String REF_TYPE_TECH_TASK = "TECH_TASK";
    private static final String REF_TYPE_DEFECT = "DEFECT";
    private static final String REF_TYPE_DEPLOYMENT = "DEPLOYMENT";

    private final ObjectMapper objectMapper;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final TechTaskPrLinkRepository techTaskPrLinkRepository;
    private final WorkRequestService workRequestService;
    private final TechTaskService techTaskService;
    private final DefectService defectService;
    private final DeploymentService deploymentService;
    private final ActivityLogService activityLogService;
    private final GitHubRepoTeamMappingRepository gitHubRepoTeamMappingRepository;
    private final GitHubWebhookDeliveryRepository gitHubWebhookDeliveryRepository;

    private final int maxRetryAttempts;
    private final int retryBatchSize;
    private final long retryBaseSeconds;
    private final long retryMaxSeconds;

    public GitHubWebhookService(
            ObjectMapper objectMapper,
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            TechTaskPrLinkRepository techTaskPrLinkRepository,
            WorkRequestService workRequestService,
            TechTaskService techTaskService,
            DefectService defectService,
            DeploymentService deploymentService,
            ActivityLogService activityLogService,
            GitHubRepoTeamMappingRepository gitHubRepoTeamMappingRepository,
            GitHubWebhookDeliveryRepository gitHubWebhookDeliveryRepository,
            @Value("${app.github.retry.max-attempts:5}") int maxRetryAttempts,
            @Value("${app.github.retry.batch-size:20}") int retryBatchSize,
            @Value("${app.github.retry.base-seconds:30}") long retryBaseSeconds,
            @Value("${app.github.retry.max-seconds:1800}") long retryMaxSeconds
    ) {
        this.objectMapper = objectMapper;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.techTaskPrLinkRepository = techTaskPrLinkRepository;
        this.workRequestService = workRequestService;
        this.techTaskService = techTaskService;
        this.defectService = defectService;
        this.deploymentService = deploymentService;
        this.activityLogService = activityLogService;
        this.gitHubRepoTeamMappingRepository = gitHubRepoTeamMappingRepository;
        this.gitHubWebhookDeliveryRepository = gitHubWebhookDeliveryRepository;
        this.maxRetryAttempts = Math.max(1, maxRetryAttempts);
        this.retryBatchSize = Math.max(1, retryBatchSize);
        this.retryBaseSeconds = Math.max(1L, retryBaseSeconds);
        this.retryMaxSeconds = Math.max(this.retryBaseSeconds, retryMaxSeconds);
    }

    public void handleEvent(String deliveryId, String eventType, String payload) {
        if (isBlank(deliveryId) || isBlank(eventType) || isBlank(payload)) {
            return;
        }

        String normalizedDeliveryId = deliveryId.trim();
        String normalizedEventType = eventType.trim();
        String normalizedPayload = payload.trim();
        String payloadHash = sha256Hex(normalizedPayload);

        GitHubWebhookDelivery delivery = findOrCreateDelivery(normalizedDeliveryId, normalizedEventType, normalizedPayload, payloadHash);
        if (!isProcessable(delivery, payloadHash)) {
            return;
        }

        processDelivery(delivery, normalizedEventType, normalizedPayload, payloadHash);
    }

    // 테스트/백워드 호환용: deliveryId가 없는 경우 payload 해시 기반 synthetic id를 사용한다.
    public void handleEvent(String eventType, String payload) {
        if (isBlank(eventType) || isBlank(payload)) {
            return;
        }
        String syntheticDeliveryId = "synthetic-" + sha256Hex(eventType.trim() + "|" + payload.trim());
        handleEvent(syntheticDeliveryId, eventType, payload);
    }

    public void retryFailedDeliveries() {
        LocalDateTime now = LocalDateTime.now();
        List<GitHubWebhookDelivery> deliveries = gitHubWebhookDeliveryRepository
                .findByStatusAndNextRetryAtLessThanEqualOrderByNextRetryAtAscIdAsc(
                        GitHubWebhookDeliveryStatus.FAILED,
                        now,
                        PageRequest.of(0, retryBatchSize)
                );

        for (GitHubWebhookDelivery delivery : deliveries) {
            if (delivery == null || delivery.getId() == null) {
                continue;
            }

            GitHubWebhookDelivery latest = gitHubWebhookDeliveryRepository.findById(delivery.getId()).orElse(null);
            if (latest == null || latest.getStatus() != GitHubWebhookDeliveryStatus.FAILED) {
                continue;
            }
            if (latest.getNextRetryAt() != null && latest.getNextRetryAt().isAfter(now)) {
                continue;
            }
            processDelivery(latest, latest.getEventType(), latest.getPayloadJson(), latest.getPayloadHash());
        }
    }

    private GitHubWebhookDelivery findOrCreateDelivery(
            String deliveryId,
            String eventType,
            String payload,
            String payloadHash
    ) {
        Optional<GitHubWebhookDelivery> found = gitHubWebhookDeliveryRepository.findByDeliveryId(deliveryId);
        if (found.isPresent()) {
            return found.get();
        }

        GitHubWebhookDelivery created = new GitHubWebhookDelivery();
        created.setDeliveryId(deliveryId);
        created.setEventType(eventType);
        created.setPayloadJson(payload);
        created.setPayloadHash(payloadHash);
        created.setStatus(GitHubWebhookDeliveryStatus.RECEIVED);
        created.setAttemptCount(0);

        try {
            return gitHubWebhookDeliveryRepository.save(created);
        } catch (DataIntegrityViolationException ex) {
            return gitHubWebhookDeliveryRepository.findByDeliveryId(deliveryId)
                    .orElseThrow(() -> ex);
        }
    }

    private boolean isProcessable(GitHubWebhookDelivery delivery, String payloadHash) {
        if (delivery == null) {
            return false;
        }

        if (!Objects.equals(delivery.getPayloadHash(), payloadHash)) {
            log.warn("GitHub delivery payload hash mismatch. deliveryId={}", delivery.getDeliveryId());
            return false;
        }

        GitHubWebhookDeliveryStatus status = delivery.getStatus();
        if (status == GitHubWebhookDeliveryStatus.SUCCESS || status == GitHubWebhookDeliveryStatus.DEAD_LETTER) {
            log.debug("이미 처리 완료된 GitHub delivery 무시. deliveryId={}, status={}", delivery.getDeliveryId(), status);
            return false;
        }
        if (status == GitHubWebhookDeliveryStatus.PROCESSING) {
            log.debug("처리중인 GitHub delivery 무시. deliveryId={}", delivery.getDeliveryId());
            return false;
        }

        return true;
    }

    private void processDelivery(GitHubWebhookDelivery delivery, String eventType, String payload, String payloadHash) {
        markProcessing(delivery, eventType, payload, payloadHash);

        try {
            JsonNode root = objectMapper.readTree(payload);
            String repository = text(root.path("repository").path("full_name"));
            String action = text(root.path("action"));
            updateDeliveryMetadata(delivery, action, repository);

            Long mappedTeamId = resolveMappedTeamId(repository);
            if (mappedTeamId == null) {
                markSuccess(delivery);
                log.warn("GitHub repository-team 매핑이 없어 이벤트를 건너뜁니다. repository={}, deliveryId={}", repository, delivery.getDeliveryId());
                return;
            }

            handleSupportedEvent(eventType, root, mappedTeamId);
            markSuccess(delivery);
        } catch (Exception ex) {
            markFailure(delivery, ex);
            log.warn("GitHub webhook 처리 실패. deliveryId={}", delivery.getDeliveryId(), ex);
        }
    }

    private void markProcessing(GitHubWebhookDelivery delivery, String eventType, String payload, String payloadHash) {
        delivery.setEventType(normalizeNullable(eventType));
        delivery.setPayloadJson(payload == null ? "" : payload);
        delivery.setPayloadHash(payloadHash);
        delivery.setStatus(GitHubWebhookDeliveryStatus.PROCESSING);
        delivery.setAttemptCount(zeroIfNull(delivery.getAttemptCount()) + 1);
        delivery.setLastError(null);
        delivery.setNextRetryAt(null);
        gitHubWebhookDeliveryRepository.save(delivery);
    }

    private void updateDeliveryMetadata(GitHubWebhookDelivery delivery, String action, String repository) {
        delivery.setActionType(normalizeNullable(action));
        delivery.setRepositoryFullName(normalizeNullable(repository));
        gitHubWebhookDeliveryRepository.save(delivery);
    }

    private void markSuccess(GitHubWebhookDelivery delivery) {
        delivery.setStatus(GitHubWebhookDeliveryStatus.SUCCESS);
        delivery.setLastError(null);
        delivery.setNextRetryAt(null);
        delivery.setProcessedAt(LocalDateTime.now());
        gitHubWebhookDeliveryRepository.save(delivery);
    }

    private void markFailure(GitHubWebhookDelivery delivery, Exception ex) {
        int attempts = zeroIfNull(delivery.getAttemptCount());
        delivery.setLastError(truncateError(ex));

        if (attempts >= maxRetryAttempts) {
            delivery.setStatus(GitHubWebhookDeliveryStatus.DEAD_LETTER);
            delivery.setNextRetryAt(null);
            gitHubWebhookDeliveryRepository.save(delivery);
            return;
        }

        delivery.setStatus(GitHubWebhookDeliveryStatus.FAILED);
        delivery.setNextRetryAt(LocalDateTime.now().plusSeconds(computeBackoffSeconds(attempts)));
        gitHubWebhookDeliveryRepository.save(delivery);
    }

    private long computeBackoffSeconds(int attempts) {
        long exponent = Math.max(0, attempts - 1);
        long backoff = retryBaseSeconds;
        for (int i = 0; i < exponent; i++) {
            if (backoff >= retryMaxSeconds / 2) {
                return retryMaxSeconds;
            }
            backoff *= 2;
        }
        return Math.min(backoff, retryMaxSeconds);
    }

    private Long resolveMappedTeamId(String repositoryFullName) {
        if (isBlank(repositoryFullName)) {
            return null;
        }

        return gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue(repositoryFullName.trim())
                .map(GitHubRepoTeamMapping::getTeamId)
                .orElse(null);
    }

    private void handleSupportedEvent(String eventType, JsonNode root, Long mappedTeamId) {
        if (!EVENT_PULL_REQUEST.equals(eventType)) {
            return;
        }

        String action = text(root.path("action"));
        JsonNode pullRequest = root.path("pull_request");
        if (pullRequest.isMissingNode()) {
            return;
        }

        if ("opened".equalsIgnoreCase(action)) {
            handlePullRequestOpened(root, pullRequest, mappedTeamId);
            return;
        }

        if ("closed".equalsIgnoreCase(action) && pullRequest.path("merged").asBoolean(false)) {
            handlePullRequestMerged(root, pullRequest, mappedTeamId);
        }
    }

    private void handlePullRequestOpened(JsonNode root, JsonNode pullRequest, Long mappedTeamId) {
        String repository = text(root.path("repository").path("full_name"));
        String branchName = text(pullRequest.path("head").path("ref"));
        String prNo = pullRequest.path("number").isMissingNode() ? null : String.valueOf(pullRequest.path("number").asLong());
        String prUrl = text(pullRequest.path("html_url"));
        String title = text(pullRequest.path("title"));
        String body = text(pullRequest.path("body"));

        Set<String> docNos = extractDocNos(joinTexts(branchName, title, body));
        Set<Long> linkedTaskIds = new LinkedHashSet<>();
        for (String docNo : docNos) {
            Optional<TechTask> techTaskOptional = resolveTechTask(docNo);
            if (techTaskOptional.isEmpty()) {
                continue;
            }

            TechTask techTask = techTaskOptional.get();
            if (techTask.getId() == null || !linkedTaskIds.add(techTask.getId())) {
                continue;
            }
            if (!Objects.equals(techTask.getTeamId(), mappedTeamId)) {
                log.warn("repo-team 매핑과 문서 teamId가 달라 PR 링크 생성을 건너뜁니다. repo={}, docNo={}, mappedTeamId={}, entityTeamId={}"
                        , repository, docNo, mappedTeamId, techTask.getTeamId());
                continue;
            }
            if (isAlreadyLinked(techTask.getId(), prNo, prUrl)) {
                continue;
            }

            TechTaskPrLink prLink = new TechTaskPrLink();
            prLink.setTechTaskId(techTask.getId());
            prLink.setBranchName(isBlank(branchName) ? "unknown" : branchName);
            prLink.setPrNo(normalizeNullable(prNo));
            prLink.setPrUrl(normalizeNullable(prUrl));
            techTaskPrLinkRepository.save(prLink);

            recordPrLinkedActivity(techTask, repository, prNo, prUrl, branchName);
            log.info("GitHub PR 자동 연결 완료. taskNo={}, prNo={}, prUrl={}", techTask.getTaskNo(), prNo, prUrl);
        }
    }

    private void handlePullRequestMerged(JsonNode root, JsonNode pullRequest, Long mappedTeamId) {
        String repository = text(root.path("repository").path("full_name"));
        String prNo = pullRequest.path("number").isMissingNode() ? null : String.valueOf(pullRequest.path("number").asLong());
        String prTitle = text(pullRequest.path("title"));
        String prBody = text(pullRequest.path("body"));

        Set<String> closeTargets = extractCloseTargets(joinTexts(prTitle, prBody));
        if (closeTargets.isEmpty()) {
            return;
        }

        for (String docNo : closeTargets) {
            resolveStatusTarget(docNo).ifPresent(target -> completeTarget(target, repository, prNo, mappedTeamId));
        }
    }

    private void completeTarget(StatusTarget target, String repository, String prNo, Long mappedTeamId) {
        if (target == null || STATUS_DONE.equals(target.currentStatus())) {
            return;
        }
        if (!Objects.equals(mappedTeamId, target.teamId())) {
            log.warn("repo-team 매핑과 문서 teamId가 달라 자동 완료를 건너뜁니다. refType={}, refId={}, mappedTeamId={}, entityTeamId={}"
                    , target.refType(), target.refId(), mappedTeamId, target.teamId());
            return;
        }

        String baseNote = isBlank(prNo)
                ? "GitHub PR 머지로 자동 완료 처리"
                : "GitHub PR #" + prNo + " 머지로 자동 완료 처리";
        final String statusNote = isBlank(repository) ? baseNote : baseNote + " (" + repository + ")";

        runWithTeamScope(mappedTeamId, () -> {
            switch (target.refType()) {
                case REF_TYPE_WORK_REQUEST ->
                        workRequestService.updateStatus(target.refId(), new WorkRequestStatusUpdateRequest(STATUS_DONE, statusNote));
                case REF_TYPE_TECH_TASK ->
                        techTaskService.updateStatus(target.refId(), new TechTaskStatusUpdateRequest(STATUS_DONE, statusNote));
                case REF_TYPE_DEFECT ->
                        defectService.updateStatus(target.refId(), new DefectStatusUpdateRequest(STATUS_DONE, statusNote));
                case REF_TYPE_DEPLOYMENT ->
                        deploymentService.updateStatus(target.refId(), new DeploymentStatusUpdateRequest(STATUS_DONE, statusNote));
                default -> {
                    // no-op
                }
            }
        });

        log.info("GitHub PR 머지 자동 완료 처리. refType={}, refId={}", target.refType(), target.refId());
    }

    private void runWithTeamScope(Long teamId, Runnable runnable) {
        Long previousUserId = TeamRequestContext.getCurrentUserId();
        Long previousTeamId = TeamRequestContext.getCurrentTeamId();
        TeamRequestContext.set(null, teamId);
        try {
            runnable.run();
        } finally {
            if (previousUserId != null || previousTeamId != null) {
                TeamRequestContext.set(previousUserId, previousTeamId);
            } else {
                TeamRequestContext.clear();
            }
        }
    }

    private Optional<StatusTarget> resolveStatusTarget(String docNo) {
        ParsedDocNo parsed = parseDocNo(docNo);
        if (parsed == null) {
            return Optional.empty();
        }

        return switch (parsed.prefix()) {
            case "WR" -> resolveWorkRequest(parsed).map(item ->
                    new StatusTarget(REF_TYPE_WORK_REQUEST, item.getId(), item.getTeamId(), item.getStatus())
            );
            case "TK", "TT" -> resolveTechTask(parsed.normalized()).map(item ->
                    new StatusTarget(REF_TYPE_TECH_TASK, item.getId(), item.getTeamId(), item.getStatus())
            );
            case "DF" -> resolveDefect(parsed).map(item ->
                    new StatusTarget(REF_TYPE_DEFECT, item.getId(), item.getTeamId(), item.getStatus())
            );
            case "DP" -> resolveDeployment(parsed).map(item ->
                    new StatusTarget(REF_TYPE_DEPLOYMENT, item.getId(), item.getTeamId(), item.getStatus())
            );
            default -> Optional.empty();
        };
    }

    private Optional<WorkRequest> resolveWorkRequest(ParsedDocNo parsed) {
        for (String candidate : buildDocNoCandidates("WR", parsed)) {
            Optional<WorkRequest> found = workRequestRepository.findByRequestNo(candidate);
            if (found.isPresent()) {
                return found;
            }
        }
        return workRequestRepository.findById(parsed.number());
    }

    private Optional<TechTask> resolveTechTask(String docNo) {
        ParsedDocNo parsed = parseDocNo(docNo);
        if (parsed == null || (!"TK".equals(parsed.prefix()) && !"TT".equals(parsed.prefix()))) {
            return Optional.empty();
        }

        for (String candidate : buildDocNoCandidates("TK", parsed)) {
            Optional<TechTask> found = techTaskRepository.findByTaskNo(candidate);
            if (found.isPresent()) {
                return found;
            }
        }
        return techTaskRepository.findById(parsed.number());
    }

    private Optional<Defect> resolveDefect(ParsedDocNo parsed) {
        for (String candidate : buildDocNoCandidates("DF", parsed)) {
            Optional<Defect> found = defectRepository.findByDefectNo(candidate);
            if (found.isPresent()) {
                return found;
            }
        }
        return defectRepository.findById(parsed.number());
    }

    private Optional<Deployment> resolveDeployment(ParsedDocNo parsed) {
        for (String candidate : buildDocNoCandidates("DP", parsed)) {
            Optional<Deployment> found = deploymentRepository.findByDeployNo(candidate);
            if (found.isPresent()) {
                return found;
            }
        }
        return deploymentRepository.findById(parsed.number());
    }

    private List<String> buildDocNoCandidates(String canonicalPrefix, ParsedDocNo parsed) {
        String noPadding = canonicalPrefix + "-" + parsed.number();
        String withPadding = canonicalPrefix + "-" + String.format("%03d", parsed.number());

        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (canonicalPrefix.equals(parsed.prefix())) {
            candidates.add(parsed.normalized());
        }
        candidates.add(noPadding);
        candidates.add(withPadding);
        return candidates.stream().toList();
    }

    private void recordPrLinkedActivity(
            TechTask techTask,
            String repository,
            String prNo,
            String prUrl,
            String branchName
    ) {
        if (techTask == null || techTask.getId() == null || techTask.getTeamId() == null) {
            return;
        }

        StringBuilder message = new StringBuilder();
        message.append(techTask.getTaskNo()).append(" GitHub PR");
        if (!isBlank(prNo)) {
            message.append(" #").append(prNo);
        }
        message.append(" 이(가) 자동 연결되었습니다.");
        if (!isBlank(repository)) {
            message.append(" [").append(repository).append("]");
        }
        if (!isBlank(branchName)) {
            message.append(" (").append(branchName).append(")");
        }

        try {
            activityLogService.recordLog(new ActivityLogCreateCommand(
                    techTask.getTeamId(),
                    REF_TYPE_TECH_TASK,
                    techTask.getId(),
                    "PR_LINKED",
                    null,
                    "prUrl",
                    null,
                    normalizeNullable(prUrl),
                    message.toString()
            ));
        } catch (RuntimeException ex) {
            log.warn("PR 자동 연결 처리 이력 저장 실패. techTaskId={}", techTask.getId(), ex);
        }
    }

    private boolean isAlreadyLinked(Long techTaskId, String prNo, String prUrl) {
        if (techTaskId == null) {
            return true;
        }
        if (!isBlank(prNo) && techTaskPrLinkRepository.findByTechTaskIdAndPrNo(techTaskId, prNo).isPresent()) {
            return true;
        }
        return !isBlank(prUrl) && techTaskPrLinkRepository.findByTechTaskIdAndPrUrl(techTaskId, prUrl).isPresent();
    }

    private Set<String> extractDocNos(String text) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (isBlank(text)) {
            return result;
        }

        Matcher matcher = DOC_NO_PATTERN.matcher(text);
        while (matcher.find()) {
            result.add(matcher.group(1).toUpperCase(Locale.ROOT));
        }
        return result;
    }

    private Set<String> extractCloseTargets(String text) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (isBlank(text)) {
            return result;
        }

        Matcher matcher = DOC_NO_PATTERN.matcher(text);
        while (matcher.find()) {
            String docNo = matcher.group(1).toUpperCase(Locale.ROOT);
            int start = Math.max(0, matcher.start() - 48);
            String prefixWindow = text.substring(start, matcher.start());
            if (CLOSE_KEYWORD_PATTERN.matcher(prefixWindow).find()) {
                result.add(docNo);
            }
        }
        return result;
    }

    private ParsedDocNo parseDocNo(String docNo) {
        if (isBlank(docNo)) {
            return null;
        }
        String normalized = docNo.trim().toUpperCase(Locale.ROOT);
        String[] parts = normalized.split("-", 2);
        if (parts.length != 2 || isBlank(parts[0]) || isBlank(parts[1])) {
            return null;
        }
        try {
            long number = Long.parseLong(parts[1]);
            if (number <= 0) {
                return null;
            }
            return new ParsedDocNo(parts[0], number, normalized);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String joinTexts(String... values) {
        StringBuilder builder = new StringBuilder();
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (isBlank(value)) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(value);
        }
        return builder.toString();
    }

    private String text(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        String value = node.asText(null);
        return normalizeNullable(value);
    }

    private String normalizeNullable(String value) {
        if (isBlank(value)) {
            return null;
        }
        return value.trim();
    }

    private int zeroIfNull(Integer value) {
        return value == null ? 0 : Math.max(value, 0);
    }

    private String truncateError(Exception ex) {
        String message = ex == null ? null : ex.getMessage();
        if (isBlank(message)) {
            message = ex == null ? "unknown" : ex.getClass().getSimpleName();
        }
        if (message.length() <= 1000) {
            return message;
        }
        return message.substring(0, 1000);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 계산 실패", ex);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ParsedDocNo(String prefix, long number, String normalized) {
    }

    private record StatusTarget(String refType, Long refId, Long teamId, String currentStatus) {
    }
}
