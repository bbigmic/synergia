-- Migration: Add FeedSwipe model for daily feed limit tracking
-- This migration creates FeedSwipe table to track daily swipes in feed

-- Step 1: Create FeedSwipe table
CREATE TABLE IF NOT EXISTS "FeedSwipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "FeedSwipe_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key to User if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FeedSwipe_userId_fkey'
    ) THEN
        ALTER TABLE "FeedSwipe" 
        ADD CONSTRAINT "FeedSwipe_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "FeedSwipe_userId_createdAt_idx" ON "FeedSwipe"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedSwipe_userId_idx" ON "FeedSwipe"("userId");
CREATE INDEX IF NOT EXISTS "FeedSwipe_missionId_idx" ON "FeedSwipe"("missionId");
CREATE INDEX IF NOT EXISTS "FeedSwipe_createdAt_idx" ON "FeedSwipe"("createdAt");

