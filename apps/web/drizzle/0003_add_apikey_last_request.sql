-- Add missing lastRequest column to apikey table
ALTER TABLE `apikey` ADD COLUMN `lastRequest` integer;
