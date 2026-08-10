CREATE TABLE `comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_comment_id_user_id_unique` ON `comment_likes` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comment_likes_user_id` ON `comment_likes` (`user_id`);--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` integer REFERENCES comments(id);--> statement-breakpoint
CREATE INDEX `idx_comments_parent_id` ON `comments` (`parent_id`);