CREATE TABLE `coin_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`reward_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_coin_transactions_user_id` ON `coin_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_coin_transactions_post_id` ON `coin_transactions` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_coin_transactions_created_at` ON `coin_transactions` (`created_at`);--> statement-breakpoint
ALTER TABLE `notifications` ADD `data` text;