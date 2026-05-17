CREATE TABLE `r2_usage_monthly` (
	`month` text PRIMARY KEY NOT NULL,
	`class_a_count` integer DEFAULT 0 NOT NULL,
	`class_b_count` integer DEFAULT 0 NOT NULL,
	`stored_bytes` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
