CREATE TABLE `work_draft_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draft_id` integer NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `work_drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_work_draft_files_draft_id` ON `work_draft_files` (`draft_id`);--> statement-breakpoint
CREATE TABLE `work_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`cover` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`work_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_work_drafts_user_id` ON `work_drafts` (`user_id`);