-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_queues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "maxLimit" TEXT NOT NULL DEFAULT '0/0',
    "limitAt" TEXT NOT NULL DEFAULT '0/0',
    "parent" TEXT NOT NULL DEFAULT '',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "queues_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "routers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_queues" ("createdAt", "id", "isDeleted", "lastSeenAt", "maxLimit", "name", "routerId", "target", "updatedAt") SELECT "createdAt", "id", "isDeleted", "lastSeenAt", coalesce("maxLimit", '0/0') AS "maxLimit", "name", "routerId", "target", "updatedAt" FROM "queues";
DROP TABLE "queues";
ALTER TABLE "new_queues" RENAME TO "queues";
CREATE INDEX "queues_routerId_idx" ON "queues"("routerId");
CREATE INDEX "queues_isDeleted_idx" ON "queues"("isDeleted");
CREATE UNIQUE INDEX "queues_routerId_name_key" ON "queues"("routerId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
