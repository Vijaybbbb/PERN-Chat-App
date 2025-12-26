const chatQueries = {
    // Find existing chat between two users
    findExistingChat: `
        SELECT c.*, 
               json_agg(
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'email', u.email,
                       'pic', u.pic
                   )
               ) as users,
               lm.id as "latestMessageId",
               lm.content as "latestMessageContent",
               sender.name as "latestMessageSender"
        FROM chats c
        JOIN chat_users cu ON c.id = cu."chatId"
        JOIN users u ON cu."userId" = u.id
        LEFT JOIN messages lm ON c."latestMessageId" = lm.id
        LEFT JOIN users sender ON lm."senderId" = sender.id
        WHERE c."isGroupChat" = false 
        AND c.id IN (
            SELECT "chatId" FROM chat_users 
            WHERE "userId" = ANY($1::uuid[])
            GROUP BY "chatId" 
            HAVING COUNT(*) = 2
        )
        GROUP BY c.id, lm.id, sender.name
        HAVING COUNT(u.id) = 2;
    `,
    
    // Create new chat
    createChat: `
        INSERT INTO chats ("chatName", "isGroupChat", "createdAt", "updatedAt")
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
    `,
    
    // Add users to chat
    addUsersToChat: `
        INSERT INTO chat_users ("chatId", "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `,
    
    // Get chat with users
    getChatWithUsers: `
        SELECT c.*, 
               json_agg(
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'email', u.email,
                       'pic', u.pic
                   )
               ) as users
        FROM chats c
        JOIN chat_users cu ON c.id = cu."chatId"
        JOIN users u ON cu."userId" = u.id
        WHERE c.id = $1
        GROUP BY c.id;
    `,
    
    // Fetch user chats
    fetchUserChats: `
        SELECT DISTINCT c.*,
               ga.name as "groupAdminName",
               ga.email as "groupAdminEmail",
               ga.pic as "groupAdminPic",
               lm.content as "latestMessageContent",
               lm."messageType" as "latestMessageType",
               lm."createdAt" as "latestMessageTime",
               sender.name as "latestMessageSenderName",
               sender.pic as "latestMessageSenderPic"
        FROM chats c
        JOIN chat_users cu
         ON c.id = cu."chatId"
        LEFT JOIN users ga 
         ON c."groupAdminId" = ga.id
        LEFT JOIN messages lm
         ON c."latestMessageId" = lm.id
        LEFT JOIN users sender
         ON lm."senderId" = sender.id
        WHERE cu."userId" = $1
        ORDER BY c."updatedAt" DESC;
    `,
    
    // Get chat users
    getChatUsers: `
        SELECT u.id, u.name, u.email, u.pic
        FROM users u
        JOIN chat_users cu ON u.id = cu."userId"
        WHERE cu."chatId" = $1;
    `,
    
    // Update chat name
    updateChatName: `
        UPDATE chats 
        SET "chatName" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
    `,
    
    // Add user to group
    addUserToGroup: `
        INSERT INTO chat_users ("chatId", "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
    `,
    
    // Remove user from group
    removeUserFromGroup: `
        DELETE FROM chat_users 
        WHERE "chatId" = $1 AND "userId" = $2;
    `,
    
    // Get chat by id
    getChatById: `
        SELECT * FROM chats WHERE id = $1;
    `
};

module.exports = chatQueries;