UPDATE forum_threads SET is_deleted = false WHERE is_deleted IS NULL;
ALTER TABLE forum_threads MODIFY is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
