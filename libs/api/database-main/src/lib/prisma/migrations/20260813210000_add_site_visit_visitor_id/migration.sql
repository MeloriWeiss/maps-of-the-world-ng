ALTER TABLE "site_visits"
ADD COLUMN "visitor_id" UUID;

CREATE INDEX "site_visits_visitor_id_created_at_idx"
ON "site_visits"("visitor_id", "created_at");
