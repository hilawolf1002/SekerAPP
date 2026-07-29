const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// In-memory user storage (replace with database in production)
let users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@surveypro.com',
        fullName: 'מנהל מערכת',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Gi', // admin123
        role: 'superadmin',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date()
    },
    {
        id: 2,
        username: 'demo',
        email: 'demo@surveypro.com',
        fullName: 'יוסי כהן',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Gi', // demo123
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-07-01'),
        lastLogin: new Date()
    },
    {
        id: 3,
        username: 'lior0334',
        email: 'lior0334@surveypro.com',
        fullName: 'Lior0334',
        password: '$2b$12$8duhJstIqmFqNJ0qhc96XOQCIllpS/k/SlmmvsIHD2a2HMJIfqdpi', // Lior1001$
        role: 'superadmin',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date()
    }
];

let nextUserId = 4;

// File paths for data persistence
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load users from file on startup
function loadUsersFromFile() {
    try {
        console.log('UserManager: Starting to load users from file...');
        console.log('UserManager: Looking for file at:', USERS_FILE);
        
        if (fs.existsSync(USERS_FILE)) {
            console.log('UserManager: File exists, reading...');
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            console.log('UserManager: File content length:', data.length, 'characters');
            
            const rawUsers = JSON.parse(data);
            console.log('UserManager: Parsed', rawUsers.length, 'users from JSON');
            
            // Convert date strings back to Date objects
            users = rawUsers.map(user => ({
                ...user,
                createdAt: new Date(user.createdAt),
                lastLogin: user.lastLogin ? new Date(user.lastLogin) : null
            }));
            
            // Update nextUserId
            if (users.length > 0) {
                nextUserId = Math.max(...users.map(u => u.id)) + 1;
                console.log('UserManager: Next user ID will be:', nextUserId);
            }
            
            console.log('UserManager: Successfully loaded', users.length, 'users from file');
        } else {
            console.log('UserManager: No users file found, using default users');
        }
    } catch (error) {
        console.error('UserManager: Error loading users from file:', error);
        console.log('UserManager: Using default users');
    }
}

// Save users to file
function saveUsersToFile() {
    try {
        console.log('UserManager: Starting to save users to file...');
        console.log('UserManager: Current users array length:', users.length);
        console.log('UserManager: File path:', USERS_FILE);
        
        const dataToSave = users.map(user => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
            lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null
        }));
        
        console.log('UserManager: Data to save:', JSON.stringify(dataToSave, null, 2));
        
        fs.writeFileSync(USERS_FILE, JSON.stringify(dataToSave, null, 2));
        console.log('UserManager: Successfully saved', users.length, 'users to file at:', USERS_FILE);
        
        // Verify the file was written
        if (fs.existsSync(USERS_FILE)) {
            const fileSize = fs.statSync(USERS_FILE).size;
            console.log('UserManager: File exists, size:', fileSize, 'bytes');
        } else {
            console.error('UserManager: File was not created!');
        }
    } catch (error) {
        console.error('UserManager: Error saving users to file:', error);
        console.error('UserManager: Error stack:', error.stack);
    }
}

// Load users on startup
loadUsersFromFile();

class UserManager {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Object} - Registration result
     */
    static async registerUser(userData) {
        try {
            const { username, email, fullName, password } = userData;

            // Validation
            if (!username || !email || !fullName || !password) {
                return {
                    success: false,
                    error: 'כל השדות הם חובה'
                };
            }

            if (password.length < 8) {
                return {
                    success: false,
                    error: 'הסיסמה חייבת להכיל לפחות 8 תווים'
                };
            }

            // Check if username already exists
            if (users.find(u => u.username === username)) {
                return {
                    success: false,
                    error: 'שם המשתמש כבר קיים במערכת'
                };
            }

            // Check if email already exists
            if (users.find(u => u.email === email)) {
                return {
                    success: false,
                    error: 'כתובת האימייל כבר קיימת במערכת'
                };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

            // Create new user
            const newUser = {
                id: nextUserId++,
                username,
                email,
                fullName,
                password: hashedPassword,
                role: 'user',
                isActive: true,
                createdAt: new Date(),
                lastLogin: null
            };

            users.push(newUser);

            // Save to file
            console.log('UserManager: Saving users to file after registration...');
            saveUsersToFile();

            // Generate JWT token
            const token = jwt.sign(
                { userId: newUser.id, username: newUser.username, role: newUser.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Remove password from response
            const { password: _, ...userResponse } = newUser;

            return {
                success: true,
                message: 'ההרשמה הושלמה בהצלחה',
                user: userResponse,
                token
            };

        } catch (error) {
            console.error('Error in user registration:', error);
            return {
                success: false,
                error: 'שגיאה בהרשמה, נסה שוב מאוחר יותר'
            };
        }
    }

    /**
     * Authenticate user login
     * @param {Object} credentials - Login credentials
     * @returns {Object} - Login result
     */
    static async loginUser(credentials) {
        try {
            // Reload users from file to ensure we have the latest data
            loadUsersFromFile();
            
            const { username, password } = credentials;

            // Validation
            if (!username || !password) {
                return {
                    success: false,
                    error: 'שם משתמש וסיסמה הם חובה'
                };
            }

            // Find user by username or email
            console.log('UserManager: Attempting login for:', username);
            console.log('UserManager: Current users in memory:', users.length);
            console.log('UserManager: Users:', users.map(u => ({ id: u.id, username: u.username, email: u.email })));
            
            const user = users.find(u => 
                u.username === username || u.email === username
            );

            if (!user) {
                console.log('UserManager: User not found for:', username);
                return {
                    success: false,
                    error: 'שם משתמש או סיסמה שגויים'
                };
            }
            
            console.log('UserManager: User found:', { id: user.id, username: user.username, email: user.email });

            if (!user.isActive) {
                return {
                    success: false,
                    error: 'החשבון מושעה, פנה למנהל המערכת'
                };
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: 'שם משתמש או סיסמה שגויים'
                };
            }

            // Update last login
            user.lastLogin = new Date();
            
            // Save to file after updating last login
            saveUsersToFile();

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Generate refresh token
            const refreshToken = jwt.sign(
                { userId: user.id, type: 'refresh' },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshExpiresIn }
            );

            // Remove password from response
            const { password: _, ...userResponse } = user;

            return {
                success: true,
                message: 'ההתחברות הושלמה בהצלחה',
                user: userResponse,
                token,
                refreshToken
            };

        } catch (error) {
            console.error('Error in user login:', error);
            return {
                success: false,
                error: 'שגיאה בהתחברות, נסה שוב מאוחר יותר'
            };
        }
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {Object} - Token verification result
     */
    static verifyToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            return {
                success: true,
                decoded
            };
        } catch (error) {
            return {
                success: false,
                error: 'טוקן לא תקין או פג תוקף'
            };
        }
    }

    /**
     * Refresh JWT token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} - Token refresh result
     */
    static refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret);
            
            if (decoded.type !== 'refresh') {
                return {
                    success: false,
                    error: 'סוג טוקן לא תקין'
                };
            }

            const user = users.find(u => u.id === decoded.userId);
            if (!user || !user.isActive) {
                return {
                    success: false,
                    error: 'משתמש לא נמצא או לא פעיל'
                };
            }

            // Generate new access token
            const newToken = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            return {
                success: true,
                token: newToken
            };

        } catch (error) {
            return {
                success: false,
                error: 'טוקן רענון לא תקין או פג תוקף'
            };
        }
    }

    /**
     * Get user by ID
     * @param {number} userId - User ID
     * @returns {Object|null} - User object or null
     */
    static getUserById(userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            const { password, ...userResponse } = user;
            return userResponse;
        }
        return null;
    }

    /**
     * Get user by username
     * @param {string} username - Username
     * @returns {Object|null} - User object or null
     */
    static getUserByUsername(username) {
        const user = users.find(u => u.username === username);
        if (user) {
            const { password, ...userResponse } = user;
            return userResponse;
        }
        return null;
    }

    /**
     * Update user profile
     * @param {number} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} - Update result
     */
    static async updateUserProfile(userId, updateData) {
        try {
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                return {
                    success: false,
                    error: 'משתמש לא נמצא'
                };
            }

            const user = users[userIndex];
            const allowedFields = ['fullName', 'email'];

            // Update allowed fields
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    user[field] = updateData[field];
                }
            });

            // Update password if provided
            if (updateData.password) {
                if (updateData.password.length < 8) {
                    return {
                        success: false,
                        error: 'הסיסמה חייבת להכיל לפחות 8 תווים'
                    };
                }
                user.password = await bcrypt.hash(updateData.password, config.security.bcryptRounds);
            }
            
            // Save to file after updating profile
            saveUsersToFile();

            // Remove password from response
            const { password: _, ...userResponse } = user;

            return {
                success: true,
                message: 'הפרופיל עודכן בהצלחה',
                user: userResponse
            };

        } catch (error) {
            console.error('Error updating user profile:', error);
            return {
                success: false,
                error: 'שגיאה בעדכון הפרופיל'
            };
        }
    }

    /**
     * Get all users (admin only)
     * @param {string} role - User role for authorization
     * @returns {Object} - Users list result
     */
    static getAllUsers(role) {
        if (role !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לצפות ברשימת המשתמשים'
            };
        }

        const usersList = users.map(user => {
            const { password, ...userResponse } = user;
            return userResponse;
        });

        return {
            success: true,
            users: usersList,
            total: usersList.length
        };
    }

    /**
     * Update user status (admin only)
     * @param {number} userId - User ID
     * @param {boolean} isActive - User active status
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Status update result
     */
    static updateUserStatus(userId, isActive, adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לעדכן סטטוס משתמשים'
            };
        }

        const user = users.find(u => u.id === userId);
        if (!user) {
            return {
                success: false,
                error: 'משתמש לא נמצא'
            };
        }

        user.isActive = isActive;
        
        // Save to file after updating status
        saveUsersToFile();

        return {
            success: true,
            message: `המשתמש ${isActive ? 'הופעל' : 'הושעה'} בהצלחה`
        };
    }

    /**
     * Delete user (admin only)
     * @param {number} userId - User ID
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Delete result
     */
    static deleteUser(userId, adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק משתמשים'
            };
        }

        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return {
                success: false,
                error: 'משתמש לא נמצא'
            };
        }

        users.splice(userIndex, 1);
        
        // Save to file after deleting user
        saveUsersToFile();

        return {
            success: true,
            message: 'המשתמש נמחק בהצלחה'
        };
    }

    /**
     * Get user statistics
     * @returns {Object} - User statistics
     */
    static getUserStats() {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive).length;
        const suspendedUsers = totalUsers - activeUsers;
        const newUsersThisMonth = users.filter(u => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return u.createdAt > monthAgo;
        }).length;

        return {
            totalUsers,
            activeUsers,
            suspendedUsers,
            newUsersThisMonth
        };
    }

    /**
     * Find or create user from Google OAuth
     * @param {Object} googleProfile - Google OAuth profile
     * @returns {Object} - User data and token
     */
    static async findOrCreateGoogleUser(googleProfile) {
        try {
            const { id: googleId, email, name: fullName } = googleProfile;
            
            // Check if user already exists by email
            let user = users.find(u => u.email === email);
            
            if (user) {
                // User exists, update last login and return
                user.lastLogin = new Date();
                console.log(`Existing user logged in: ${user.email}`);
            } else {
                // Create new user from Google profile
                const newUser = {
                    id: nextUserId++,
                    username: `user_${googleId}`,
                    email,
                    fullName,
                    password: null, // No password for OAuth users
                    role: 'user',
                    isActive: true,
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    googleId: googleId,
                    provider: 'google'
                };
                
                users.push(newUser);
                user = newUser;
            
            // Save to file
            saveUsersToFile();
            
            console.log(`New Google user created: ${user.email}`);
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Remove password from response
            const { password: _, ...userResponse } = user;

            return {
                success: true,
                user: userResponse,
                token,
                isNewUser: !user.lastLogin || user.lastLogin.getTime() === user.createdAt.getTime()
            };
        } catch (error) {
            console.error('Google OAuth user creation error:', error);
            return {
                success: false,
                error: 'שגיאה ביצירת משתמש מ-Google OAuth'
            };
        }
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Object|null} - User object or null if not found
     */
    static getUserByEmail(email) {
        try {
            return users.find(user => user.email === email) || null;
        } catch (error) {
            console.error('Error getting user by email:', error);
            return null;
        }
    }

    /**
     * Delete all users (admin only)
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Bulk delete result
     */
    static deleteAllUsers(adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק משתמשים'
            };
        }

        try {
            const totalUsers = users.length;
            
            // Clear all users (except the current admin)
            users.length = 0;
            
            // Re-add the admin user to prevent complete system lockout
            const adminUser = {
                id: 1,
                username: 'admin',
                email: 'admin@surveypro.com',
                fullName: 'System Administrator',
                password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Gi', // admin123
                role: 'superadmin',
                isActive: true,
                createdAt: new Date(),
                lastLogin: new Date()
            };
            users.push(adminUser);
            
            // Save to file after bulk delete
            saveUsersToFile();

            return {
                success: true,
                message: 'כל המשתמשים נמחקו בהצלחה',
                deletedUsersCount: totalUsers - 1, // -1 because admin remains
                remainingUsersCount: 1
            };
        } catch (error) {
            console.error('Error deleting all users:', error);
            return {
                success: false,
                error: 'שגיאה במחיקת כל המשתמשים'
            };
        }
    }
}

module.exports = UserManager;
