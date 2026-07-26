-- Repair only the invalid placeholder hash used by earlier seed versions.
-- The replacement is a valid bcrypt hash for the documented demo password.
UPDATE "users"
SET "password_hash" = '$2b$10$ik9rEnVagNpCVW1p37nCb.WyNorzKwsW8gonXQVvZWng73w69gvI6'
WHERE "password_hash" = '$2b$10$5h7mR8U9xYzZ8QW1uE3O0OllZ6sP9m3Q8F9d7H6kL5jG4fH3d2Cq';
