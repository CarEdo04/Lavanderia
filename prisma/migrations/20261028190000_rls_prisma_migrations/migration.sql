-- Prisma creates _prisma_migrations itself, so the init migration did not
-- cover it. Like the other tables, block Supabase's public Data API from
-- reading it; Prisma connects as the table owner and is not affected.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
