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
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_comments_post_id` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_parent_id` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `draft_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draft_id` integer NOT NULL,
	`path` text NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_draft_images_draft_id` ON `draft_images` (`draft_id`);--> statement-breakpoint
CREATE TABLE `draft_tags` (
	`draft_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`draft_id`, `tag_id`),
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_tags_tag_id` ON `draft_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`post_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_drafts_user_id` ON `drafts` (`user_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_user_id_post_id_unique` ON `favorites` (`user_id`,`post_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_user_id` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_post_id` ON `favorites` (`post_id`);--> statement-breakpoint
CREATE TABLE `follows` (
	`follower_id` integer NOT NULL,
	`following_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`follower_id`, `following_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_follows_follower` ON `follows` (`follower_id`);--> statement-breakpoint
CREATE INDEX `idx_follows_following` ON `follows` (`following_id`);--> statement-breakpoint
CREATE TABLE `likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_user_id_post_id_unique` ON `likes` (`user_id`,`post_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_user_id` ON `likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_post_id` ON `likes` (`post_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`type` text NOT NULL,
	`post_id` integer,
	`work_id` integer,
	`comment_id` integer,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `post_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`path` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_images_post_id` ON `post_images` (`post_id`);--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_post_tags_tag_id` ON `post_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_posts_user_id` ON `posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_posts_created_at` ON `posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`is_favorites_public` integer DEFAULT 1 NOT NULL,
	`is_follows_public` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);