-- 워크플로우 정규화:
-- WR 직결 ref 중, TT/TS 부모 경로로 이미 도달 가능한 중복 ref를 제거한다.

CREATE TEMPORARY TABLE tmp_wrr_redundant_ids (
    id BIGINT PRIMARY KEY
);

-- WR -> TT -> TS 가 존재하면 WR -> TS 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_ts.id
FROM work_request_related_refs wr_ts
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_ts.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_ts
  ON tt_ts.tech_task_id = wr_tt.ref_id
 AND tt_ts.ref_type = 'TEST_SCENARIO'
 AND tt_ts.ref_id = wr_ts.ref_id
WHERE wr_ts.ref_type = 'TEST_SCENARIO';

-- WR -> TT -> DP 가 존재하면 WR -> DP 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_dp.id
FROM work_request_related_refs wr_dp
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_dp.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_dp
  ON tt_dp.tech_task_id = wr_tt.ref_id
 AND tt_dp.ref_type = 'DEPLOYMENT'
 AND tt_dp.ref_id = wr_dp.ref_id
WHERE wr_dp.ref_type = 'DEPLOYMENT';

-- WR -> TT -> DF 가 존재하면 WR -> DF 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_df.id
FROM work_request_related_refs wr_df
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_df.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_df
  ON tt_df.tech_task_id = wr_tt.ref_id
 AND tt_df.ref_type = 'DEFECT'
 AND tt_df.ref_id = wr_df.ref_id
WHERE wr_df.ref_type = 'DEFECT';

-- WR -> TS -> DF 가 존재하면 WR -> DF 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_df.id
FROM work_request_related_refs wr_df
JOIN work_request_related_refs wr_ts
  ON wr_ts.work_request_id = wr_df.work_request_id
 AND wr_ts.ref_type = 'TEST_SCENARIO'
JOIN test_scenario_related_refs ts_df
  ON ts_df.test_scenario_id = wr_ts.ref_id
 AND ts_df.ref_type = 'DEFECT'
 AND ts_df.ref_id = wr_df.ref_id
WHERE wr_df.ref_type = 'DEFECT';

-- WR -> TT -> TS -> DF 가 존재하면 WR -> DF 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_df.id
FROM work_request_related_refs wr_df
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_df.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_ts
  ON tt_ts.tech_task_id = wr_tt.ref_id
 AND tt_ts.ref_type = 'TEST_SCENARIO'
JOIN test_scenario_related_refs ts_df
  ON ts_df.test_scenario_id = tt_ts.ref_id
 AND ts_df.ref_type = 'DEFECT'
 AND ts_df.ref_id = wr_df.ref_id
WHERE wr_df.ref_type = 'DEFECT';

-- WR -> TT -> KB 가 존재하면 WR -> KB 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_kb.id
FROM work_request_related_refs wr_kb
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_kb.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_kb
  ON tt_kb.tech_task_id = wr_tt.ref_id
 AND tt_kb.ref_type = 'KNOWLEDGE_BASE'
 AND tt_kb.ref_id = wr_kb.ref_id
WHERE wr_kb.ref_type = 'KNOWLEDGE_BASE';

-- WR -> TS -> KB 가 존재하면 WR -> KB 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_kb.id
FROM work_request_related_refs wr_kb
JOIN work_request_related_refs wr_ts
  ON wr_ts.work_request_id = wr_kb.work_request_id
 AND wr_ts.ref_type = 'TEST_SCENARIO'
JOIN test_scenario_related_refs ts_kb
  ON ts_kb.test_scenario_id = wr_ts.ref_id
 AND ts_kb.ref_type = 'KNOWLEDGE_BASE'
 AND ts_kb.ref_id = wr_kb.ref_id
WHERE wr_kb.ref_type = 'KNOWLEDGE_BASE';

-- WR -> TT -> TS -> KB 가 존재하면 WR -> KB 직결은 중복
INSERT IGNORE INTO tmp_wrr_redundant_ids (id)
SELECT wr_kb.id
FROM work_request_related_refs wr_kb
JOIN work_request_related_refs wr_tt
  ON wr_tt.work_request_id = wr_kb.work_request_id
 AND wr_tt.ref_type = 'TECH_TASK'
JOIN tech_task_related_refs tt_ts
  ON tt_ts.tech_task_id = wr_tt.ref_id
 AND tt_ts.ref_type = 'TEST_SCENARIO'
JOIN test_scenario_related_refs ts_kb
  ON ts_kb.test_scenario_id = tt_ts.ref_id
 AND ts_kb.ref_type = 'KNOWLEDGE_BASE'
 AND ts_kb.ref_id = wr_kb.ref_id
WHERE wr_kb.ref_type = 'KNOWLEDGE_BASE';

DELETE FROM work_request_related_refs
WHERE id IN (SELECT id FROM tmp_wrr_redundant_ids);

DROP TEMPORARY TABLE tmp_wrr_redundant_ids;
