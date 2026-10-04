const messageQueries = {
    // Create new message
    createMessage: `
        INSERT INTO messages ("senderId", content, "chatId", attachment, "messageType", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
    `,
    
    // Get message with sender and chat info
    getMessageWithDetails: `
        SELECT m.id, m."senderId", m.content, m."chatId", 
               CASE 
                   WHEN m.attachment IS NOT NULL THEN m.attachment::json
                   ELSE NULL
               END as attachment,
               m."messageType", m."createdAt", m."updatedAt",
               json_build_object(
                   'recipientCount', COALESCE(ds."recipientCount", 0),
                   'deliveredCount', COALESCE(ds."deliveredCount", 0),
                   'readCount', COALESCE(ds."readCount", 0),
                   'status', CASE
                       WHEN COALESCE(ds."recipientCount", 0) = 0 THEN 'sent'
                       WHEN COALESCE(ds."readCount", 0) = ds."recipientCount" THEN 'read'
                       WHEN COALESCE(ds."deliveredCount", 0) = ds."recipientCount" THEN 'delivered'
                       ELSE 'sent'
                   END
               ) as "deliveryStatus",
               json_build_object(
                   'id', sender.id,
                   'name', sender.name,
                   'pic', sender.pic
               ) as sender,
               json_build_object(
                   'id', c.id,
                   'chatName', c."chatName",
                   'isGroupChat', c."isGroupChat"
               ) as chat
        FROM messages m
        JOIN users sender ON m."senderId" = sender.id
        JOIN chats c ON m."chatId" = c.id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as "recipientCount",
                   COUNT(*) FILTER (WHERE md."deliveredAt" IS NOT NULL)::int as "deliveredCount",
                   COUNT(*) FILTER (WHERE md."readAt" IS NOT NULL)::int as "readCount"
            FROM message_deliveries md
            WHERE md."messageId" = m.id
        ) ds ON true
        WHERE m.id = $1;
    `,
    
    // Update latest message in chat
    updateLatestMessage: `
        UPDATE chats 
        SET "latestMessageId" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2;
    `,
    
    // Get all messages for a chat
    getChatMessages: `
        SELECT m.id, m."senderId", m.content, m."chatId", 
               CASE 
                   WHEN m.attachment IS NOT NULL THEN m.attachment::json
                   ELSE NULL
               END as attachment,
               m."messageType", m."createdAt", m."updatedAt",
               json_build_object(
                   'recipientCount', COALESCE(ds."recipientCount", 0),
                   'deliveredCount', COALESCE(ds."deliveredCount", 0),
                   'readCount', COALESCE(ds."readCount", 0),
                   'status', CASE
                       WHEN COALESCE(ds."recipientCount", 0) = 0 THEN 'sent'
                       WHEN COALESCE(ds."readCount", 0) = ds."recipientCount" THEN 'read'
                       WHEN COALESCE(ds."deliveredCount", 0) = ds."recipientCount" THEN 'delivered'
                       ELSE 'sent'
                   END
               ) as "deliveryStatus",
               json_build_object(
                   'id', sender.id,
                   'name', sender.name,
                   'pic', sender.pic,
                   'email', sender.email
               ) as sender,
               json_build_object(
                   'id', c.id,
                   'chatName', c."chatName"
               ) as chat
        FROM messages m
        JOIN users sender ON m."senderId" = sender.id
        JOIN chats c ON m."chatId" = c.id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as "recipientCount",
                   COUNT(*) FILTER (WHERE md."deliveredAt" IS NOT NULL)::int as "deliveredCount",
                   COUNT(*) FILTER (WHERE md."readAt" IS NOT NULL)::int as "readCount"
            FROM message_deliveries md
            WHERE md."messageId" = m.id
        ) ds ON true
        WHERE m."chatId" = $1
        ORDER BY m."createdAt" ASC;
    `,
    
    // Get chat users for message broadcasting
    getChatUsers: `
        SELECT u.id, u.name, u.pic, u.email
        FROM users u
        JOIN chat_users cu ON u.id = cu."userId"
        WHERE cu."chatId" = $1;
    `,

    // AI endpoints use this query to authorize the caller and determine
    // whether a conversation is a group chat before sending context to AWS.
    getChatAccess: `
        SELECT c.id, c."isGroupChat", c."chatName"
        FROM chats c
        JOIN chat_users cu ON cu."chatId" = c.id
        WHERE c.id = $1 AND cu."userId" = $2;
    `,

    // Keep the AI context intentionally small and text-only. Attachments and
    // binary content are not useful to the summarizer and should not leave
    // this service.
    getAiMessages: `
        SELECT m.content, m."messageType", m."createdAt", u.name as "senderName"
        FROM messages m
        JOIN users u ON u.id = m."senderId"
        WHERE m."chatId" = $1
          AND m.content IS NOT NULL
          AND m.content <> ''
        ORDER BY m."createdAt" DESC
        LIMIT $2;
    `,

    // Create one status row for every recipient except the sender.
    createMessageDeliveries: `
        INSERT INTO message_deliveries ("messageId", "recipientId")
        SELECT $1, "userId"
        FROM chat_users
        WHERE "chatId" = $2 AND "userId" <> $3
        ON CONFLICT ("messageId", "recipientId") DO NOTHING;
    `,

    markDelivered: `
        UPDATE message_deliveries
        SET "deliveredAt" = COALESCE("deliveredAt", CURRENT_TIMESTAMP)
        WHERE "messageId" = $1 AND "recipientId" = $2
        RETURNING "messageId", "recipientId", "deliveredAt", "readAt";
    `,

    markRead: `
        UPDATE message_deliveries
        SET "deliveredAt" = COALESCE("deliveredAt", CURRENT_TIMESTAMP),
            "readAt" = COALESCE("readAt", CURRENT_TIMESTAMP)
        WHERE "messageId" = $1 AND "recipientId" = $2
        RETURNING "messageId", "recipientId", "deliveredAt", "readAt";
    `,

    getDeliveryUpdate: `
        SELECT m.id as "messageId", m."chatId" as "chatId", m."senderId" as "senderId",
               json_build_object(
                   'recipientCount', COUNT(md."recipientId")::int,
                   'deliveredCount', COUNT(md."recipientId") FILTER (WHERE md."deliveredAt" IS NOT NULL)::int,
                   'readCount', COUNT(md."recipientId") FILTER (WHERE md."readAt" IS NOT NULL)::int,
                   'status', CASE
                       WHEN COUNT(md."recipientId") = 0 THEN 'sent'
                       WHEN COUNT(md."recipientId") FILTER (WHERE md."readAt" IS NOT NULL) = COUNT(md."recipientId") THEN 'read'
                       WHEN COUNT(md."recipientId") FILTER (WHERE md."deliveredAt" IS NOT NULL) = COUNT(md."recipientId") THEN 'delivered'
                       ELSE 'sent'
                   END
               ) as "deliveryStatus"
        FROM messages m
        LEFT JOIN message_deliveries md ON md."messageId" = m.id
        WHERE m.id = $1
        GROUP BY m.id, m."chatId", m."senderId";
    `
};

module.exports = messageQueries;
