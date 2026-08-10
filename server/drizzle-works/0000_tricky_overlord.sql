CREATE TABLE `work_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_work_comments_work_id` ON `work_comments` (`work_id`);--> statement-breakpoint
CREATE INDEX `idx_work_comments_user_id` ON `work_comments` (`user_id`);--> statement-breakpoint
CREATE TABLE `work_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_favorites_user_id_work_id_unique` ON `work_favorites` (`work_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_work_favorites_user_id` ON `work_favorites` (`user_id`);--> statement-breakpoint
CREATE TABLE `work_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_work_files_work_id` ON `work_files` (`work_id`);--> statement-breakpoint
CREATE TABLE `work_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_likes_user_id_work_id_unique` ON `work_likes` (`work_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_work_likes_user_id` ON `work_likes` (`user_id`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`parent_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_works_user_id` ON `works` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_works_parent_id` ON `works` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_works_created_at` ON `works` (`created_at`);