CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`job_url` text,
	`resume_url` text,
	`notes` text,
	`applied_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint 
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);