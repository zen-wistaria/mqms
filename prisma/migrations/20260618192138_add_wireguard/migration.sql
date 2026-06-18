-- CreateTable
CREATE TABLE "wireguard_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '10.0.0.1/24',
    "port" INTEGER NOT NULL DEFAULT 51820,
    "mtu" INTEGER NOT NULL DEFAULT 1420,
    "dns" TEXT NOT NULL DEFAULT '10.0.0.1',
    "nextIp" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wireguard_peers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "presharedKey" TEXT,
    "allowedIPs" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "endpoint" TEXT,
    "dns" TEXT,
    "persistentKeepalive" INTEGER NOT NULL DEFAULT 25,
    "comment" TEXT,
    "transferRx" BIGINT NOT NULL DEFAULT 0,
    "transferTx" BIGINT NOT NULL DEFAULT 0,
    "latestHandshakeAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
