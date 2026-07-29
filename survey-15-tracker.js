// Survey 15 Statistics Tracker
// This file handles real-time tracking of survey responses

// Google Analytics for Survey 15
(function() {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-WNRFLCEHLT';
    document.head.appendChild(script);
    
    // Initialize Google Analytics
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-WNRFLCEHLT');
    
    // Track survey page view
    gtag('event', 'page_view', {
        page_title: 'Survey 15 - הימין של הימין',
        page_location: window.location.href
    });
})();

class Survey15Tracker {
    constructor() {
        this.statsFile = '/data/survey-15-stats.json';
        this.currentStats = null;
        this.init();
    }

    async init() {
        await this.loadStats();
        this.startAutoSave();
    }

    async loadStats() {
        try {
            // First try to load existing stats from localStorage
            const savedStats = localStorage.getItem('survey15_tracker_stats');
            if (savedStats) {
                this.currentStats = JSON.parse(savedStats);
            } else {
                this.createDefaultStats();
            }
            
            // Then sync with server data to get real-time votes
            await this.syncWithServer();
        } catch (error) {
            console.error('Failed to load survey stats:', error);
            this.createDefaultStats();
            await this.syncWithServer();
        }
    }

    async syncWithServer() {
        try {
            // Get real survey data from server using the current endpoint
            const surveyResponse = await fetch('/api/survey-15-current');
            const surveyData = await surveyResponse.json();
            
            if (surveyData.success) {
                const survey = surveyData.current;
                
                // Update total responses
                this.currentStats.totalResponses = survey.totalVotes || 0;
                
                // Update current answers with real data
                survey.answers.forEach((answer) => {
                    const answerKey = answer.id.toString();
                    if (this.currentStats.currentAnswers[answerKey]) {
                        this.currentStats.currentAnswers[answerKey].votes = answer.votes || 0;
                        this.currentStats.currentAnswers[answerKey].percentage = answer.percentage || 0;
                    }
                });
                
                // Update percentages
                this.updatePercentages();
                
                // Update last updated
                this.currentStats.lastUpdated = survey.lastUpdated || new Date().toISOString();
                

            }
        } catch (error) {
            console.error('Failed to sync with server:', error);
            // Fallback to original endpoint
            try {
                const fallbackResponse = await fetch('/api/surveys/15');
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.success) {
                    const survey = fallbackData.survey;
                    this.currentStats.totalResponses = survey.responses || 0;
                    
                    survey.answers.forEach((answer, index) => {
                        const answerKey = (index + 1).toString();
                        if (this.currentStats.currentAnswers[answerKey]) {
                            this.currentStats.currentAnswers[answerKey].votes = answer.votes || 0;
                        }
                    });
                    
                    this.updatePercentages();
                    this.currentStats.lastUpdated = new Date().toISOString();

                }
            } catch (fallbackError) {
                console.error('Fallback endpoint also failed:', fallbackError);
            }
        }
    }

    createDefaultStats() {
        const today = new Date().toISOString().split('T')[0];
        this.currentStats = {
            surveyId: 15,
            title: "הימין של הימין - הסקר הגדול במדינה",
            lastUpdated: new Date().toISOString(),
            totalResponses: 0,
            dailyStats: {
                [today]: {
                    responses: 0,
                    answers: {
                        "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0
                    },
                    hourlyData: this.generateHourlyData()
                }
            },
            answerHistory: [],
            currentAnswers: {
                "1": {"text": "ינון מגל", "votes": 0, "percentage": 0},
                "2": {"text": "איתמר בן גביר", "votes": 0, "percentage": 0},
                "3": {"text": "בצלאל סמוטריץ'", "votes": 0, "percentage": 0},
                "4": {"text": "עופר וינטר", "votes": 0, "percentage": 0},
                "5": {"text": "משה פייגלין", "votes": 0, "percentage": 0},
                "6": {"text": "אליהו יוסייאן", "votes": 0, "percentage": 0},
                "7": {"text": "יותם זימרי", "votes": 0, "percentage": 0},
                "8": {"text": "מתלבט", "votes": 0, "percentage": 0},
                "9": {"text": "אף אחד מהם", "votes": 0, "percentage": 0}
            },
            trendData: [],
            peakHours: [],
            engagementMetrics: {
                averageResponseTime: 0,
                completionRate: 0,
                bounceRate: 0
            }
        };
    }

    generateHourlyData() {
        const hourlyData = {};
        for (let i = 0; i < 24; i++) {
            hourlyData[i] = 0;
        }
        return hourlyData;
    }

    startAutoSave() {
        // Auto-save every 60 seconds (1 minute) to reduce API calls
        setInterval(() => {
            this.saveStats();
        }, 60000);
    }

    async saveStats() {
        try {
            // Save to localStorage instead of trying to save to a file
            localStorage.setItem('survey15_tracker_stats', JSON.stringify(this.currentStats));
            localStorage.setItem('survey15_tracker_lastSaved', Date.now().toString());
            
            console.log('Survey 15 stats saved to localStorage successfully');
        } catch (error) {
            console.error('Error saving survey 15 stats to localStorage:', error);
        }
    }

    async recordResponse(answerIndex, answerText, surveyUrl = null, userAgent = null) {
        try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();

            // Update current answers
            const answerKey = answerIndex.toString();
            if (this.currentStats.currentAnswers[answerKey]) {
                this.currentStats.currentAnswers[answerKey].votes++;
            }
            
            // Update daily stats
        if (!this.currentStats.dailyStats[today]) {
            this.currentStats.dailyStats[today] = {
                responses: 0,
                answers: {
                    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0
                },
                hourlyData: this.generateHourlyData()
            };
        }

        this.currentStats.dailyStats[today].responses++;
            this.currentStats.dailyStats[today].answers[answerKey]++;
        this.currentStats.dailyStats[today].hourlyData[currentHour]++;

            // Update total responses
            this.currentStats.totalResponses++;

            // Add to answer history with the full survey URL
        this.currentStats.answerHistory.push({
            answerIndex: answerIndex,
            answerText: answerText,
                timestamp: now.toISOString(),
                surveyUrl: surveyUrl || window.location.href, // Save the full URL of the survey page
                userAgent: userAgent || navigator.userAgent
            });
            
            // Keep only last 1000 responses in memory
            if (this.currentStats.answerHistory.length > 1000) {
                this.currentStats.answerHistory = this.currentStats.answerHistory.slice(-1000);
            }
            
            // Update percentages
            this.updatePercentages();

        // Update last updated
        this.currentStats.lastUpdated = now.toISOString();

            // Save stats
        await this.saveStats();

            
            
            return true;
        } catch (error) {
            console.error('Error recording survey 15 response:', error);
            return false;
        }
    }

    updatePercentages() {
        const total = this.currentStats.totalResponses;
        if (total > 0) {
            Object.keys(this.currentStats.currentAnswers).forEach(key => {
                const votes = this.currentStats.currentAnswers[key].votes;
                this.currentStats.currentAnswers[key].percentage = ((votes / total) * 100).toFixed(1);
            });
        }
    }

    getStats() {
        return this.currentStats;
    }

    getAnswerHistory() {
        return this.currentStats.answerHistory;
    }

    // Get detailed voting data for export (with full URLs)
    getDetailedVotingData() {
        if (!this.currentStats.answerHistory || this.currentStats.answerHistory.length === 0) {
            return [];
        }

        const detailedData = this.currentStats.answerHistory.map(vote => ({
            surveyUrl: vote.surveyUrl || 'לא ידוע',
            answerText: vote.answerText || 'לא ידוע',
            answerIndex: vote.answerIndex,
            timestamp: vote.timestamp,
            userAgent: vote.userAgent || 'לא ידוע'
        }));
        
        return detailedData;
    }

    // Get voting data for CSV export
    getVotingDataForCSV() {
        const detailedData = this.getDetailedVotingData();
        
        return detailedData.map(vote => ({
            surveyUrl: vote.surveyUrl,
            answerText: vote.answerText,
            timestamp: vote.timestamp,
            answerIndex: vote.answerIndex
        }));
    }

    // Test function to add sample data for testing
    addTestData() {
        // Add multiple test entries with different URLs
        const testData = [
            {
                url: 'https://sekerapp.online/survey/15?mp_phone=972524200334&test=true',
                answer: 'איתמר בן גביר',
                index: 2
            },
            {
                url: 'https://sekerapp.online/survey/15?mp_phone=972501234567&source=whatsapp',
                answer: 'בצלאל סמוטריץ\'',
                index: 3
            },
            {
                url: 'https://sekerapp.online/survey/15?mp_phone=972509876543&campaign=email',
                answer: 'משה פייגלין',
                index: 5
            },
            {
                url: 'https://sekerapp.online/survey/15?mp_phone=972505551234&referrer=facebook',
                answer: 'אליהו יוסייאן',
                index: 6
            }
        ];
        
        // Add each test entry
        testData.forEach((entry, i) => {
            this.recordResponse(entry.index, entry.answer, entry.url, 'Test Browser');
        });
        
        // Force save to localStorage
        this.saveStats();
    }

    // Debug function to show current data structure
    debugDataStructure() {
        // Debug function - no logging
    }

    getDailyStats(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.currentStats.dailyStats[targetDate] || null;
    }

    getTrendData() {
        return this.currentStats.trendData;
    }

    getPeakHours() {
        return this.currentStats.peakHours;
    }

    getEngagementMetrics() {
        return this.currentStats.engagementMetrics;
    }

    async getRealTimeStats() {
        try {
            const response = await fetch('/api/survey-15-current');
            const data = await response.json();
            
            if (data.success) {
                return data.current; // Return current instead of survey
            } else {
                console.error('Failed to get real-time stats:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Error fetching real-time stats:', error);
            return null;
        }
    }

    // Force refresh from server
    async forceRefresh() {

        await this.syncWithServer();
        return this.currentStats;
    }

    // Get current vote counts
    getCurrentVotes() {
        return this.currentStats.currentAnswers;
    }

    // Get total responses
    getTotalResponses() {
        return this.currentStats.totalResponses;
    }

    getCurrentHourStats() {
        const now = new Date();
        const currentHour = now.getHours();
        const today = now.toISOString().split('T')[0];
        
        return {
            currentHour: currentHour,
            hourlyResponses: this.currentStats.dailyStats[today]?.hourlyData[currentHour] || 0,
            totalResponses: this.currentStats.totalResponses
        };
    }

    // Reset all data to zero
    resetAllData() {

        
        const today = new Date().toISOString().split('T')[0];
        
        this.currentStats = {
            surveyId: 15,
            title: "הימין של הימין - הסקר הגדול במדינה",
            lastUpdated: new Date().toISOString(),
            totalResponses: 0,
            dailyStats: {
                [today]: {
                    responses: 0,
                    answers: {
                        "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0
                    },
                    hourlyData: this.generateHourlyData()
                }
            },
            answerHistory: [],
            currentAnswers: {
                "1": {"text": "ינון מגל", "votes": 0, "percentage": 0},
                "2": {"text": "איתמר בן גביר", "votes": 0, "percentage": 0},
                "3": {"text": "בצלאל סמוטריץ'", "votes": 0, "percentage": 0},
                "4": {"text": "עופר וינטר", "votes": 0, "percentage": 0},
                "5": {"text": "משה פייגלין", "votes": 0, "percentage": 0},
                "6": {"text": "אליהו יוסייאן", "votes": 0, "percentage": 0},
                "7": {"text": "יותם זימרי", "votes": 0, "percentage": 0},
                "8": {"text": "מתלבט", "votes": 0, "percentage": 0},
                "9": {"text": "אף אחד מהם", "votes": 0, "percentage": 0}
            },
            trendData: [],
            peakHours: [],
            engagementMetrics: {
                averageResponseTime: 0,
                completionRate: 0,
                bounceRate: 0
            }
        };
        
        // Save the reset data
        this.saveStats();
        
        // Also clear localStorage
        localStorage.removeItem('survey15_tracker_stats');
        localStorage.removeItem('survey15_tracker_lastSaved');
        

    }
}

// Initialize tracker immediately and make it globally available
let survey15Tracker = new Survey15Tracker();

// Export for use in other scripts
window.Survey15Tracker = Survey15Tracker;
window.survey15Tracker = survey15Tracker;

// Also initialize when DOM is loaded to ensure proper setup
document.addEventListener('DOMContentLoaded', function() {
    if (!window.survey15Tracker) {
        window.survey15Tracker = new Survey15Tracker();
    }
    
});
