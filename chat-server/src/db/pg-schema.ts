import { relations, sql } from "drizzle-orm";
import { index, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

const now = sql.raw("(now())::text");

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    avatar: text("avatar"),
});

export const identityKeys = pgTable(
    "identity_keys",
    {
        user_id: integer("user_id").primaryKey(),
        ed25519_pub: text("ed25519_pub").notNull(),
        x25519_pub: text("x25519_pub").notNull(),
        proof_sig: text("proof_sig").notNull(),
        updated_at: text("updated_at").notNull().default(now),
    },
    (table) => [index("idx_identity_keys_updated").on(table.updated_at)],
);

export const messages = pgTable(
    "messages",
    {
        id: serial("id").primaryKey(),
        conv_key: text("conv_key").notNull(),
        sender_id: integer("sender_id").notNull(),
        recipient_id: integer("recipient_id").notNull(),
        msg_id: text("msg_id").notNull(),
        nonce: text("nonce").notNull(),
        ct: text("ct").notNull(),
        sig: text("sig").notNull(),
        ts: integer("ts").notNull().default(0),
        created_at: text("created_at").notNull().default(now),
        delivered_at: text("delivered_at"),
        read_at: text("read_at"),
    },
    (table) => [
        index("idx_messages_conv").on(table.conv_key),
        index("idx_messages_recipient").on(table.recipient_id),
        index("idx_messages_pending").on(table.recipient_id, table.delivered_at),
        uniqueIndex("idx_messages_msg_id_conv").on(table.conv_key, table.msg_id),
    ],
);

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(identityKeys, { fields: [messages.sender_id], references: [identityKeys.user_id], relationName: "sender" }),
    recipient: one(identityKeys, { fields: [messages.recipient_id], references: [identityKeys.user_id], relationName: "recipient" }),
}));

export const identityKeysRelations = relations(identityKeys, ({ many }) => ({
    sentMessages: many(messages, { relationName: "sender" }),
    receivedMessages: many(messages, { relationName: "recipient" }),
}));

export type IdentityKeyRow = typeof identityKeys.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
