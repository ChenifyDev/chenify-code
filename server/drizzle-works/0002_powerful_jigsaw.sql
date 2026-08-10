CREATE TABLE `work_comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`work_comment_id`) REFERENCES `work_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_comment_likes_comment_id_user_id_unique` ON `work_comment_likes` (`work_comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_work_comment_likes_user_id` ON `work_comment_likes` (`user_id`);--> statement-breakpoint
ALTER TABLE `work_comments` ADD `parent_id` integer REFERENCES work_comments(id);--> statement-breakpoint
CREATE INDEX `idx_work_comments_parent_id` ON `work_comments` (`parent_id`);