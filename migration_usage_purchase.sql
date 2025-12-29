-- ============================================
-- Migracja: Dodanie wsparcia dla zakupu użyć
-- ============================================
-- Wykonaj to zapytanie w Neon SQL Editor
-- Jeśli constraint już istnieje, zobaczysz błąd - możesz go zignorować

-- 1. Utworzenie tabeli UsagePurchase
CREATE TABLE IF NOT EXISTS "UsagePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    
    CONSTRAINT "UsagePurchase_pkey" PRIMARY KEY ("id")
);

-- 2. Utworzenie unikalnych indeksów dla UsagePurchase
CREATE UNIQUE INDEX IF NOT EXISTS "UsagePurchase_stripePaymentIntentId_key" 
    ON "UsagePurchase"("stripePaymentIntentId") 
    WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UsagePurchase_stripeSessionId_key" 
    ON "UsagePurchase"("stripeSessionId") 
    WHERE "stripeSessionId" IS NOT NULL;

-- 3. Dodanie foreign key do User
-- Jeśli constraint już istnieje, zobaczysz błąd - możesz go zignorować
ALTER TABLE "UsagePurchase" 
ADD CONSTRAINT "UsagePurchase_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Dodanie kolumny purchaseId do tabeli Usage
ALTER TABLE "Usage" 
ADD COLUMN IF NOT EXISTS "purchaseId" TEXT;

-- 5. Dodanie foreign key między Usage a UsagePurchase
-- Jeśli constraint już istnieje, zobaczysz błąd - możesz go zignorować
ALTER TABLE "Usage" 
ADD CONSTRAINT "Usage_purchaseId_fkey" 
FOREIGN KEY ("purchaseId") REFERENCES "UsagePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Utworzenie indeksu dla purchaseId (poprawia wydajność zapytań)
CREATE INDEX IF NOT EXISTS "Usage_purchaseId_idx" 
    ON "Usage"("purchaseId") 
    WHERE "purchaseId" IS NOT NULL;
