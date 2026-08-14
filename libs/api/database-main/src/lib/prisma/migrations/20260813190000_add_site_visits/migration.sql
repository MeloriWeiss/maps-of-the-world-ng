CREATE TABLE "site_visits" (
  "id" BIGSERIAL NOT NULL,
  "session_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_visits_session_id_key" ON "site_visits"("session_id");
CREATE INDEX "site_visits_created_at_idx" ON "site_visits"("created_at");
