ALTER TABLE flow_ui_states
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER state_json;
