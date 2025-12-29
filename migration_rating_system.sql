-- Migration: Add rating system to missions
-- This migration adds ratingScore to Mission table and creates MissionLike table

-- Step 1: Add ratingScore column to Mission table
ALTER TABLE "Mission" 
ADD COLUMN IF NOT EXISTS "ratingScore" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create MissionLike table
CREATE TABLE IF NOT EXISTS "MissionLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MissionLike_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create unique constraint for userId + missionId (prevent duplicate likes)
CREATE UNIQUE INDEX IF NOT EXISTS "MissionLike_userId_missionId_key" 
ON "MissionLike"("userId", "missionId");

-- Step 4: Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key to User if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MissionLike_userId_fkey'
    ) THEN
        ALTER TABLE "MissionLike" 
        ADD CONSTRAINT "MissionLike_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add foreign key to Mission if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MissionLike_missionId_fkey'
    ) THEN
        ALTER TABLE "MissionLike" 
        ADD CONSTRAINT "MissionLike_missionId_fkey" 
        FOREIGN KEY ("missionId") REFERENCES "Mission"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS "MissionLike_userId_idx" ON "MissionLike"("userId");
CREATE INDEX IF NOT EXISTS "MissionLike_missionId_idx" ON "MissionLike"("missionId");
CREATE INDEX IF NOT EXISTS "Mission_ratingScore_idx" ON "Mission"("ratingScore");

-- Step 6: Update existing missions to have ratingScore = 0 (if any are NULL)
UPDATE "Mission" SET "ratingScore" = 0 WHERE "ratingScore" IS NULL;

