-- Add better-auth apikey table and drop custom api_tokens table

CREATE TABLE `apikey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`start` text,
	`prefix` text,
	`key` text NOT NULL,
	`userId` text NOT NULL,
	`refillInterval` integer,
	`refillAmount` integer,
	`lastRefillAt` integer,
	`enabled` integer DEFAULT true,
	`rateLimitEnabled` integer DEFAULT false,
	`rateLimitTimeWindow` integer,
	`rateLimitMax` integer,
	`requestCount` integer DEFAULT 0,
	`remaining` integer,
	`metadata` text,
	`permissions` text,
	`expiresAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

DROP TABLE IF EXISTS `api_tokens`;
