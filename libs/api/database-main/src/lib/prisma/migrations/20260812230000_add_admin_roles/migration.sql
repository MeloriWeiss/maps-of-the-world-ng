CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "forums"
ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "maps"
ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "texture_packs"
ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "admin_audit_logs" (
  "id" SERIAL NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" INTEGER NOT NULL,
  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
CREATE INDEX "admin_audit_logs_actor_id_created_at_idx" ON "admin_audit_logs"("actor_id", "created_at");

ALTER TABLE "admin_audit_logs"
ADD CONSTRAINT "admin_audit_logs_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
