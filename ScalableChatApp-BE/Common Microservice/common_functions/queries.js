const userQueries = {
    // Find user by ID
    findUserById: `
        SELECT id, name, email, pic, "isAdmin", "isBlocked", "createdAt", "updatedAt"
        FROM users 
        WHERE id = $1;
    `
};

module.exports = userQueries;