-- Failed logins and wrong registration codes, for rate limiting.
CREATE TABLE "AuthFailure" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthFailure_kind_key_createdAt_idx" ON "AuthFailure"("kind", "key", "createdAt");

-- Like the other tables: invisible to Supabase's public Data API.
ALTER TABLE "AuthFailure" ENABLE ROW LEVEL SECURITY;
