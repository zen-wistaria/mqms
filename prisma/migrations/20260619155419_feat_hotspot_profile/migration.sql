-- CreateTable
CREATE TABLE "hotspot_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "routerId" TEXT NOT NULL,
    "sharedUsers" INTEGER NOT NULL DEFAULT 1,
    "rateLimit" TEXT,
    "addressPool" TEXT,
    "macCookie" BOOLEAN NOT NULL DEFAULT false,
    "server" TEXT NOT NULL DEFAULT 'all',
    "expiredMode" TEXT NOT NULL DEFAULT 'remove',
    "price" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL DEFAULT 0,
    "lockUser" BOOLEAN NOT NULL DEFAULT false,
    "validity" TEXT NOT NULL DEFAULT '',
    "onLoginScript" TEXT,
    "onLogoutScript" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "hotspot_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "batchComment" TEXT,
    "soldAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "expiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active'
);

-- CreateTable
CREATE TABLE "hotspot_router_scripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deployed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "hotspot_profiles_routerId_name_key" ON "hotspot_profiles"("routerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hotspot_router_scripts_routerId_type_name_key" ON "hotspot_router_scripts"("routerId", "type", "name");
