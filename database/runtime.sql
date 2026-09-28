CREATE TABLE IF NOT EXISTS "runtimeEvents" (
    "id" BIGSERIAL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "runtimeEvents_createdAt" ON "runtimeEvents" ("createdAt");
CREATE TABLE IF NOT EXISTS "runtimeState" (
    "id" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "runtimeMedia" (
    "id" TEXT PRIMARY KEY,
    "mime" TEXT NOT NULL,
    "data" TEXT NOT NULL
);
