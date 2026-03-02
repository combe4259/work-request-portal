-- notify_mention 기본값을 0 → 1 로 변경
-- 기존 row 중 notify_mention = 0 인 경우도 1 로 일괄 업데이트
ALTER TABLE user_preferences
    MODIFY COLUMN notify_mention TINYINT(1) NOT NULL DEFAULT 1;

UPDATE user_preferences
SET notify_mention = 1
WHERE notify_mention = 0;
