ALTER TABLE `coin_transactions` ADD `to_user_id` integer REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_coin_transactions_to_user_id` ON `coin_transactions` (`to_user_id`);