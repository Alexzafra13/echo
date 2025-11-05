-- CreateTable
CREATE TABLE "stream_tokens" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "stream_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stream_tokens_token_key" ON "stream_tokens"("token");

-- CreateIndex
CREATE INDEX "stream_tokens_token_idx" ON "stream_tokens"("token");

-- CreateIndex
CREATE INDEX "stream_tokens_user_id_idx" ON "stream_tokens"("user_id");

-- CreateIndex
CREATE INDEX "stream_tokens_expires_at_idx" ON "stream_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "stream_tokens" ADD CONSTRAINT "stream_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
