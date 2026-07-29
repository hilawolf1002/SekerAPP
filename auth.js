// Authentication utility functions for SurveyPro

// Check if user is authenticated
function isAuthenticated() {
    try {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        const userSession = localStorage.getItem('userSession');
        
        console.log('Checking authentication:', { isLoggedIn, sessionExpiry, userSession: !!userSession });
        
        if (isLoggedIn === 'true' && sessionExpiry && userSession) {
            const now = Date.now();
            const expiry = parseInt(sessionExpiry);
            
            console.log('Session expiry check:', { now, expiry, isValid: now < expiry });
            
            if (now < expiry) {
                // Validate user data
                try {
                    const user = JSON.parse(userSession);
                    if (user && user.id && (user.username || user.email)) {
                        console.log('User authenticated successfully');
                        return true;
                    } else {
                        console.log('Invalid user data, clearing session');
                        clearSession();
                        return false;
                    }
                } catch (parseError) {
                    console.log('Error parsing user session, clearing session');
                    clearSession();
                    return false;
                }
            } else {
                // Session expired, clear it
                console.log('Session expired, clearing data');
                clearSession();
            }
        } else {
            console.log('Missing session data:', { isLoggedIn, sessionExpiry: !!sessionExpiry, userSession: !!userSession });
        }
        return false;
    } catch (error) {
        console.error('Error checking authentication:', error);
        // Clear any corrupted data
        clearSession();
        return false;
    }
}

// Clear session data
function clearSession() {
    try {
        localStorage.removeItem('userSession');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('sessionExpiry');
        console.log('Session cleared');
    } catch (error) {
        console.error('Error clearing session:', error);
    }
}

// Get current user data
function getCurrentUser() {
    try {
        // Don't call isAuthenticated() here to avoid infinite loop
        const userData = localStorage.getItem('userSession');
        if (userData) {
            const user = JSON.parse(userData);
            // Validate user data
            if (user && user.id && (user.username || user.email)) {
                console.log('Current user retrieved:', { id: user.id, username: user.username, email: user.email });
                return user;
            } else {
                console.log('Invalid user data found, clearing');
                clearSession();
                return null;
            }
        }
        console.log('No current user found');
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        // Clear any corrupted data
        clearSession();
        return null;
    }
}

// Logout function
function logout() {
    try {
        console.log('Logging out user');
        clearSession();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Force redirect even if there's an error
        window.location.href = 'login.html';
    }
}

// Check if user already has an active session
function checkExistingSession() {
    try {
        console.log('Checking existing session...');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        const userSession = localStorage.getItem('userSession');
        
        if (isLoggedIn === 'true' && sessionExpiry && userSession) {
            const now = Date.now();
            const expiry = parseInt(sessionExpiry);
            
            if (now < expiry) {
                // Validate user data before redirecting
                try {
                    const user = JSON.parse(userSession);
                    if (user && user.id && (user.username || user.email)) {
                        // Session is still valid, redirect to dashboard
                        console.log('Valid session found, redirecting to dashboard');
                        window.location.href = 'dashboard.html';
                        return;
                    } else {
                        console.log('Invalid user data in existing session, clearing');
                        clearSession();
                    }
                } catch (parseError) {
                    console.log('Error parsing user session, clearing');
                    clearSession();
                }
            } else {
                // Session expired, clear it
                console.log('Session expired, clearing data');
                clearSession();
            }
        } else {
            console.log('No valid session found');
        }
    } catch (error) {
        console.error('Error checking existing session:', error);
        // Clear any corrupted data
        clearSession();
    }
}

// Require authentication for protected pages
function requireAuth() {
    try {
        if (!isAuthenticated()) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error in requireAuth:', error);
        // Clear any corrupted data and redirect to login
        localStorage.removeItem('userSession');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
        return false;
    }
}

// Auto-redirect if already logged in
function redirectIfLoggedIn() {
    try {
        if (isAuthenticated()) {
            console.log('User already logged in, redirecting to dashboard');
            window.location.href = 'dashboard.html';
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error in redirectIfLoggedIn:', error);
        return false;
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getCurrentUser,
        logout,
        checkExistingSession,
        requireAuth,
        redirectIfLoggedIn
    };
}
