-- Hidden Chat System
-- Private messaging between users, no UI entry point, no notifications

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_one_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "user_two_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "last_message_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "unique_conversation" UNIQUE("user_one_id", "user_two_id")
);

CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_conversations_user_one" ON "conversations" ("user_one_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_user_two" ON "conversations" ("user_two_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_last_msg" ON "conversations" ("last_message_at");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created" ON "messages" ("created_at");
