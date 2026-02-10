CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`scopes` text NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `api_tokens_user_idx` ON `api_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `install_events` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_version_id` text NOT NULL,
	`agent_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_version_id`) REFERENCES `skill_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `install_events_version_idx` ON `install_events` (`skill_version_id`);--> statement-breakpoint
CREATE TABLE `scan_results` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_version_id` text NOT NULL,
	`engine_version` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`secrets_status` text,
	`secrets_findings` text,
	`permissions_status` text,
	`permissions_findings` text,
	`network_status` text,
	`network_findings` text,
	`filesystem_status` text,
	`filesystem_findings` text,
	`overall_status` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_version_id`) REFERENCES `skill_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scan_results_version_idx` ON `scan_results` (`skill_version_id`);--> statement-breakpoint
CREATE TABLE `skill_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`version` text NOT NULL,
	`version_major` integer NOT NULL,
	`version_minor` integer NOT NULL,
	`version_patch` integer NOT NULL,
	`content_hash` text NOT NULL,
	`tarball_key` text NOT NULL,
	`skill_md_content` text,
	`frontmatter` text,
	`file_count` integer NOT NULL,
	`total_size_bytes` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`deprecation_message` text,
	`yank_reason` text,
	`published_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_versions_skill_version_idx` ON `skill_versions` (`skill_id`,`version`);--> statement-breakpoint
CREATE INDEX `skill_versions_skill_idx` ON `skill_versions` (`skill_id`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`repository_url` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_owner_name_idx` ON `skills` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `skills_owner_idx` ON `skills` (`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`github_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);