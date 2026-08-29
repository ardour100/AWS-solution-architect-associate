CREATE TABLE "exam_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_ids" text[] DEFAULT '{}' NOT NULL,
	"is_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"total_count" integer DEFAULT 10 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "exams_status_check" CHECK ("exams"."status" in ('in_progress', 'completed')),
	CONSTRAINT "exams_total_count_check" CHECK ("exams"."total_count" >= 1),
	CONSTRAINT "exams_correct_count_check" CHECK ("exams"."correct_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_latest" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"q_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_version_check" CHECK ("questions"."version" >= 1),
	CONSTRAINT "questions_q_type_check" CHECK ("questions"."q_type" in ('single', 'multiple'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "exam_records" ADD CONSTRAINT "exam_records_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_records" ADD CONSTRAINT "exam_records_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_records_exam_question_unique" ON "exam_records" USING btree ("exam_id","question_id");--> statement-breakpoint
CREATE INDEX "exam_records_question_id_idx" ON "exam_records" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "exams_user_id_idx" ON "exams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "options_question_id_idx" ON "options" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_group_version_unique" ON "questions" USING btree ("group_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_one_latest_per_group_unique" ON "questions" USING btree ("group_id") WHERE "questions"."is_latest" = true;--> statement-breakpoint
CREATE INDEX "questions_is_latest_idx" ON "questions" USING btree ("is_latest");