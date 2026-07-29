const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const fs = require('fs');
const config = require('./config');
const UserManager = require('./users');
const PollManager = require('./polls');
require('dotenv').config();

// Initialize Express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'survey-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('רק קבצי תמונה מותרים'));
        }
    }
});

// Create specific upload middleware for surveys
const surveyUpload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('רק קבצי תמונה מותרים'));
        }
    }
}).single('image'); // Use single('image') to specifically handle the image field

// Trust proxy for nginx
app.set('trust proxy', 1);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Allow HTTP cookies for development and testing
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    store: new FileStore({
        path: './sessions',
        ttl: 86400, // 24 hours
        reapInterval: 3600, // Clean up expired sessions every hour
        retries: 0
    }),
    name: 'sekerapp.sid', // Custom session name
    unset: 'destroy', // Remove session when unset
    rolling: true // Extend session on each request
}));

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
    console.log('Sessions directory created:', sessionsDir);
} else {
    console.log('Sessions directory exists:', sessionsDir);
}

// Check if sessions directory is writable
try {
    const testFile = path.join(sessionsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('Sessions directory is writable');
} catch (error) {
    console.error('Sessions directory is not writable:', error);
}

// Session debugging middleware - minimal logging for production
app.use((req, res, next) => {
    // Only log critical errors and authentication issues
    if (req.path.startsWith('/api/auth/') && req.method === 'POST') {
        console.log('Auth request:', req.path, req.method, req.ip);
    }
    next();
});

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://www.google.com", "https://www.gstatic.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"]
            // Removed http://www.micropay.co.il since browser only talks to our server
        }
    }
}));

// Enhanced rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Reduced from 500 to 100 requests per 15 minutes
    message: {
        error: 'יותר מדי בקשות, נסה שוב מאוחר יותר'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests
    keyGenerator: (req) => {
        // Use IP + user agent for better rate limiting
        return req.ip + '|' + (req.headers['user-agent'] || 'unknown');
    }
});

// Stricter rate limiting for heavy operations
const heavyOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Only 20 heavy operations per 5 minutes
    message: {
        error: 'יותר מדי פעולות כבדות, נסה שוב בעוד 5 דקות'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Survey response rate limiting (stricter)
const surveyResponseLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Reduced from 5 to 3 votes per minute per IP
    message: {
        error: 'יותר מדי הצבעות, נסה שוב בעוד דקה'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip + '|survey'
});

// File upload rate limiting
const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Only 5 uploads per 10 minutes
    message: {
        error: 'יותר מדי העלאות קבצים, נסה שוב בעוד 10 דקות'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Authentication-specific rate limiter (more lenient)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Allow 10 login attempts per 15 minutes per IP
    message: {
        error: 'יותר מדי ניסיונות התחברות, נסה שוב בעוד 15 דקות'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
});

// More lenient rate limiting for stats and admin data
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // 200 requests per 5 minutes for admin data
    message: {
        error: 'יותר מדי בקשות לנתונים, נסה שוב בעוד 5 דקות'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to general API endpoints (EXCLUDING survey responses)
// app.use('/api/', limiter); // REMOVED - this was blocking survey responses!

// Authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/logout', authLimiter);

// Admin and stats endpoints
app.use('/api/stats', adminLimiter);
app.use('/api/admin', adminLimiter);

// Specific API endpoints that need rate limiting (NOT survey responses)
app.use('/api/surveys/create', limiter); // Only limit survey creation
app.use('/api/surveys/upload-image', limiter); // Only limit image uploads

// IMPORTANT: These endpoints are EXEMPT from rate limiting for survey takers:
// - /api/surveys/:id/respond
// - /api/surveys/:id/answer  
// - /api/surveys/:id/responses

// Rate limiting for admin operations only (exact matches)
// REMOVED: These were blocking survey responses!
// app.use('/api/surveys/:id/edit', limiter); // Only limit survey editing (exact match)
// app.use('/api/surveys/:id/export', limiter); // Only limit data export (exact match)

// Heavy operation endpoints - Only for admin operations
// app.use('/api/surveys/:id/export', heavyOperationLimiter); // REMOVED - duplicate with limiter above

// File upload endpoints - Only limit image uploads, not survey creation
// app.use('/api/surveys/upload-image', uploadLimiter); // REMOVED - duplicate with limiter above

// Survey response endpoints - NO LIMITS for survey takers!
// app.use('/api/surveys/:id/respond', surveyResponseLimiter); // REMOVED
// app.use('/api/surveys/:id/answer', surveyResponseLimiter); // REMOVED  
// app.use('/api/surveys/:id/responses', surveyResponseLimiter); // REMOVED

// Basic rate limiting for survey responses - REMOVED (redefined above)

// CORS configuration
app.use(cors(config.security.cors));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with caching
app.use(express.static(path.join(__dirname), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true,
    lastModified: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d', // Cache uploads for 7 days
    etag: true,
    lastModified: true
}));

// Passport serialization
passport.serializeUser((user, done) => {
    // Store only the user ID in session
    done(null, user.id);
});

passport.deserializeUser((userId, done) => {
    try {
        if (userId) {
            // Find user by ID from UserManager (synchronous)
            const user = UserManager.getUserById(userId);
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        } else {
            done(null, false);
        }
    } catch (error) {
        console.error('Deserialization error:', error);
        done(error);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '279303819452-4oclcf2fqjvdkbumt44oih2uqcvq4e18.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
            callbackURL: `${process.env.BASE_URL || 'https://sekerapp.online'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Create or find user from Google profile
        const result = await UserManager.findOrCreateGoogleUser({
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            provider: 'google'
        });
        
        if (result.success) {
            // Store user data in session
            return done(null, {
                ...result.user,
                token: result.token,
                isNewUser: result.isNewUser
            });
        } else {
            return done(new Error(result.error));
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
    }
}));

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        try {
            // Ensure user is properly authenticated
            if (!req.user || !req.user.id) {
                console.error('No user data after authentication');
                res.redirect('/login.html?error=no_user_data');
                return;
            }
            
            // Store user data in session
            req.session.userToken = req.user.token;
            req.session.userData = req.user;
            req.session.userId = req.user.id;
            req.session.userEmail = req.user.email;
            req.session.userRole = req.user.role;
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    res.redirect('/login.html?error=session_failed');
                    return;
                }
                
                if (req.user.isNewUser) {
                    res.redirect('/dashboard.html?welcome=true&provider=google&email=' + encodeURIComponent(req.user.email) + '&userId=' + req.user.id);
                } else {
                    res.redirect('/dashboard.html?login=success&provider=google&email=' + encodeURIComponent(req.user.email) + '&userId=' + req.user.id);
                }
            });
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect('/login.html?error=oauth_failed');
        }
    }
);

// Logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.redirect('/');
        });
    });
});

// Session cookie test
app.get('/api/session-cookie-test', (req, res) => {
    // Set a test cookie
    res.cookie('testCookie', 'test_value_' + Date.now(), {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Set session value
    req.session.cookieTest = 'session_cookie_test_' + Date.now();
    
    res.json({
        success: true,
        sessionId: req.sessionID,
        cookieTest: req.session.cookieTest,
        message: 'Cookie and session test completed',
        cookies: req.headers.cookie
    });
});

// Session persistence test
app.get('/api/session-persistence-test', (req, res) => {
    // Check if we have a previous test value
    const previousValue = req.session.previousTestValue;
    const currentValue = 'persistence_test_' + Date.now();
    
    // Set current value
    req.session.previousTestValue = currentValue;
    
    res.json({
        success: true,
        sessionId: req.sessionID,
        previousValue: previousValue,
        currentValue: currentValue,
        hasPreviousValue: !!previousValue,
        message: previousValue ? 'Session persistence working' : 'First request, no previous value'
    });
});

// Simple session test
app.get('/api/simple-session-test', (req, res) => {
    // Set a simple value in session
    req.session.simpleTest = 'hello_' + Date.now();
    
    // Send response with session info
    res.json({
        success: true,
        sessionId: req.sessionID,
        simpleTest: req.session.simpleTest,
        message: 'Simple session test completed'
    });
});

// Session debugging endpoint
app.get('/api/debug/session', (req, res) => {
    console.log('=== SESSION DEBUG ===');
    console.log('Request headers:', req.headers);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('req.user:', req.user);
    console.log('====================');
    
    res.json({
        success: true,
        sessionId: req.sessionID,
        sessionData: req.session,
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        headers: {
            cookie: req.headers.cookie,
            'user-agent': req.headers['user-agent']
        }
    });
});

// Session verification endpoint
app.get('/api/test/session/verify', (req, res) => {
    console.log('=== VERIFY SESSION ===');

    
    if (req.session.testValue && req.session.testTime) {
        res.json({
            success: true,
            sessionId: req.sessionID,
            testValue: req.session.testValue,
            testTime: req.session.testTime,
            message: 'Session maintained successfully'
        });
    } else {
        res.json({
            success: false,
            sessionId: req.sessionID,
            message: 'Session data not maintained',
            sessionData: req.session
        });
    }
});

// Test session endpoint
app.get('/api/test/session', (req, res) => {
    // Set a test value in session
    req.session.testValue = 'test_' + Date.now();
    req.session.testTime = new Date().toISOString();
    
    // Save session
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in test:', err);
            res.json({
                success: false,
                error: 'Session save failed',
                sessionId: req.sessionID
            });
        } else {
            res.json({
                success: true,
                sessionId: req.sessionID,
                sessionData: req.session,
                isAuthenticated: req.isAuthenticated(),
                user: req.user,
                message: 'Test session created and saved'
            });
        }
    });
});



// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'טוקן גישה נדרש'
        });
    }

    const result = UserManager.verifyToken(token);
    if (!result.success) {
        return res.status(403).json({
            success: false,
            error: result.error
        });
    }

    req.user = result.decoded;
    next();
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            error: 'אין לך הרשאה לבצע פעולה זו'
        });
    }
    next();
};

// API Routes

// User routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const result = await UserManager.registerUser(req.body);
        if (result.success) {
            // Set session data for automatic login after registration
            req.session.userId = result.user.id;
            req.session.username = result.user.username;
            req.session.role = result.user.role;
            req.session.isAuthenticated = true;
            
            console.log('Session data set after registration:', {
                sessionId: req.session.id,
                userId: req.session.userId,
                username: req.session.username,
                role: req.session.role,
                isAuthenticated: req.session.isAuthenticated
            });
            
            // Set session cookie
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error after registration:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'שגיאה בשמירת הסשן'
                    });
                }
                
                console.log('Session saved successfully after registration, session ID:', req.session.id);
                
                // Return both JWT tokens and session info
                res.status(201).json({
                    ...result,
                    sessionId: req.session.id
                });
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('Login attempt for user:', req.body.username);
        const result = await UserManager.loginUser(req.body);
        if (result.success) {
            console.log('Login successful for user:', result.user.username);
            
            // Set session data for session-based authentication
            req.session.userId = result.user.id;
            req.session.username = result.user.username;
            req.session.role = result.user.role;
            req.session.isAuthenticated = true;
            
            console.log('Session data set:', {
                sessionId: req.session.id,
                userId: req.session.userId,
                username: req.session.username,
                role: req.session.role,
                isAuthenticated: req.session.isAuthenticated
            });
            
            // Set session cookie
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'שגיאה בשמירת הסשן'
                    });
                }
                
                console.log('Session saved successfully, session ID:', req.session.id);
                
                // Return both JWT tokens and session info
                res.json({
                    ...result,
                    sessionId: req.session.id
                });
            });
        } else {
            console.log('Login failed for user:', req.body.username, 'Reason:', result.error);
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Session check endpoint
app.get('/api/auth/session', (req, res) => {
    try {
        console.log('Session check request:', {
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username,
            cookies: req.headers.cookie
        });
        
        if (req.session && req.session.isAuthenticated) {
            console.log('Session is valid for user:', req.session.username);
            res.json({
                success: true,
                isAuthenticated: true,
                user: {
                    id: req.session.userId,
                    username: req.session.username,
                    role: req.session.role
                }
            });
        } else {
            console.log('No valid session found');
            res.json({
                success: true,
                isAuthenticated: false
            });
        }
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבדיקת הסשן'
        });
    }
});

app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'טוקן רענון נדרש'
            });
        }

        const result = UserManager.refreshToken(refreshToken);
        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
    try {
        const user = UserManager.getUserById(req.user.userId);
        if (user) {
            res.json({
                success: true,
                user
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'משתמש לא נמצא'
            });
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const result = await UserManager.updateUserProfile(req.user.userId, req.body);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Survey routes
app.post('/api/surveys', authenticateToken, (req, res) => {
    try {
        const result = PollManager.createSurvey(req.body, req.user.userId);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey creation error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/surveys', (req, res) => {
    try {
        const surveys = PollManager.getPublicSurveys();
        res.json({
            success: true,
            surveys,
            total: surveys.length
        });
    } catch (error) {
        console.error('Surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Upload survey image
app.post('/api/surveys/upload-image', upload.single('image'), async (req, res) => {
    try {
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for image upload, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for image upload, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for image upload, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'לא נבחרה תמונה'
            });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בטעינת התמונה'
        });
    }
});

// Create new survey
app.post('/api/surveys/create', surveyUpload, async (req, res) => {
    try {
        console.log('=== SURVEY CREATE DEBUG ===');
        console.log('Session data:', {
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username
        });
        console.log('Headers:', {
            authorization: req.headers['authorization'],
            cookie: req.headers.cookie
        });
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log('JWT token received:', token.substring(0, 20) + '...');
            const result = UserManager.verifyToken(token);
            console.log('JWT verification result:', result);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token, userId:', userId);
            } else {
                console.log('JWT verification failed:', result.error);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey creation, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey creation, userId:', userId);
            }
        }
        
        if (!userId) {
            console.log('No user ID found for survey creation, returning 401');
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        console.log('User authenticated successfully for survey creation, userId:', userId);

        // Get user data for creator name
        const user = await UserManager.getUserById(userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'משתמש לא נמצא'
            });
        }

        // Parse form data (multipart/form-data)
        const { title, description, category, backgroundColor, thankYouMessage, requirePhone, isMultiQuestion } = req.body;
        let question = req.body.question;
        let answers = req.body.answers;
        
        // Parse questions from form data (HTML form sends them as questions[0][questionText], questions[0][answers][], etc.)
        let questions = [];
        if (isMultiQuestion === 'true' || isMultiQuestion === true) {
            // Extract all questions from form data
            const questionKeys = Object.keys(req.body).filter(key => key.includes('[questionText]'));
            
            console.log('Found question keys:', questionKeys);
            
            questionKeys.forEach(key => {
                const match = key.match(/questions\[(\d+)\]\[questionText\]/);
                if (match) {
                    const questionIndex = parseInt(match[1]);
                    const questionText = req.body[key];
                    const questionAnswers = [];
                    
                    console.log(`Processing question ${questionIndex}:`, questionText);
                    
                    // Get answers for this question
                    const answerKeys = Object.keys(req.body).filter(key => key.startsWith(`questions[${questionIndex}][answers]`));
                    console.log(`Found answer keys for question ${questionIndex}:`, answerKeys);
                    
                    answerKeys.forEach(answerKey => {
                        const answer = req.body[answerKey];
                        if (answer && (typeof answer === 'string' ? answer.trim() : String(answer || ''))) {
                            questionAnswers.push((answer && typeof answer === 'string') ? answer.trim() : String(answer || ''));
                        }
                    });
                    
                    console.log(`Question ${questionIndex} answers:`, questionAnswers);
                    
                    if (questionText && (typeof questionText === 'string' ? questionText.trim() : String(questionText || '')) && questionAnswers.length >= 2) {
                        questions.push({
                            questionText: (questionText && typeof questionText === 'string') ? questionText.trim() : String(questionText || ''),
                            answers: questionAnswers
                        });
                        console.log(`Added question ${questionIndex} to questions array`);
                    }
                }
            });
            
            // Also check if there are questions in the questions array field
            if (req.body.questions && Array.isArray(req.body.questions)) {
                console.log('Found questions array in form data:', req.body.questions);
                
                req.body.questions.forEach((q, index) => {
                    if (q && q.questionText && q.answers && Array.isArray(q.answers) && q.answers.length >= 2) {
                        console.log(`Processing question from array ${index}:`, q.questionText);
                        questions.push({
                            questionText: (q.questionText && typeof q.questionText === 'string') ? q.questionText.trim() : String(q.questionText || ''),
                            answers: q.answers.filter(answer => answer && (typeof answer === 'string' ? answer.trim() : String(answer || '')))
                        });
                        console.log(`Added question from array ${index} to questions array`);
                    }
                });
            }
            
            // Also add the main question if it exists and has answers
            if (question && answers && Array.isArray(answers) && answers.length >= 2) {
                questions.push({
                    questionText: (question && typeof question === 'string') ? question.trim() : String(question || ''),
                    answers: answers.filter(answer => answer && (typeof answer === 'string' ? answer.trim() : String(answer || '')))
                });
            }
            
            console.log('Parsed questions from form data:', questions);
            console.log('Main question:', question);
            console.log('Main answers:', answers);
            
            // For multi-question surveys, we don't need the separate question and answers fields
            // So we'll set them to null/empty to avoid confusion
            if (questions.length > 0) {
                question = null;
                answers = [];
            }
        }
        
        // Handle image upload
        let surveyImage = null;
        console.log('=== SURVEY CREATION DEBUG ===');
        console.log('File received:', req.file);
        console.log('Form body:', req.body);
        
        if (req.file) {
            surveyImage = req.file;
            console.log('Image file found:', {
                filename: surveyImage.filename,
                originalname: surveyImage.originalname,
                mimetype: surveyImage.mimetype,
                size: surveyImage.size
            });
        } else {
            console.log('No image file found in request');
        }
        
        // Validate required fields based on survey type
        let validationError = null;
        
        if (isMultiQuestion === 'true' || isMultiQuestion === true) {
            // Multi-question survey validation
            if (!title || !category || !questions || !Array.isArray(questions) || questions.length < 1) {
                validationError = 'כל השדות הנדרשים חייבים להיות מלאים עם לפחות שאלה אחת';
            } else {
                // Validate each question
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    if (!q.questionText || !q.answers || !Array.isArray(q.answers) || q.answers.length < 2) {
                        validationError = `שאלה ${i + 1} חייבת לכלול טקסט שאלה ולפחות 2 תשובות`;
                        break;
                    }
                }
            }
        } else {
            // Single question survey validation
            if (!title || !category || !question || !answers || !Array.isArray(answers) || answers.length < 2) {
                validationError = 'כל השדות הנדרשים חייבים להיות מלאים עם לפחות 2 תשובות';
            }
        }
        
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        // Create survey data
        let surveyData;
        
        if (isMultiQuestion === 'true' || isMultiQuestion === true) {
            // Multi-question survey
            surveyData = {
                title: (title && typeof title === 'string') ? title.trim() : String(title || ''),
                description: (description && typeof description === 'string') ? description.trim() : '',
                category: (category && typeof category === 'string') ? category.trim() : String(category || ''),
                backgroundColor: (backgroundColor && typeof backgroundColor === 'string') ? backgroundColor.trim() : 'default',
                isMultiQuestion: true,
                                questions: questions.map((q, qIndex) => ({
                    id: qIndex + 1,
                    questionText: (q.questionText && typeof q.questionText === 'string') ? q.questionText.trim() : String(q.questionText || ''),
                    answers: q.answers
                })),
                thankYouMessage: (thankYouMessage && typeof thankYouMessage === 'string') ? thankYouMessage.trim() : null,
                imageUrl: surveyImage ? `/uploads/${surveyImage.filename}` : null,
                requirePhone: true,
                creatorId: userId,
                creatorName: user.fullName || user.email,
                status: 'active',
                isPublic: true,
                responses: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        } else {
            // Single question survey (backward compatibility)
            surveyData = {
                title: (title && typeof title === 'string') ? title.trim() : String(title || ''),
                description: (description && typeof description === 'string') ? description.trim() : '',
                category: (category && typeof category === 'string') ? category.trim() : String(category || ''),
                backgroundColor: (backgroundColor && typeof backgroundColor === 'string') ? backgroundColor.trim() : 'default',
                isMultiQuestion: false,
                question: (question && typeof question === 'string') ? question.trim() : String(question || ''),
                answers: answers,
                thankYouMessage: (thankYouMessage && typeof thankYouMessage === 'string') ? thankYouMessage.trim() : null,
                imageUrl: surveyImage ? `/uploads/${surveyImage.filename}` : null,
                requirePhone: true,
                creatorId: userId,
                creatorName: user.fullName || user.email,
                status: 'active',
                isPublic: true,
                responses: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        
        console.log('Survey data created:', surveyData);
        console.log('Image URL will be:', surveyData.imageUrl);

        // Create survey using PollManager
        const result = PollManager.createSurvey(surveyData, userId);
        
        if (result.success) {
            console.log('Survey created successfully with ID:', result.survey.id);
            console.log('Survey image URL saved as:', result.survey.imageUrl);
            res.status(201).json({
                success: true,
                message: 'הסקר נוצר בהצלחה',
                surveyId: result.survey.id,
                survey: result.survey
            });
        } else {
            console.log('Survey creation failed:', result.error);
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey creation error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Create survey from WordPress plugin sync
app.post('/api/integrations/wordpress/surveys', async (req, res) => {
    try {
        const configuredApiKey = process.env.WORDPRESS_SYNC_API_KEY;
        const requestApiKey = req.headers['x-api-key'];

        if (!configuredApiKey) {
            return res.status(503).json({
                success: false,
                error: 'WordPress sync is not configured'
            });
        }

        if (!requestApiKey || requestApiKey !== configuredApiKey) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        const { wordpressId, title, description, question, answers } = req.body;
        const cleanAnswers = Array.isArray(answers)
            ? answers
                .map(answer => (answer && typeof answer === 'string') ? answer.trim() : String(answer || '').trim())
                .filter(Boolean)
            : [];

        if (!wordpressId || !title || !question || cleanAnswers.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'wordpressId, title, question and at least two answers are required'
            });
        }

        const surveyData = {
            title: title.trim(),
            description: description ? description.trim() : '',
            category: 'wordpress',
            backgroundColor: 'default',
            isMultiQuestion: false,
            question: question.trim(),
            answers: cleanAnswers,
            thankYouMessage: null,
            imageUrl: null,
            requirePhone: false,
            creatorName: 'WordPress',
            source: 'wordpress',
            externalId: String(wordpressId),
            status: 'active',
            isPublic: true,
            responses: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const creatorId = parseInt(process.env.WORDPRESS_SYNC_CREATOR_ID || '1', 10);
        const result = PollManager.createSurvey(surveyData, creatorId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json({
            success: true,
            surveyId: result.survey.id,
            survey: result.survey
        });
    } catch (error) {
        console.error('WordPress survey sync error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get user's own surveys
app.get('/api/surveys/my', async (req, res) => {
    try {
        console.log('=== SURVEYS/MY DEBUG ===');
        console.log('Session data:', {
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username
        });
        console.log('Headers:', {
            authorization: req.headers['authorization'],
            cookie: req.headers.cookie
        });
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log('JWT token received:', token.substring(0, 20) + '...');
            const result = UserManager.verifyToken(token);
            console.log('JWT verification result:', result);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token, userId:', userId);
            } else {
                console.log('JWT verification failed:', result.error);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data, userId:', userId);
            }
        }
        
        if (!userId) {
            console.log('No user ID found, returning 401');
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        console.log('User authenticated successfully, userId:', userId);
        const result = PollManager.getMySurveys(userId);
        res.json(result);
    } catch (error) {
        console.error('My surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get all public surveys
app.get('/api/surveys/public', (req, res) => {
    try {
        console.log('=== GETTING PUBLIC SURVEYS ===');
        const surveys = PollManager.getPublicSurveys();
        
        console.log('Public surveys result:', {
            total: surveys.length,
            surveys: surveys.map(s => ({
                id: s.id,
                title: s.title,
                imageUrl: s.imageUrl,
                hasImage: !!s.imageUrl
            }))
        });
        
        res.json({
            success: true,
            surveys,
            total: surveys.length
        });
    } catch (error) {
        console.error('Public surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get specific survey
app.get('/api/surveys/recent', async (req, res) => {
    try {
        console.log('=== GETTING RECENT SURVEYS ===');
        const result = PollManager.getRecentSurveys();
        
        console.log('Recent surveys result:', {
            success: result.success,
            total: result.total,
            surveys: result.surveys?.map(s => ({
                id: s.id,
                title: s.title,
                imageUrl: s.imageUrl,
                responses: s.responses
            }))
        });

        res.json(result);
    } catch (error) {
        console.error('Recent surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/surveys/:id', (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        console.log('=== GETTING SURVEY ===', surveyId);

        const survey = PollManager.getSurveyById(surveyId);
        
        if (survey) {
            console.log('Survey found:', {
                id: survey.id,
                title: survey.title,
                imageUrl: survey.imageUrl,
                hasImage: !!survey.imageUrl,
                backgroundColor: survey.backgroundColor
            });
            
            // Debug: Log survey answers structure
            console.log('Survey answers structure:', {
                answersCount: survey.answers ? survey.answers.length : 0,
                answers: survey.answers,
                firstAnswer: survey.answers && survey.answers.length > 0 ? survey.answers[0] : null,
                firstAnswerType: survey.answers && survey.answers.length > 0 ? typeof survey.answers[0] : 'no answers'
            });
            
            // BigQuery integration removed for survey 15 - using standard survey data
            
            res.json({
                success: true,
                survey
            });
        } else {
            console.log('Survey not found:', surveyId);
            res.status(404).json({
                success: false,
                error: 'סקר לא נמצא'
            });
        }
    } catch (error) {
        console.error('Survey fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Update survey with image support
app.post('/api/surveys/:id/edit', surveyUpload, async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey edit, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey edit, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey edit, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        // Parse form data
        const { title, description, category, backgroundColor, question, thankYouMessage, requirePhone, isMultiQuestion, questions } = req.body;
        const answers = req.body.answers;
        
        console.log('Survey edit request body:', req.body);
        console.log('Questions data:', questions);
        
        // Handle image upload
        let surveyImage = null;
        if (req.file) {
            surveyImage = req.file;
            console.log('Image file found for edit:', {
                filename: surveyImage.filename,
                originalname: surveyImage.originalname,
                mimetype: surveyImage.mimetype,
                size: surveyImage.size
            });
        }
        
        // Validate required fields
        if (!title || !category || !question || !answers || !Array.isArray(answers) || answers.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'כל השדות הנדרשים חייבים להיות מלאים עם לפחות 2 תשובות'
            });
        }

        // Prepare update data
        const updateData = {
            title: (title && typeof title === 'string') ? title.trim() : String(title || ''),
            description: (description && typeof description === 'string') ? description.trim() : '',
            category: (category && typeof category === 'string') ? category.trim() : String(category || ''),
            backgroundColor: (backgroundColor && typeof backgroundColor === 'string') ? backgroundColor.trim() : 'default',
            question: (question && typeof question === 'string') ? question.trim() : String(question || ''),
            answers: answers.map(answer => (answer && typeof answer === 'string') ? answer.trim() : String(answer || '')).filter(answer => answer.length > 0),
            thankYouMessage: (thankYouMessage && typeof thankYouMessage === 'string') ? thankYouMessage.trim() : null,
            requirePhone: true,
            isMultiQuestion: isMultiQuestion === true || isMultiQuestion === 'true',
            questions: questions || []
        };

        // If new image was uploaded, add it to update data
        if (surveyImage) {
            updateData.imageUrl = `/uploads/${surveyImage.filename}`;
        }

        const result = PollManager.updateSurvey(surveyId, updateData, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey edit error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Update survey
app.put('/api/surveys/:id', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey update, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey update, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey update, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.updateSurvey(surveyId, req.body, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Delete survey
app.delete('/api/surveys/:id', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey deletion, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey deletion, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey deletion, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.deleteSurvey(surveyId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Survey response routes
        // Submit survey response
        app.post('/api/surveys/:id/respond', async (req, res) => {
            try {
                const surveyId = parseInt(req.params.id);
                const { answer } = req.body;
                
                if (!answer) {
                    return res.status(400).json({
                        success: false,
                        error: 'יש לבחור תשובה'
                    });
                }

                // Get user ID if authenticated
                let userId = null;
                
                // First, try to get user ID from JWT token
                const authHeader = req.headers['authorization'];
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    const result = UserManager.verifyToken(token);
                    if (result.success) {
                        userId = result.decoded.userId;
                        console.log('User authenticated via JWT token for survey respond, userId:', userId);
                    }
                }
                
                // If no JWT token or invalid, try session authentication
                if (!userId) {
                    if (req.isAuthenticated() && req.user) {
                        userId = req.user.id;
                        console.log('User authenticated via session for survey respond, userId:', userId);
                    } else if (req.session && req.session.userId) {
                        userId = req.session.userId;
                        console.log('User authenticated via session data for survey respond, userId:', userId);
                    }
                }

                // Get survey URL from request body or referer header as fallback
                const surveyUrl = req.body.surveyUrl || req.headers.referer || req.get('Referer') || null;
                const result = PollManager.submitSurveyResponse(surveyId, answer, userId, surveyUrl);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey response error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת התשובה'
        });
    }
});

        // Submit survey response (alias for /respond)
        app.post('/api/surveys/:id/answer', async (req, res) => {
            try {
                const surveyId = parseInt(req.params.id);
                const { answer, answers } = req.body;
                
                // Get user ID if authenticated
                let userId = null;
                
                // First, try to get user ID from JWT token
                const authHeader = req.headers['authorization'];
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    const result = UserManager.verifyToken(token);
                    if (result.success) {
                        userId = result.decoded.userId;
                        console.log('User authenticated via JWT token for survey answer, userId:', userId);
                    }
                }
                
                // If no JWT token or invalid, try session authentication
                if (!userId) {
                    if (req.isAuthenticated() && req.user) {
                        userId = req.user.id;
                        console.log('User authenticated via session for survey answer, userId:', userId);
                    } else if (req.session && req.session.userId) {
                        userId = req.session.userId;
                        console.log('User authenticated via session data for survey answer, userId:', userId);
                    }
                }

                // Get survey URL from request body or referer header as fallback
                const surveyUrl = req.body.surveyUrl || req.headers.referer || req.get('Referer') || null;
                
                // Handle both single and multi-question surveys
                let submissionData;
                if (answers && Array.isArray(answers)) {
                    // Multi-question survey
                    submissionData = answers;
                } else if (answer) {
                    // Single question survey (backward compatibility)
                    submissionData = answer;
                } else {
                    return res.status(400).json({
                        success: false,
                        error: 'יש לבחור תשובה'
                    });
                }
                
                const result = PollManager.submitSurveyResponse(surveyId, submissionData, userId, surveyUrl);
        
                if (result.success) {
                    res.status(201).json(result);
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                console.error('Survey response error:', error);
                res.status(500).json({
                    success: false,
                    error: 'שגיאה בשליחת התשובה'
                });
            }
        });

// Submit survey response (public - no authentication required)
app.post('/api/surveys/:id/responses', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const { answerIndex, answer } = req.body;
        

        
        // Get survey to validate
        const survey = PollManager.getSurveyById(surveyId);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'הסקר לא נמצא'
            });
        }
        
        let answerText;
        
        // Handle both answerIndex and answer parameters
        if (answerIndex !== undefined && answerIndex !== null) {
            // Validate answer index
            if (answerIndex < 0 || answerIndex >= survey.answers.length) {
                return res.status(400).json({
                    success: false,
                    error: 'אינדקס תשובה לא תקין'
                });
            }
            
            // Get answer text from index
            const answerObj = survey.answers[answerIndex];
            answerText = answerObj.text || answerObj;
        } else if (answer) {
            // Use provided answer text directly
            answerText = answer;
            
            // Validate that this answer exists in the survey
            const validAnswer = survey.answers.find(a => (a.text || a) === answerText);
            if (!validAnswer) {
                return res.status(400).json({
                    success: false,
                    error: 'תשובה לא תקינה'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'נדרש לבחור תשובה'
            });
        }
        
        // Get client IP address (basic)
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
        
        // Submit response (anonymous) with survey URL from request body or referer header as fallback
        const surveyUrl = req.body.surveyUrl || req.headers.referer || req.get('Referer') || null;
        
        const result = PollManager.submitSurveyResponse(surveyId, answerText, null, surveyUrl, clientIP);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'התשובה נשלחה בהצלחה'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey response submission error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת התשובה'
        });
    }
});

// Get survey responses (requires authentication)
// Public endpoint for survey 20 dashboard responses (no auth required)
app.get('/api/surveys/20/responses/public', async (req, res) => {
    try {
        const surveyId = 20;
        
        // Get all responses for survey 20 without auth check
        const responses = PollManager.getSurveyResponsesPublic(surveyId);
        
        res.json({
            success: true,
            responses: responses || [],
            total: responses ? responses.length : 0
        });
    } catch (error) {
        console.error('Survey 20 responses fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/surveys/:id/responses', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey responses, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey responses, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey responses, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.getSurveyResponses(surveyId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey responses fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get survey statistics
app.get('/api/surveys/:id/stats', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey stats, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey stats, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for survey stats, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.getSurveyStats(surveyId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey stats fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Export survey data
app.get('/api/surveys/:id/export', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey export, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey export, userId:', userId);
            } else if (req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session userId for survey export, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.exportSurveyData(surveyId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey export error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Share survey data with another user
app.post('/api/surveys/:id/share-data', async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const { email, permissions } = req.body;
        
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for survey data sharing, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for survey data sharing, userId:', userId);
            } else if (req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session userId for survey data sharing, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'יש להכניס כתובת מייל'
            });
        }

        const result = PollManager.shareSurveyData(surveyId, userId, email, permissions);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Survey data sharing error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get surveys shared with current user
app.get('/api/surveys/shared', async (req, res) => {
    try {
        let userId = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                console.log('User authenticated via JWT token for shared surveys, userId:', userId);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                console.log('User authenticated via session for shared surveys, userId:', userId);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                console.log('User authenticated via session data for shared surveys, userId:', userId);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        const result = PollManager.getSharedSurveys(userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Shared surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = UserManager.getAllUsers(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/admin/surveys', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = PollManager.getAllSurveys(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Admin surveys fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Admin survey update endpoint - allows admins to edit any survey
app.put('/api/admin/surveys/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const updateData = req.body;
        
        // For admin users, bypass creator permission check
        const result = PollManager.updateSurveyAsAdmin(surveyId, updateData, req.user.role);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Admin survey update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Admin survey update endpoint
app.put('/api/admin/surveys/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const result = PollManager.updateSurvey(surveyId, req.body, req.user.id, true); // true = admin override
        res.json(result);
    } catch (error) {
        console.error('Admin survey update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { isActive } = req.body;
        
        const result = UserManager.updateUserStatus(userId, isActive, req.user.role);
        res.json(result);
    } catch (error) {
        console.error('User status update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const result = UserManager.deleteUser(userId, req.user.role);
        res.json(result);
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Survey deletion endpoint (admin only)
app.delete('/api/admin/surveys/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const result = PollManager.deleteSurvey(surveyId, req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Survey deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Admin survey status update endpoint
app.put('/api/admin/surveys/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const surveyId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!status || !['active', 'inactive', 'draft'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'סטטוס לא תקין'
            });
        }
        
        const result = PollManager.updateSurveyStatusAsAdmin(surveyId, status, req.user.role);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Admin survey status update error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Bulk operations endpoints (admin only)
app.delete('/api/admin/surveys', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = PollManager.deleteAllSurveys(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Bulk survey deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.delete('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = UserManager.deleteAllUsers(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Bulk user deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Reset system endpoint (admin only)
app.post('/api/admin/reset-system', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = PollManager.resetEntireSystem(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('System reset error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get all responses endpoint (admin only)
app.get('/api/admin/responses', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = PollManager.getAllResponses(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Admin responses fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Clear all responses endpoint (admin only)
app.delete('/api/admin/responses', authenticateToken, requireAdmin, (req, res) => {
    try {
        const result = PollManager.clearAllResponses(req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Admin responses clear error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Delete individual response endpoint (admin only)
app.delete('/api/admin/responses/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const responseId = parseInt(req.params.id);
        const result = PollManager.deleteResponse(responseId, req.user.role);
        res.json(result);
    } catch (error) {
        console.error('Admin response deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Statistics routes
app.get('/api/stats/overview', async (req, res) => {
    try {
        let userId = null;
        let userRole = null;
        
        // First, try to get user ID from JWT token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const result = UserManager.verifyToken(token);
            if (result.success) {
                userId = result.decoded.userId;
                userRole = result.decoded.role;
                console.log('User authenticated via JWT token for stats overview, userId:', userId, 'role:', userRole);
            }
        }
        
        // If no JWT token or invalid, try session authentication
        if (!userId) {
            if (req.isAuthenticated() && req.user) {
                userId = req.user.id;
                userRole = req.user.role;
                console.log('User authenticated via session for stats overview, userId:', userId, 'role:', userRole);
            } else if (req.session && req.session.userId) {
                userId = req.session.userId;
                userRole = req.session.userRole;
                console.log('User authenticated via session data for stats overview, userId:', userId, 'role:', userRole);
            }
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'יש להתחבר תחילה'
            });
        }

        if (userRole === 'superadmin') {
            // Admin gets all stats
            const userStats = UserManager.getUserStats();
            const surveyStats = PollManager.getSurveyOverview();
            
            res.json({
                success: true,
                users: userStats,
                surveys: surveyStats
            });
        } else {
            // Regular user gets only their own stats
            const userSurveyStats = PollManager.getUserStats(userId);
            
            res.json({
                success: true,
                surveys: userSurveyStats.stats
            });
        }
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('healthy');
});

// Short link redirect handler - MUST BE BEFORE /survey/:id route to avoid conflicts
app.get('/s/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        // Load short links from file
        const shortLinksFile = path.join(__dirname, 'data/short-links.json');
        let shortLinks = {};
        
        try {
            if (fs.existsSync(shortLinksFile)) {
                const data = fs.readFileSync(shortLinksFile, 'utf8');
                shortLinks = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading short links file:', error);
        }
        
        // Check if short code exists and is not expired
        if (!shortLinks[shortCode]) {
            return res.status(404).send(`
                <html dir="rtl">
                <head>
                    <title>לינק לא נמצא</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
                        .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
                        .message { color: #7f8c8d; font-size: 16px; }
                    </style>
                </head>
                <body>
                    <div class="error">⚠️ לינק לא נמצא</div>
                    <div class="message">הלינק המבוקש לא קיים או פג תוקפו</div>
                </body>
                </html>
            `);
        }
        
        const linkData = shortLinks[shortCode];
        const now = new Date();
        
        if (linkData.expires_at && new Date(linkData.expires_at) < now) {
            // Remove expired link
            delete shortLinks[shortCode];
            try {
                fs.writeFileSync(shortLinksFile, JSON.stringify(shortLinks, null, 2));
            } catch (error) {
                console.error('Error removing expired link:', error);
            }
            
            return res.status(410).send(`
                <html dir="rtl">
                <head>
                    <title>לינק פג תוקף</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
                        .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
                        .message { color: #7f8c8d; font-size: 16px; }
                    </style>
                </head>
                <body>
                    <div class="error">⏰ לינק פג תוקף</div>
                    <div class="message">הלינק המבוקש פג תוקפו</div>
                </body>
                </html>
            `);
        }
        
        // Increment hit counter
        shortLinks[shortCode].hits = (shortLinks[shortCode].hits || 0) + 1;
        shortLinks[shortCode].last_accessed = new Date().toISOString();
        
        // Save updated data
        try {
            fs.writeFileSync(shortLinksFile, JSON.stringify(shortLinks, null, 2));
        } catch (error) {
            console.error('Error updating short link stats:', error);
        }
        
        // Redirect to original URL
        res.redirect(linkData.original_url);
        
    } catch (error) {
        console.error('Error handling short link redirect:', error);
        res.status(500).send(`
            <html dir="rtl">
            <head>
                <title>שגיאה</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
                    .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
                    .message { color: #7f8c8d; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="error">❌ שגיאה</div>
                <div class="message">אירעה שגיאה בטיפול בלינק המבוקש</div>
            </body>
            </html>
        `);
    }
});

// HTML page routes - MOVED TO END AFTER API ROUTES
// Survey page route - כל סקר יהיה נגיש אוטומטית
app.get('/survey/:id', (req, res) => {
    const surveyId = req.params.id;
    
    // Check if survey exists
    try {
        const survey = PollManager.getSurveyById(parseInt(surveyId));
        
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'הסקר לא נמצא'
            });
        }
        
        // Send the appropriate survey page
        // Survey 21 has a completely different design
        if (surveyId === '21') {
            res.sendFile(path.join(__dirname, 'survey-21.html'));
        } else {
            res.sendFile(path.join(__dirname, 'survey.html'));
        }
    } catch (error) {
        console.error('Error serving survey page:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Survey 15 specific endpoints
app.get('/api/survey-15-votes', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        res.json({
            success: true,
            survey: {
                id: survey.id,
                title: survey.title,
                question: survey.question,
                answers: survey.answers,
                responses: survey.responses,
                totalVotes: survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0)
            }
        });
    } catch (error) {
        console.error('Survey 15 votes error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/survey-15-real-data', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        // Get real-time data with additional statistics
        const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
        const answersWithPercentages = survey.answers.map(answer => ({
            ...answer,
            percentage: totalVotes > 0 ? ((answer.votes || 0) / totalVotes * 100).toFixed(1) : 0
        }));
        
        res.json({
            success: true,
            survey: {
                id: survey.id,
                title: survey.title,
                question: survey.question,
                answers: answersWithPercentages,
                responses: survey.responses,
                totalVotes: totalVotes,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Survey 15 real data error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

app.get('/api/survey-15-answer-history', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        // Get response history for survey 15 (public data only)
        const surveyResponses = [];
        
        res.json({
            success: true,
            history: {
                surveyId: 15,
                totalResponses: survey.responses,
                answerHistory: survey.answers.map(answer => ({
                    id: answer.id,
                    text: answer.text,
                    votes: answer.votes || 0,
                    percentage: survey.responses > 0 ? ((answer.votes || 0) / survey.responses * 100).toFixed(1) : 0
                })),
                totalResponses: surveyResponses.length,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Survey 15 answer history error:', error);
        res.status(500).json({
            success: false,
                error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get current survey 15 status
app.get('/api/survey-15-status', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
        
        res.json({
            success: true,
            status: {
                surveyId: 15,
                title: survey.title,
                question: survey.question,
                totalResponses: survey.responses || 0,
                totalVotes: totalVotes,
                answers: survey.answers.map(answer => ({
                    id: answer.id,
                    text: answer.text,
                    votes: answer.votes || 0,
                    percentage: totalVotes > 0 ? ((answer.votes || 0) / totalVotes * 100).toFixed(1) : 0
                })),
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Survey 15 status error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get survey 15 summary (simple format)
app.get('/api/survey-15-summary', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
        
        res.json({
            success: true,
            summary: {
                totalResponses: survey.responses || 0,
                totalVotes: totalVotes,
                topAnswer: survey.answers.reduce((max, answer) => 
                    (answer.votes || 0) > (max.votes || 0) ? answer : max
                ),
                answers: survey.answers.map(answer => ({
                    text: answer.text,
                    votes: answer.votes || 0
                }))
            }
        });
    } catch (error) {
        console.error('Survey 15 summary error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Get survey 15 current data (for dashboard)
app.get('/api/survey-15-current', (req, res) => {
    try {
        const survey = PollManager.getSurveyById(15);
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'סקר 15 לא נמצא'
            });
        }
        
        const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
        
        res.json({
            success: true,
            current: {
                surveyId: 15,
                title: survey.title,
                question: survey.question,
                totalResponses: survey.responses || 0,
                totalVotes: totalVotes,
                answers: survey.answers.map(answer => ({
                    id: answer.id,
                    text: answer.text,
                    votes: answer.votes || 0,
                    percentage: totalVotes > 0 ? ((answer.votes || 0) / totalVotes * 100).toFixed(1) : 0
                })),
                lastUpdated: new Date().toISOString(),
                status: 'active'
            }
        });
    } catch (error) {
        console.error('Survey 15 current data error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// SMS routes
app.use('/api/sms', require('./routes/sms'));

// Short links routes
app.use('/api/short-links', require('./routes/short-links'));

// Super Admin Check API endpoint
app.get('/api/check_super_admin', (req, res) => {
    try {
        console.log('=== CHECK SUPER ADMIN API ===');
        console.log('Session:', req.session);
        console.log('Session ID:', req.session?.id);
        console.log('User ID:', req.session?.userId);
        console.log('Role:', req.session?.role);
        console.log('Cookies:', req.headers.cookie);
        
        // Check if user is authenticated
        if (!req.session || !req.session.userId) {
            console.log('No session or userId, returning 401');
            return res.status(401).json({
                success: false,
                is_super_admin: false,
                error: 'נדרשת התחברות'
            });
        }
        
        // Check if user is super admin
        const isSuperAdmin = req.session.role === 'super_admin' || req.session.role === 'superadmin';
        console.log('Is super admin:', isSuperAdmin);
        
        res.json({
            success: true,
            is_super_admin: isSuperAdmin,
            user_id: req.session.userId,
            username: req.session.username,
            role: req.session.role
        });
        
    } catch (error) {
        console.error('Error checking super admin status:', error);
        res.status(500).json({
            success: false,
            is_super_admin: false,
            error: 'שגיאה בבדיקת הרשאות'
        });
    }
});

// SMS page route - PROTECTED: Super Admin only
app.get('/send_sms', (req, res) => {
    // Check if user is authenticated and is super admin
    if (!req.session || !req.session.userId) {
        return res.redirect('/s-admin.html');
    }
    
    // Check if user is super admin
    if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
        return res.redirect('/s-admin.html');
    }
    
    res.sendFile(path.join(__dirname, 'send_sms.html'));
});

// WhatsApp Groups page route - PUBLIC ACCESS
app.get(['/whatsappgroups', '/whatsappgroups.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'whatsappgroups.html'));
});

// SMS page route with .html extension - PROTECTED: Super Admin only
app.get('/send_sms.html', (req, res) => {
    // Check if user is authenticated and is super admin
    if (!req.session || !req.session.userId) {
        return res.redirect('/s-admin.html');
    }
    
    // Check if user is super admin
    if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
        return res.redirect('/s-admin.html');
    }
    
    res.sendFile(path.join(__dirname, 'send_sms.html'));
});

// Get Micropay configuration - PROTECTED: Super Admin only
app.get('/api/micropay-config', (req, res) => {
    try {
        // Check if user is authenticated and is super admin
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                error: 'נדרשת התחברות'
            });
        }
        
        if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'אין לך הרשאות לגשת למידע זה'
            });
        }
        
        res.json({
            success: true,
            token: process.env.MICROPAY_TOKEN,
            from: process.env.MICROPAY_FROM,
            base_url: 'https://www.micropay.co.il/extApi/scheduleSms.php' // Updated to HTTPS
        });
        
    } catch (error) {
        console.error('Error getting Micropay config:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת הגדרות Micropay'
        });
    }
});

// Micropay SMS Proxy - PROTECTED: Super Admin only
app.post('/api/micropay/send-sms', async (req, res) => {
    try {
        // Check if user is authenticated and is super admin
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                error: 'נדרשת התחברות'
            });
        }
        
        if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'אין לך הרשאות לגשת למידע זה'
            });
        }
        
        // Get form data parameters and ensure they're lowercase
        const raw = { ...req.body };
        const data = {};
        for (const [k, v] of Object.entries(raw)) {
            data[String(k).toLowerCase()] = typeof v === 'string' ? v : (v ?? '');
        }
        
        // Validate required parameters
        if (!data.token) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: token'
            });
        }
        
        if (!data.from) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: from'
            });
        }
        
        // Micropay rule: either listjson OR (msg + list) - not both
        if (data.listjson) {
            // If listjson is provided, remove list and msg
            delete data.list;
            delete data.msg;
            // Ensure listjson is a JSON string
            try {
                if (typeof data.listjson !== 'string') {
                    data.listjson = JSON.stringify(data.listjson);
                }
            } catch (_) {
                // If JSON.stringify fails, return error
                return res.status(400).json({
                    success: false,
                    error: 'Invalid listjson format'
                });
            }
        } else if (!data.msg || !data.list) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: either listjson OR (msg + list)'
            });
        }
        
        // Determine method: default to POST (more stable for large payloads)
        const isGet = String(data.get || '').trim() === '1';
        const isPost = String(data.post || '').trim() === '2' || !isGet;
        
        // Build Micropay parameters (without validate)
        const params = new URLSearchParams();
        const allowKeys = new Set([
            'token', 'from', 'msg', 'list', 'pid', 'listjson',
            'desc', 'np', 'ne', 'dh', 'di', 'dy', 'dm', 'dd',
            'get', 'post'
        ]);
        
        for (const [k, v] of Object.entries(data)) {
            if (allowKeys.has(k)) {
                params.append(k, v ?? '');
            }
        }
        
        // validate parameter must be last and without value
        const wantsValidate = 'validate' in data;
        
        const endpoint = '/extApi/scheduleSms.php';
        const host = 'www.micropay.co.il';
        
        // Use HTTPS for Micropay
        const https = require('https');
        
        const baseOptions = {
            host,
            port: 443,
            method: isGet ? 'GET' : 'POST',
            path: isGet
                ? `${endpoint}?${params.toString()}${wantsValidate ? '&validate' : ''}`
                : endpoint,
            headers: isGet
                ? { 'User-Agent': 'sekerapp-proxy/1.0' }
                : {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(
                        params.toString() + (wantsValidate ? '&validate' : '')
                    ),
                    'User-Agent': 'sekerapp-proxy/1.0'
                },
            timeout: 15000
        };
        
        console.log('Proxying SMS request to Micropay:', {
            method: baseOptions.method,
            host: baseOptions.host,
            path: baseOptions.path,
            isGet,
            isPost,
            wantsValidate
        });
        
        const result = await new Promise((resolve, reject) => {
            const proxyReq = https.request(baseOptions, (upstream) => {
                let body = '';
                upstream.setEncoding('utf8');
                upstream.on('data', (chunk) => (body += chunk));
                upstream.on('end', () => {
                    // Micropay returns text: "OK <code>" or "ERROR <desc>"
                    const text = body.trim();
                    resolve(text);
                });
            });
            
            proxyReq.on('timeout', () => {
                proxyReq.destroy(new Error('Upstream timeout'));
                reject(new Error('Micropay request timeout'));
            });
            
            proxyReq.on('error', (err) => {
                reject(new Error(`Micropay upstream error: ${err.message}`));
            });
            
            if (!isGet) {
                const payload = params.toString() + (wantsValidate ? '&validate' : '');
                proxyReq.write(payload);
            }
            proxyReq.end();
        });
        
        console.log('Micropay response:', result);
        
        // Return the result as plain text
        res.set('Content-Type', 'text/plain');
        res.send(result);
        
    } catch (error) {
        console.error('Error proxying SMS request:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת SMS',
            detail: error.message
        });
    }
});

// Short link creation endpoint
app.post('/api/shorten-link', async (req, res) => {
    try {
        const { target_url, job_id, expires_days } = req.body;
        
        if (!target_url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: target_url'
            });
        }
        
        // Generate a unique short code
        const shortCode = generateShortCode();
        
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (parseInt(expires_days) || 30));
        
        // Create short link data
        const shortLinkData = {
            original_url: target_url,
            short_code: shortCode,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            job_id: job_id || 'sms_campaign',
            hits: 0,
            last_accessed: null
        };
        
        // Load existing short links
        const shortLinksFile = path.join(__dirname, 'data/short-links.json');
        let shortLinks = {};
        
        try {
            if (fs.existsSync(shortLinksFile)) {
                const data = fs.readFileSync(shortLinksFile, 'utf8');
                shortLinks = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading short links file:', error);
        }
        
        // Add new short link
        shortLinks[shortCode] = shortLinkData;
        
        // Save to file
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(shortLinksFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(shortLinksFile, JSON.stringify(shortLinks, null, 2));
        } catch (error) {
            console.error('Error saving short link:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to save short link'
            });
        }
        
        // Return the shortened URL
        const shortenedUrl = `https://sekerapp.online/s/${shortCode}`;
        
        res.json({
            success: true,
            shortened_url: shortenedUrl,
            short_code: shortCode,
            original_url: target_url,
            expires_at: expiresAt.toISOString()
        });
        
    } catch (error) {
        console.error('Error creating short link:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת לינק מקוצר'
        });
    }
});

// Helper function to generate short codes
function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Keep the GET endpoint for backward compatibility but redirect to POST
app.get('/api/micropay/send-sms', async (req, res) => {
    try {
        // Check if user is authenticated and is super admin
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                error: 'נדרשת התחברות'
            });
        }
        
        if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'אין לך הרשאות לגשת למידע זה'
            });
        }
        
        // Get query parameters and convert to form data
        const queryData = { ...req.query };
        const formData = new URLSearchParams();
        
        for (const [k, v] of Object.entries(queryData)) {
            if (v !== undefined && v !== '') {
                formData.append(k, v);
            }
        }
        
        // Forward to POST endpoint
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/micropay/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
        
        const result = await response.text();
        
        // Return the result as plain text
        res.set('Content-Type', 'text/plain');
        res.send(result);
        
    } catch (error) {
        console.error('Error in GET SMS endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת SMS',
            detail: error.message
        });
    }
});

// BigQuery endpoint removed - no longer needed

// BigQuery endpoint removed - no longer needed

// HTML page routes - ADDED HERE AFTER ALL API ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    // Check if user is authenticated via session
    if (!req.session || !req.session.isAuthenticated) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 's-admin.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'הנתיב לא נמצא'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'שגיאה פנימית בשרת'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('SIGINT', () => {
    process.exit(0);
});

// Session check endpoint
app.get('/api/auth/session', (req, res) => {
    try {
        console.log('Session check request:', {
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username,
            cookies: req.headers.cookie
        });
        
        if (req.session && req.session.isAuthenticated) {
            console.log('Session is valid for user:', req.session.username);
            res.json({
                success: true,
                isAuthenticated: true,
                user: {
                    id: req.session.userId,
                    username: req.session.username,
                    role: req.session.role
                }
            });
        } else {
            console.log('No valid session found');
            res.json({
                success: true,
                isAuthenticated: false
            });
        }
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבדיקת הסשן'
        });
    }
});

app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'טוקן רענון נדרש'
            });
        }

        const result = UserManager.refreshToken(refreshToken);
        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית בשרת'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'שגיאה בהתנתקות'
                });
            }
            
            // Clear the session cookie
            res.clearCookie('sekerapp.sid');
            
            res.json({
                success: true,
                message: 'ההתנתקות הושלמה בהצלחה'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהתנתקות'
        });
    }
});

// Test endpoint to verify session functionality
app.get('/api/auth/test-session', (req, res) => {
    try {
        console.log('Test session request:', {
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username,
            cookies: req.headers.cookie,
            sessionData: req.session
        });
        
        res.json({
            success: true,
            sessionExists: !!req.session,
            sessionId: req.session?.id,
            isAuthenticated: req.session?.isAuthenticated,
            userId: req.session?.userId,
            username: req.session?.username,
            cookies: req.headers.cookie
        });
    } catch (error) {
        console.error('Test session error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבדיקת הסשן'
        });
    }
});



// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
    console.log(`🚀 SekerApp server running on http://${HOST}:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🔒 Content Security Policy: Enabled`);
    console.log(`📊 API endpoints available:`);
    console.log(`   - GET  /api/surveys/recent`);
    console.log(`   - GET  /api/surveys/public`);
    console.log(`   - GET  /api/surveys/:id`);
    console.log(`   - POST /api/surveys/create`);
    console.log(`   - POST /api/surveys/:id/edit`);
    console.log(`   - GET  /api/check_super_admin`);
    console.log(`   - GET  /api/micropay-config`);
    console.log(`   - GET  /api/micropay/send-sms`);
    console.log(`   - GET  /admin (s-admin.html)`);
});

module.exports = app;
