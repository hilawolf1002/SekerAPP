// Configuration file for SurveyPro system
module.exports = {
    // Server configuration
    server: {
        port: process.env.PORT || 7766,
        host: process.env.HOST || '0.0.0.0', // Changed to 0.0.0.0 for production
        environment: process.env.NODE_ENV || 'production'
    },

    // Domain configuration
    domain: {
        name: 'sekerapp.online',
        protocol: 'https',
        corsOrigin: process.env.CORS_ORIGIN || 'https://sekerapp.online'
    },

    // Database configuration
    database: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/surveypro',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        }
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: '24h',
        refreshExpiresIn: '7d'
    },

    // Email configuration
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-email-password'
        }
    },

    // File upload configuration
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        uploadPath: './uploads/',
        tempPath: './temp/'
    },

    // Security configuration
    security: {
        bcryptRounds: 12,
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500 // limit each IP to 500 requests per windowMs (increased for admin panel)
        },
        cors: {
            origin: function (origin, callback) {
                // Allow requests from sekerapp.online and ask-me.online
                const allowedOrigins = [
                    'https://sekerapp.online',
                    'http://sekerapp.online',
                    'https://ask-me.online',
                    'http://ask-me.online',
                    'https://www.ask-me.online',
                    'http://www.ask-me.online'
                ];
                
                // Allow requests with no origin (like mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }
    },

    // Survey configuration
    survey: {
        maxQuestions: 50,
        maxOptions: 10,
        maxSurveysPerUser: 100,
        maxResponsesPerSurvey: 10000
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: './logs/app.log',
        maxSize: '20m',
        maxFiles: '14d'
    },

    // External services
    services: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID || '',
            appSecret: process.env.FACEBOOK_APP_SECRET || ''
        }
    },

    // API configuration
    api: {
        version: 'v1',
        prefix: '/api',
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000 // limit each IP to 1000 requests per windowMs
        }
    },

    // Cache configuration
    cache: {
        ttl: 300, // 5 minutes
        maxKeys: 1000
    },

    // Notification configuration
    notifications: {
        email: true,
        push: false,
        sms: false
    }
};
