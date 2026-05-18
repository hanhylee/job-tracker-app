CREATE TABLE `application_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`overall_score` integer,
	`result_json` text,
	`error_message` text,
	`resume_hash` text,
	`jd_hash` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`completed_at` integer,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `application_analyses_application_id_idx` ON `application_analyses` (`application_id`);--> statement-breakpoint
CREATE INDEX `application_analyses_user_id_idx` ON `application_analyses` (`user_id`);--> statement-breakpoint
CREATE INDEX `application_analyses_status_idx` ON `application_analyses` (`status`);--> statement-breakpoint
ALTER TABLE `user` ADD `is_pro` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `job_description` text;