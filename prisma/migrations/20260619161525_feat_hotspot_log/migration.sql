-- CreateTable
CREATE TABLE "hotspot_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "profileName" TEXT,
    "validity" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "hotspot_activity_logs_routerId_loggedAt_idx" ON "hotspot_activity_logs"("routerId", "loggedAt");

-- CreateIndex
CREATE INDEX "hotspot_activity_logs_username_idx" ON "hotspot_activity_logs"("username");
