-- role, type and level only accept their listed values. The columns are
-- converted in place (not dropped and re-added, as Prisma would generate), so
-- existing roles, machines and notices are kept; the migration stops with an
-- error if a row holds anything else.

CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "MachineType" AS ENUM ('WASHER', 'DRYER');
-- Postgres sorts enum values in declaration order: WARNING comes after INFO.
CREATE TYPE "NoticeLevel" AS ENUM ('INFO', 'WARNING');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role" USING "role"::"Role",
  ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "Machine"
  ALTER COLUMN "type" TYPE "MachineType" USING "type"::"MachineType";

ALTER TABLE "Notice"
  ALTER COLUMN "level" DROP DEFAULT,
  ALTER COLUMN "level" TYPE "NoticeLevel" USING "level"::"NoticeLevel",
  ALTER COLUMN "level" SET DEFAULT 'INFO';
