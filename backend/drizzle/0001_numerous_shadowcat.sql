ALTER TABLE "exams" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "questions_is_deleted_idx" ON "questions" USING btree ("is_deleted");