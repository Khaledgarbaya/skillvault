CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `username` text NOT NULL,
  `display_name` text,
  `avatar_url` text,
  `email_verified` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
--> statement-breakpoint
CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `token` text NOT NULL,
  `expires_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);
--> statement-breakpoint
CREATE TABLE `accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `id_token` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verifications` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `apikey` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `start` text,
  `prefix` text,
  `key` text NOT NULL,
  `userId` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `refillInterval` integer,
  `refillAmount` integer,
  `lastRefillAt` integer,
  `enabled` integer DEFAULT true,
  `rateLimitEnabled` integer DEFAULT false,
  `rateLimitTimeWindow` integer,
  `rateLimitMax` integer,
  `requestCount` integer DEFAULT 0,
  `remaining` integer,
  `lastRequest` integer,
  `metadata` text,
  `permissions` text,
  `expiresAt` integer,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_records` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `owner` text NOT NULL,
  `repo` text NOT NULL,
  `ref` text,
  `status` text NOT NULL,
  `findings_count` integer DEFAULT 0 NOT NULL,
  `critical_count` integer DEFAULT 0 NOT NULL,
  `high_count` integer DEFAULT 0 NOT NULL,
  `medium_count` integer DEFAULT 0 NOT NULL,
  `low_count` integer DEFAULT 0 NOT NULL,
  `findings` text,
  `scan_duration` integer,
  `engine_version` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scan_repo` ON `scan_records` (`provider`, `owner`, `repo`);
