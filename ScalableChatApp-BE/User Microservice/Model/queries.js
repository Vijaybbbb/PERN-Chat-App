const userQueries = {
    // Find user by email
    findUserByEmail: `
        SELECT * FROM users WHERE email = $1;
    `,
    
    // Create new user
    createUser: `
        INSERT INTO users (name, email, password, pic, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, email, pic, "isAdmin", "isBlocked", "createdAt", "updatedAt";
    `,
    
    // Search users by name or email
    searchUsers: `
        SELECT id, name, email, pic, "createdAt", "updatedAt"
        FROM users 
        WHERE id != $1 
        AND (name ILIKE $2 OR email ILIKE $2)
        ORDER BY name;
    `,
    
    // Get all users except current user
    getAllUsersExceptCurrent: `
        SELECT id, name, email, pic, "createdAt", "updatedAt"
        FROM users 
        WHERE id != $1
        ORDER BY name;
    `,
    
    // Get user by id
    getUserById: `
        SELECT id, name, email, pic, "isAdmin", "isBlocked", "createdAt", "updatedAt"
        FROM users 
        WHERE id = $1;
    `
};

module.exports = userQueries;