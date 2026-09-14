ALTER TABLE "forums" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_closed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "forum_comments" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;
UPDATE "forums" f SET "last_activity_at" = GREATEST(f."created_at",
  COALESCE((SELECT MAX(c."created_at") FROM "forum_comments" c WHERE c."forum_id" = f."id"), f."created_at"));
CREATE INDEX "forums_is_hidden_is_pinned_last_activity_at_idx" ON "forums"("is_hidden", "is_pinned", "last_activity_at");
INSERT INTO "forum_categories" ("slug", "title", "description", "sort_order") VALUES
  ('maps', 'Карты и обратная связь', 'Показывайте карты, обсуждайте композицию и помогайте другим авторам.', 10),
  ('worldbuilding', 'Создание миров', 'География, история, народы и логика вашего мира.', 20),
  ('game-mastering', 'Мастерская ведущего', 'Сценарии, встречи и подготовка к настольным ролевым играм.', 30),
  ('texture-packs', 'Текстуры и материалы', 'Наборы текстур, стили и материалы для игровых карт.', 40),
  ('tools', 'Помощь по редактору', 'Вопросы о мастерской и советы по работе с инструментами.', 50),
  ('feedback', 'Предложения и ошибки', 'Идеи для GameMaster Helper и сообщения о неполадках.', 60)
ON CONFLICT ("slug") DO NOTHING;
