-- Migration: Add experience and level system to User table
-- Date: 2024

-- Add level and experience columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "experience" INTEGER NOT NULL DEFAULT 0;

-- Update existing users to have default values (if any exist)
UPDATE "User" 
SET "level" = 1, "experience" = 0 
WHERE "level" IS NULL OR "experience" IS NULL;

