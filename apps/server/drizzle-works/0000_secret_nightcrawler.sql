CREATE TABLE `comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_comment_id_user_id_unique` ON `comment_likes` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comment_likes_user_id` ON `comment_likes` (`user_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_comments_work_id` ON `comments` (`work_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_parent_id` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_user_id_work_id_unique` ON `likes` (`user_id`,`work_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_user_id` ON `likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_work_id` ON `likes` (`work_id`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`description` text,
	`cover` text,
	`git_path` text
);
--> statement-breakpoint
CREATE INDEX `idx_works_user_id` ON `works` (`user_id`);