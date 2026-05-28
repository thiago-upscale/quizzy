DROP INDEX "quiz_sessions_active_pin_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_sessions_active_pin_unique" ON "quiz_sessions" USING btree ("pin") WHERE "quiz_sessions"."pin" is not null and "quiz_sessions"."status" in ('waiting', 'countdown', 'playing', 'question_result', 'interrupted');
