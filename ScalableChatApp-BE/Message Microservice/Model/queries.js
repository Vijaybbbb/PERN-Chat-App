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
        WHERE m."chatId" = $1
        ORDER BY m."createdAt" ASC;
    `,
    
    // Get chat users for message broadcasting
    getChatUsers: `
        SELECT u.id, u.name, u.pic, u.email
        FROM users u
        JOIN chat_users cu ON u.id = cu."userId"
        WHERE cu."chatId" = $1;
    `
};

module.exports = messageQueries;