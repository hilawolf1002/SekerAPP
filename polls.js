const config = require('./config');
const fs = require('fs');
const path = require('path');
const UserManager = require('./users');

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SURVEYS_FILE = path.join(DATA_DIR, 'surveys.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data storage
let surveys = [];
let surveyResponses = [];
let nextSurveyId = 1;
let nextResponseId = 1;

// Ensure all surveys have votes field
function ensureVotesField() {
    console.log('=== ENSURE VOTES FIELD ===');
    console.log('Processing', surveys.length, 'surveys');
    
    surveys.forEach((survey, index) => {
        console.log(`Processing survey ${index + 1}:`, {
            id: survey.id,
            title: survey.title,
            isMultiQuestion: survey.isMultiQuestion,
            hasQuestions: !!survey.questions,
            questionsLength: survey.questions ? survey.questions.length : 0,
            hasAnswers: !!survey.answers,
            answersLength: survey.answers ? survey.answers.length : 0
        });
        
        // Handle single question surveys
        if (survey.answers && Array.isArray(survey.answers)) {
            survey.answers.forEach(answer => {
                if (typeof answer === 'object' && !answer.hasOwnProperty('votes')) {
                    answer.votes = 0;
                }
            });
        }
        
        // Handle multi-question surveys
        if (survey.isMultiQuestion && survey.questions && Array.isArray(survey.questions)) {
            survey.questions.forEach(question => {
                if (question.answers && Array.isArray(question.answers)) {
                    question.answers.forEach(answer => {
                        if (typeof answer === 'object' && !answer.hasOwnProperty('votes')) {
                            answer.votes = 0;
                        }
                    });
                }
            });
        }
        
        // Ensure requirePhone field exists
        if (!survey.hasOwnProperty('requirePhone')) {
            survey.requirePhone = false;
        }
        
        // Ensure isMultiQuestion field exists
        if (!survey.hasOwnProperty('isMultiQuestion')) {
            survey.isMultiQuestion = false;
        }
        
        // Ensure backgroundColor field exists
        if (!survey.hasOwnProperty('backgroundColor')) {
            survey.backgroundColor = 'default';
            console.log(`Added backgroundColor 'default' to survey ${survey.id}`);
            hasChanges = true;
        }
        
        // Ensure questions field exists for multi-question surveys
        if (survey.isMultiQuestion && (!survey.questions || !Array.isArray(survey.questions))) {
            survey.questions = [];
        }
        
        console.log(`Survey ${survey.id} after processing:`, {
            isMultiQuestion: survey.isMultiQuestion,
            hasQuestions: !!survey.questions,
            questionsLength: survey.questions ? survey.questions.length : 0,
            hasAnswers: !!survey.answers,
            answersLength: survey.answers ? survey.answers.length : 0
        });
    });
    
    console.log('=== ENSURE VOTES FIELD COMPLETED ===');
}

// Load data from files on startup
function loadDataFromFiles() {
    try {
        console.log('=== LOADING DATA FROM FILES ===');
        // Load surveys
        if (fs.existsSync(SURVEYS_FILE)) {
            console.log('Surveys file exists, loading...');
            const surveysData = fs.readFileSync(SURVEYS_FILE, 'utf8');
            const rawSurveys = JSON.parse(surveysData);
            
            // Convert ISO date strings back to Date objects
            surveys = rawSurveys.map(survey => ({
                ...survey,
                createdAt: new Date(survey.createdAt),
                updatedAt: new Date(survey.updatedAt)
            }));
            console.log('Loaded', surveys.length, 'surveys from file');
            
            // Debug: Log the first few surveys to see their structure
            surveys.slice(0, 3).forEach((survey, index) => {
                console.log(`Survey ${index + 1} loaded:`, {
                    id: survey.id,
                    title: survey.title,
                    isMultiQuestion: survey.isMultiQuestion,
                    hasQuestions: !!survey.questions,
                    questionsLength: survey.questions ? survey.questions.length : 0,
                    hasAnswers: !!survey.answers,
                    answersLength: survey.answers ? survey.answers.length : 0
                });
            });
        } else {
            console.log('Surveys file not found, initializing with demo data...');
            // Initialize with demo data if no file exists
            surveys = [
                {
                    id: 1,
                    title: 'סקר דעת קהל על תחבורה ציבורית',
                    description: 'סקר על שביעות רצון מהתחבורה הציבורית בעיר',
                    category: 'מוניציפאלי',
                    creatorId: 1,
                    creatorName: 'עיריית תל אביב',
                    status: 'active',
                    isPublic: true,
                    requirePhone: false,
                    question: 'איך אתה מעריך את השירות של התחבורה הציבורית?',
                    answers: [
                        { id: 1, text: 'מעולה', votes: 45 },
                        { id: 2, text: 'טוב', votes: 32 },
                        { id: 3, text: 'בסדר', votes: 28 },
                        { id: 4, text: 'לא טוב', votes: 15 },
                        { id: 5, text: 'גרוע', votes: 8 }
                    ],
                    responses: 128,
                    imageUrl: null,
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-15')
                },
                {
                    id: 2,
                    title: 'סקר על שימוש בטכנולוגיה בחינוך',
                    description: 'סקר על השימוש בטכנולוגיה בבתי הספר',
                    category: 'חברתי',
                    creatorId: 2,
                    creatorName: 'משרד החינוך',
                    status: 'active',
                    isPublic: true,
                    requirePhone: false,
                    question: 'איך אתה מעריך את השימוש בטכנולוגיה בבית הספר שלך?',
                    answers: [
                        { id: 1, text: 'מתקדם מאוד', votes: 38 },
                        { id: 2, text: 'מתקדם', votes: 42 },
                        { id: 3, text: 'בסדר', votes: 35 },
                        { id: 4, text: 'פחות מתקדם', votes: 20 },
                        { id: 5, text: 'לא מתקדם', votes: 12 }
                    ],
                    responses: 147,
                    imageUrl: null,
                    createdAt: new Date('2024-01-10'),
                    updatedAt: new Date('2024-01-10')
                },
                {
                    id: 3,
                    title: 'סקר על צריכת מזון בריא',
                    description: 'סקר על הרגלי אכילה ובריאות',
                    category: 'חברתי',
                    creatorId: 3,
                    creatorName: 'משרד הבריאות',
                    status: 'active',
                    isPublic: true,
                    requirePhone: false,
                    question: 'כמה פעמים בשבוע אתה אוכל ירקות ופירות?',
                    answers: [
                        { id: 1, text: 'כל יום', votes: 52 },
                        { id: 2, text: '5-6 פעמים', votes: 41 },
                        { id: 3, text: '3-4 פעמים', votes: 38 },
                        { id: 4, text: '1-2 פעמים', votes: 25 },
                        { id: 5, text: 'לעיתים רחוקות', votes: 18 }
                    ],
                    responses: 174,
                    imageUrl: null,
                    createdAt: new Date('2024-01-05'),
                    updatedAt: new Date('2024-01-05')
                },
                {
                    id: 4,
                    title: 'סקר על עבודה מהבית',
                    description: 'סקר על חוויית העבודה מהבית',
                    category: 'עסקי',
                    creatorId: 4,
                    creatorName: 'חברת הייטק',
                    status: 'active',
                    isPublic: true,
                    requirePhone: false,
                    question: 'איך אתה מעריך את היעילות בעבודה מהבית?',
                    answers: [
                        { id: 1, text: 'גבוהה מאוד', votes: 35 },
                        { id: 2, text: 'גבוהה', votes: 48 },
                        { id: 3, text: 'בינונית', votes: 42 },
                        { id: 4, text: 'נמוכה', votes: 18 },
                        { id: 5, text: 'נמוכה מאוד', votes: 12 }
                    ],
                    responses: 155,
                    imageUrl: null,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                },
                {
                    id: 15,
                    title: 'הימין של הימין - הסקר הגדול במדינה',
                    description: 'סקר על מנהיגות הימין בישראל',
                    category: 'פוליטי',
                    creatorId: 1,
                    creatorName: 'מערכת הסקרים',
                    status: 'active',
                    isPublic: true,
                    requirePhone: true,
                    question: 'מי לדעתך המנהיג המתאים ביותר לימין בישראל?',
                    answers: [
                        { id: 1, text: 'ינון מגל', votes: 0 },
                        { id: 2, text: 'איתמר בן גביר', votes: 0 },
                        { id: 3, text: 'בצלאל סמוטריץ\'', votes: 0 },
                        { id: 4, text: 'עופר וינטר', votes: 0 },
                        { id: 5, text: 'משה פייגלין', votes: 0 },
                        { id: 6, text: 'אליהו יוסיאן', votes: 0 },
                        { id: 7, text: 'יותם זימרי', votes: 0 },
                        { id: 8, text: 'מתלבט', votes: 0 },
                        { id: 9, text: 'אף אחד מהם', votes: 0 }
                    ],
                    imageUrl: '/uploads/niz.png',
                    responses: 31,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                }
            ];
            console.log('PollManager: Initialized with demo surveys');
        }

        // Load responses
        if (fs.existsSync(RESPONSES_FILE)) {
            const responsesData = fs.readFileSync(RESPONSES_FILE, 'utf8');
            const rawResponses = JSON.parse(responsesData);
            
            // Convert ISO date strings back to Date objects
            surveyResponses = rawResponses.map(response => ({
                ...response,
                submittedAt: new Date(response.submittedAt)
            }));
            
            console.log('PollManager: Loaded', surveyResponses.length, 'responses from file');
        } else {
            console.log('PollManager: Responses file not found, starting with empty responses');
        }

        // Ensure all surveys have votes field
        ensureVotesField();
        
        // Calculate next IDs
        if (surveys.length > 0) {
            nextSurveyId = Math.max(...surveys.map(s => s.id)) + 1;
        }
        if (surveyResponses.length > 0) {
            nextResponseId = Math.max(...surveyResponses.map(r => r.id)) + 1;
        }

        console.log('Data loading completed. Surveys:', surveys.length, 'Responses:', surveyResponses.length);
        console.log('Next survey ID will be:', nextSurveyId);
        console.log('Next response ID will be:', nextResponseId);

    } catch (error) {
        console.error('Error loading data from files:', error);
        // Fallback to demo data
        surveys = [];
        surveyResponses = [];
        nextSurveyId = 1;
        nextResponseId = 1;
    }
}

// Save data to files
function saveDataToFiles() {
    try {
        // Convert dates to ISO strings for JSON serialization
        const surveysForSave = surveys.map(survey => ({
            ...survey,
            createdAt: survey.createdAt instanceof Date ? survey.createdAt.toISOString() : survey.createdAt,
            updatedAt: survey.updatedAt instanceof Date ? survey.updatedAt.toISOString() : survey.updatedAt
        }));

        const responsesForSave = surveyResponses.map(response => ({
            ...response,
            submittedAt: response.submittedAt instanceof Date ? response.submittedAt.toISOString() : response.submittedAt
        }));

        // Save surveys
        const surveysData = JSON.stringify(surveysForSave, null, 2);
        fs.writeFileSync(SURVEYS_FILE, surveysData, 'utf8');
        
        // Save responses
        const responsesData = JSON.stringify(responsesForSave, null, 2);
        fs.writeFileSync(RESPONSES_FILE, responsesData, 'utf8');
        

    } catch (error) {
        console.error('Error saving data to files:', error);
    }
}

// Load data on startup
loadDataFromFiles();

class PollManager {
    /**
     * Create a new survey
     * @param {Object} surveyData - Survey data
     * @param {number} creatorId - Creator user ID
     * @returns {Object} - Creation result
     */
    static createSurvey(surveyData, creatorId) {
        try {
            const { title, description, category, backgroundColor, question, questions, answers, thankYouMessage, imageUrl, creatorName, requirePhone, isMultiQuestion, source, externalId } = surveyData;
            
            // Validation for single question surveys
            if (!isMultiQuestion && (!title || !category || !question || !answers || answers.length < 2)) {
                return {
                    success: false,
                    error: 'כל השדות הנדרשים חייבים להיות מלאים עם לפחות 2 תשובות'
                };
            }
            
            // Validation for multi-question surveys
            if (isMultiQuestion && (!title || !category || !questions || !Array.isArray(questions) || questions.length < 1)) {
                return {
                    success: false,
                    error: 'כל השדות הנדרשים חייבים להיות מלאים עם לפחות שאלה אחת'
                };
            }
            
            // Validate each question in multi-question surveys
            if (isMultiQuestion) {
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    if (!q.questionText || !q.answers || !Array.isArray(q.answers) || q.answers.length < 2) {
                        return {
                            success: false,
                            error: `שאלה ${i + 1} חייבת לכלול טקסט שאלה ולפחות 2 תשובות`
                        };
                    }
                }
            }

            // Create new survey
            let newSurvey;
            
            if (isMultiQuestion) {
                // Multi-question survey
                newSurvey = {
                    id: nextSurveyId++,
                    title: (title && typeof title === 'string') ? title.trim() : String(title || ''),
                    description: (description && typeof description === 'string') ? description.trim() : '',
                    category: (category && typeof category === 'string') ? category.trim() : String(category || ''),
                    backgroundColor: (backgroundColor && typeof backgroundColor === 'string') ? backgroundColor.trim() : 'default',
                    creatorId: creatorId,
                    creatorName: creatorName || 'משתמש אנונימי',
                    status: 'active',
                    isPublic: true,
                    isMultiQuestion: true,
                    // Include main question and answers for backward compatibility
                    question: (question && typeof question === 'string') ? question.trim() : String(question || ''),
                    answers: answers ? answers.map((answer, index) => ({
                        id: index + 1,
                        text: (answer && typeof answer === 'string') ? answer.trim() : String(answer || ''),
                        votes: 0
                    })) : [],
                    questions: questions.map((q, qIndex) => ({
                        id: qIndex + 1,
                        questionText: (q.questionText && typeof q.questionText === 'string') ? q.questionText.trim() : String(q.questionText || ''),
                        allowMultiple: q.allowMultiple || false,
                        answers: q.answers.map((answer, aIndex) => ({
                            id: aIndex + 1,
                            text: (answer && typeof answer === 'string') ? answer.trim() : String(answer || ''),
                            votes: 0
                        }))
                    })),
                    thankYouMessage: thankYouMessage || null,
                    imageUrl: imageUrl || null,
                    source: source || null,
                    externalId: externalId || null,
                    requirePhone: requirePhone || false,
                    responses: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            } else {
                // Single question survey (backward compatibility)
                newSurvey = {
                    id: nextSurveyId++,
                    title: (title && typeof title === 'string') ? title.trim() : String(title || ''),
                    description: (description && typeof description === 'string') ? description.trim() : '',
                    category: (category && typeof category === 'string') ? category.trim() : String(category || ''),
                    backgroundColor: (backgroundColor && typeof backgroundColor === 'string') ? backgroundColor.trim() : 'default',
                    creatorId: creatorId,
                    creatorName: creatorName || 'משתמש אנונימי',
                    status: 'active',
                    isPublic: true,
                    isMultiQuestion: false,
                    question: (question && typeof question === 'string') ? question.trim() : String(question || ''),
                    answers: answers.map((answer, index) => ({
                        id: index + 1,
                        text: (answer && typeof answer === 'string') ? answer.trim() : String(answer || ''),
                        votes: 0
                    })),
                    thankYouMessage: thankYouMessage || null,
                    imageUrl: imageUrl || null,
                    source: source || null,
                    externalId: externalId || null,
                    requirePhone: requirePhone || false,
                    responses: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }

            surveys.push(newSurvey);

            // Debug: Log the created survey structure
            console.log('Created survey structure:', {
                id: newSurvey.id,
                title: newSurvey.title,
                isMultiQuestion: newSurvey.isMultiQuestion,
                question: newSurvey.question,
                answers: newSurvey.answers,
                questions: newSurvey.questions ? newSurvey.questions.map(q => ({
                    questionText: q.questionText,
                    answersCount: q.answers ? q.answers.length : 0,
                    firstAnswer: q.answers && q.answers.length > 0 ? q.answers[0] : null
                })) : []
            });

            // Save data to files
            saveDataToFiles();

            return {
                success: true,
                message: 'הסקר נוצר בהצלחה',
                survey: newSurvey
            };

        } catch (error) {
            console.error('Error creating survey:', error);
            return {
                success: false,
                error: 'שגיאה ביצירת הסקר'
            };
        }
    }

    /**
     * Get survey by ID
     * @param {number} surveyId - Survey ID
     * @returns {Object|null} - Survey object or null
     */
    static getSurveyById(surveyId) {
        const survey = surveys.find(s => s.id === surveyId);
        
        if (!survey) {
            return null;
        }
        
        // Count responses for this survey
        const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
        
        // Return consistent survey object with all necessary fields
        const surveyObj = {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            category: survey.category,
            status: survey.status,
            createdAt: survey.createdAt,
            updatedAt: survey.updatedAt,
            responses: responseCount,
            imageUrl: survey.imageUrl, // Add imageUrl field for image display
            requirePhone: survey.requirePhone,
            creatorId: survey.creatorId,
            creatorName: survey.creatorName,
            isPublic: survey.isPublic,
            thankYouMessage: survey.thankYouMessage,
            sharedWith: survey.sharedWith,
            backgroundColor: survey.backgroundColor || 'default'
        };

        // Debug: Log the survey structure before returning
        console.log('Survey loaded from memory:', {
            id: survey.id,
            title: survey.title,
            isMultiQuestion: survey.isMultiQuestion,
            question: survey.question,
            answers: survey.answers,
            questions: survey.questions ? survey.questions.map(q => ({
                questionText: q.questionText,
                answersCount: q.answers ? q.answers.length : 0,
                firstAnswer: q.answers && q.answers.length > 0 ? q.answers[0] : null
            })) : []
        });
        
        // Debug: Log the full questions structure
        if (survey.isMultiQuestion && survey.questions) {
            console.log('Full questions structure:', JSON.stringify(survey.questions, null, 2));
        }
        
        // Handle both single and multi-question surveys
        if (survey.isMultiQuestion) {
            surveyObj.isMultiQuestion = true;
            surveyObj.questions = survey.questions; // Return the FULL questions array, not a summary
            // For multi-question surveys, also include the main question and answers for backward compatibility
            surveyObj.question = survey.question;
            surveyObj.answers = survey.answers;
        } else {
            surveyObj.isMultiQuestion = false;
            surveyObj.question = survey.question;
            surveyObj.answers = survey.answers;
        }
        
        return surveyObj;
    }

    /**
     * Get surveys by creator
     * @param {number} creatorId - Creator user ID
     * @returns {Array} - Array of surveys
     */
    static getSurveysByCreator(creatorId) {
        return surveys.filter(s => s.creatorId === creatorId);
    }

    /**
     * Get all public surveys
     * @returns {Array} - Array of public surveys
     */
    static getPublicSurveys() {
        return surveys
            .filter(s => s.isPublic && s.status === 'active')
            .map(survey => {
                // Count responses for this survey
                const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
                
                return {
                    id: survey.id,
                    title: survey.title,
                    description: survey.description,
                    category: survey.category,
                    status: survey.status,
                    createdAt: survey.createdAt,
                    responses: responseCount,
                    imageUrl: survey.imageUrl, // Add imageUrl field for image display
                    requirePhone: survey.requirePhone,
                    creatorId: survey.creatorId,
                    creatorName: survey.creatorName,
                    isPublic: survey.isPublic,
                    question: survey.question,
                    answers: survey.answers,
                    thankYouMessage: survey.thankYouMessage
                };
            });
    }

    /**
     * Update survey
     * @param {number} surveyId - Survey ID
     * @param {Object} updateData - Data to update
     * @param {number} userId - User ID for authorization
     * @returns {Object} - Update result
     */
    static updateSurvey(surveyId, updateData, userId) {
        const surveyIndex = surveys.findIndex(s => s.id === surveyId);
        if (surveyIndex === -1) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        const survey = surveys[surveyIndex];
        
        // Check if user is creator or has full permissions
        // Convert both to numbers to ensure proper comparison
        const userIdNum = parseInt(userId);
        const creatorIdNum = parseInt(survey.creatorId);
        
        const isCreator = creatorIdNum === userIdNum;
        const hasFullPermission = survey.sharedWith && survey.sharedWith.some(share => 
            parseInt(share.userId) === userIdNum && share.permissions === 'full'
        );

        if (!isCreator && !hasFullPermission) {
            return {
                success: false,
                error: 'אין לך הרשאה לערוך סקר זה'
            };
        }
        
        // Update survey data
        const { title, description, category, backgroundColor, question, answers, thankYouMessage, imageUrl, requirePhone, isMultiQuestion, questions } = updateData;
        
        if (title) survey.title = title;
        if (description !== undefined) survey.description = description;
        if (category) survey.category = category;
        if (backgroundColor !== undefined) {
            console.log(`Updating survey ${surveyId} backgroundColor from '${survey.backgroundColor}' to '${backgroundColor}'`);
            survey.backgroundColor = backgroundColor;
        }
        if (thankYouMessage !== undefined) survey.thankYouMessage = thankYouMessage;
        if (imageUrl !== undefined) survey.imageUrl = imageUrl;
        if (requirePhone !== undefined) survey.requirePhone = requirePhone;
        
        // Handle multi-question surveys
        if (isMultiQuestion && questions && Array.isArray(questions) && questions.length > 0) {
            survey.isMultiQuestion = true;
            survey.question = questions[0].questionText || question || '';
            survey.answers = questions[0].answers || answers || [];
            
            // Update questions array for multi-question surveys
            survey.questions = questions.map((q, qIndex) => ({
                id: qIndex + 1,
                questionText: q.questionText || '',
                answers: q.answers || [],
                allowMultiple: q.allowMultiple || false
            }));
        } else if (isMultiQuestion && answers && Array.isArray(answers)) {
            // Fallback: create single question from answers
            survey.isMultiQuestion = true;
            survey.question = question || '';
            survey.answers = answers.map((answer, index) => ({
                id: index + 1,
                text: answer,
                votes: 0
            }));
            
            // Update questions array for multi-question surveys
            survey.questions = [{
                id: 1,
                questionText: question || '',
                answers: survey.answers
            }];
        } else if (answers && Array.isArray(answers)) {
            // Single question survey
            survey.isMultiQuestion = false;
            survey.question = question || '';
            survey.answers = answers.map((answer, index) => ({
                id: index + 1,
                text: answer,
                votes: 0
            }));
            
            // Clear questions array for single question surveys
            survey.questions = [];
        }
        
        survey.updatedAt = new Date();
        
        // Save data to files
        saveDataToFiles();
        
        return {
            success: true,
            message: 'הסקר עודכן בהצלחה',
            survey: survey
        };
    }

    /**
     * Update survey as admin (bypasses creator permission check)
     * @param {number} surveyId - Survey ID
     * @param {Object} updateData - Data to update
     * @param {string} userRole - User role for authorization
     * @returns {Object} - Update result
     */
    static updateSurveyAsAdmin(surveyId, updateData, userRole) {
        // Only allow superadmin and admin roles
        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return {
                success: false,
                error: 'אין לך הרשאה לבצע פעולה זו'
            };
        }

        const surveyIndex = surveys.findIndex(s => s.id === surveyId);
        if (surveyIndex === -1) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        const survey = surveys[surveyIndex];
        
        // Update allowed fields
        const allowedFields = ['title', 'description', 'category', 'question', 'isPublic', 'requirePhone', 'status'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                survey[field] = updateData[field];
            }
        });
        
        // Handle answers separately to maintain proper structure
        if (updateData.answers !== undefined) {
            // Store existing answers to preserve votes
            const existingAnswers = survey.answers || [];
            
            // Convert answers to proper format with id, text, and votes
            survey.answers = updateData.answers.map((answerText, index) => {
                // Try to find existing answer by text to preserve votes
                const existingAnswer = existingAnswers.find(a => a.text === answerText);
                return {
                    id: index + 1,
                    text: answerText,
                    votes: existingAnswer ? existingAnswer.votes : 0
                };
            });
        }

        survey.updatedAt = new Date();
        survey.updatedBy = userRole; // Track who updated it

        // Save data to files
        saveDataToFiles();

        return {
            success: true,
            message: 'הסקר עודכן בהצלחה על ידי מנהל',
            survey
        };
    }

    /**
     * Update survey status as admin (bypasses creator permission check)
     * @param {number} surveyId - Survey ID
     * @param {string} newStatus - New status
     * @param {string} userRole - User role for authorization
     * @returns {Object} - Update result
     */
    static updateSurveyStatusAsAdmin(surveyId, newStatus, userRole) {
        // Only allow superadmin and admin roles
        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return {
                success: false,
                error: 'אין לך הרשאה לבצע פעולה זו'
            };
        }

        const surveyIndex = surveys.findIndex(s => s.id === surveyId);
        if (surveyIndex === -1) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        const survey = surveys[surveyIndex];
        
        // Update status
        survey.status = newStatus;
        survey.updatedAt = new Date();
        survey.updatedBy = userRole; // Track who updated it

        // Save data to files
        saveDataToFiles();

        return {
            success: true,
            message: `סטטוס הסקר שונה ל-${newStatus} על ידי מנהל`,
            survey
        };
    }

    /**
     * Delete survey
     * @param {number} surveyId - Survey ID
     * @param {number} userId - User ID for authorization
     * @returns {Object} - Delete result
     */
    static deleteSurvey(surveyId, userId) {
        const surveyIndex = surveys.findIndex(s => s.id === surveyId);
        if (surveyIndex === -1) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        const survey = surveys[surveyIndex];
        
        // Check if user is creator or has full permissions
        // Convert both to numbers to ensure proper comparison
        const userIdNum = parseInt(userId);
        const creatorIdNum = parseInt(survey.creatorId);
        
        const isCreator = creatorIdNum === userIdNum;
        const hasFullPermission = survey.sharedWith && survey.sharedWith.some(share => 
            parseInt(share.userId) === userIdNum && share.permissions === 'full'
        );

        if (!isCreator && !hasFullPermission) {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק סקר זה'
            };
        }

        // Remove survey responses
        surveyResponses = surveyResponses.filter(r => r.surveyId !== surveyId);

        // Remove survey
        surveys.splice(surveyIndex, 1);

        // Save data to files
        saveDataToFiles();
        
        // Reload data from files to ensure consistency
        loadDataFromFiles();

        return {
            success: true,
            message: 'הסקר נמחק בהצלחה'
        };
    }

    /**
     * Submit survey response
     * @param {number} surveyId - Survey ID
     * @param {string|Array} answer - Selected answer(s) - can be single answer or array of answers for multi-question surveys
     * @param {number|null} userId - User ID (null for anonymous)
     * @param {string|null} surveyUrl - Full survey URL
     * @returns {Object} - Submission result
     */
    static submitSurveyResponse(surveyId, answer, userId = null, surveyUrl = null) {
        try {
            const survey = surveys.find(s => s.id === surveyId);
            if (!survey) {
                return {
                    success: false,
                    error: 'סקר לא נמצא'
                };
            }

            if (survey.status !== 'active') {
                return {
                    success: false,
                    error: 'הסקר לא פעיל כרגע'
                };
            }

            // Check if user already responded (for non-anonymous surveys)
            if (userId && surveyResponses.find(r => r.surveyId === surveyId && r.userId === userId)) {
                return {
                    success: false,
                    error: 'כבר השבת על סקר זה'
                };
            }

            let response;
            let logMessage;

            if (survey.isMultiQuestion) {
                // Multi-question survey
                if (!Array.isArray(answer) || answer.length !== survey.questions.length) {
                    return {
                        success: false,
                        error: 'יש לענות על כל השאלות בסקר'
                    };
                }

                // Validate all answers
                for (let i = 0; i < answer.length; i++) {
                    const question = survey.questions[i];
                    const answerText = answer[i];
                    
                    // Handle multiple answers (separated by |||)
                    const answerTexts = answerText.includes('|||') ? answerText.split('|||').map(a => a.trim()) : [answerText];
                    
                    // Validate each answer text
                    for (const singleAnswerText of answerTexts) {
                        const validAnswer = question.answers.find(a => {
                            if (typeof a === 'string') {
                                return a === singleAnswerText;
                            } else if (a.text) {
                                return a.text === singleAnswerText;
                            }
                            return false;
                        });
                        
                        if (!validAnswer) {
                            return {
                                success: false,
                                error: `תשובה לא תקינה לשאלה ${i + 1}: ${singleAnswerText}`
                            };
                        }
                    }
                }

                // Create response with all answers
                response = {
                    id: nextResponseId++,
                    surveyId,
                    userId,
                    surveyUrl: surveyUrl || null,
                    answers: answer.map((answerText, index) => ({
                        questionId: index + 1,
                        answer: answerText
                    })),
                    submittedAt: new Date()
                };

                surveyResponses.push(response);

                // Update votes for all answers
                for (let i = 0; i < answer.length; i++) {
                    const question = survey.questions[i];
                    const answerText = answer[i];
                    
                    // Handle multiple answers (separated by |||)
                    const answerTexts = answerText.includes('|||') ? answerText.split('|||').map(a => a.trim()) : [answerText];
                    
                    // Update votes for each selected answer
                    for (const singleAnswerText of answerTexts) {
                        const answerObj = question.answers.find(a => a.text === singleAnswerText);
                        if (answerObj) {
                            if (typeof answerObj.votes !== 'number') {
                                answerObj.votes = 0;
                            }
                            answerObj.votes++;
                        }
                    }
                }

                logMessage = `נרשם ${response.id}: ענה על ${answer.length} שאלות בסקר ${surveyId}`;

            } else {
                // Single question survey (backward compatibility)
                // Handle multiple answers (separated by |||)
                const answerTexts = typeof answer === 'string' && answer.includes('|||') 
                    ? answer.split('|||').map(a => a.trim()) 
                    : [answer];
                
                // Validate each answer text
                for (const singleAnswerText of answerTexts) {
                    const validAnswer = survey.answers.find(a => {
                        if (typeof a === 'string') {
                            return a === singleAnswerText;
                        } else if (a.text) {
                            return a.text === singleAnswerText;
                        }
                        return false;
                    });
                    
                    if (!validAnswer) {
                        return {
                            success: false,
                            error: `תשובה לא תקינה: ${singleAnswerText}`
                        };
                    }
                }

                // Create response with survey URL
                response = {
                    id: nextResponseId++,
                    surveyId,
                    userId,
                    surveyUrl: surveyUrl || null, // Save the full survey URL
                    answers: [{
                        questionId: 1,
                        answer: answer
                    }],
                    submittedAt: new Date()
                };

                surveyResponses.push(response);

                // Update votes for each selected answer
                for (const singleAnswerText of answerTexts) {
                    const answerObj = survey.answers.find(a => {
                        if (typeof a === 'string') {
                            return a === singleAnswerText;
                        } else if (a.text) {
                            return a.text === singleAnswerText;
                        }
                        return false;
                    });
                    
                    if (answerObj) {
                        if (typeof answerObj.votes !== 'number') {
                            answerObj.votes = 0;
                        }
                        answerObj.votes++;
                    }
                }

                logMessage = `נרשם ${response.id}: הצביע עבור "${answer}" בסקר ${surveyId}`;
            }

            // Update survey total responses count
            if (typeof survey.responses !== 'number') {
                survey.responses = 0;
            }
            survey.responses++;

            // Save data to files
            saveDataToFiles();

            // Log entry for each registrant
            const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
            const fullSurveyUrl = surveyUrl || `http://localhost:7766/survey/${surveyId}`;
            console.log(`[${timestamp}] ${logMessage} - ${fullSurveyUrl}`);

            return {
                success: true,
                message: 'התשובה נשלחה בהצלחה',
                responseId: response.id
            };

        } catch (error) {
            console.error('Error submitting survey response:', error);
            return {
                success: false,
                error: 'שגיאה בשליחת התשובה'
            };
        }
    }

    /**
     * Get survey responses
     * @param {number} surveyId - Survey ID
     * @param {number} userId - User ID for authorization
     * @returns {Object} - Responses result
     */
    static getSurveyResponses(surveyId, userId) {
        const survey = surveys.find(s => s.id === surveyId);
        if (!survey) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        // Check if user is creator or has view permissions
        // Convert both to numbers to ensure proper comparison
        const userIdNum = parseInt(userId);
        const creatorIdNum = parseInt(survey.creatorId);
        
        const isCreator = creatorIdNum === userIdNum;
        const hasViewPermission = survey.sharedWith && survey.sharedWith.some(share => 
            parseInt(share.userId) === userIdNum && (share.permissions === 'view' || share.permissions === 'export' || share.permissions === 'full')
        );

        if (!isCreator && !hasViewPermission) {
            return {
                success: false,
                error: 'אין לך הרשאה לצפות בתשובות לסקר זה'
            };
        }

        const responses = surveyResponses.filter(r => r.surveyId === surveyId);

        return {
            success: true,
            responses,
            total: responses.length
        };
    }

    /**
     * Get survey responses publicly (for dashboard - no auth check)
     * @param {number} surveyId - Survey ID
     * @returns {Array} - Array of responses
     */
    static getSurveyResponsesPublic(surveyId) {
        const responses = surveyResponses.filter(r => r.surveyId === surveyId);
        return responses;
    }

    /**
     * Get survey statistics
     * @param {number} surveyId - Survey ID
     * @param {number} userId - User ID for authorization
     * @returns {Object} - Statistics result
     */
    static getSurveyStats(surveyId, userId) {
        const survey = surveys.find(s => s.id === surveyId);
        if (!survey) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        // Check if user is creator or has view permissions
        // Convert both to numbers to ensure proper comparison
        const userIdNum = parseInt(userId);
        const creatorIdNum = parseInt(survey.creatorId);
        
        const isCreator = creatorIdNum === userIdNum;
        const hasViewPermission = survey.sharedWith && survey.sharedWith.some(share => 
            parseInt(share.userId) === userIdNum && (share.permissions === 'view' || share.permissions === 'export' || share.permissions === 'full')
        );

        if (!isCreator && !hasViewPermission) {
            return {
                success: false,
                error: 'אין לך הרשאה לצפות בסטטיסטיקות של סקר זה'
            };
        }

        const responses = surveyResponses.filter(r => r.surveyId === surveyId);
        const stats = {
            totalResponses: responses.length,
            completionRate: 0,
            answerStats: []
        };

        // Calculate completion rate
        if (responses.length > 0) {
            stats.completionRate = 100; // All responses are complete in this structure
        }

        // Calculate answer statistics
        if (survey.isMultiQuestion) {
            // Multi-question survey stats
            survey.questions.forEach(question => {
                const questionStats = {
                    questionId: question.id,
                    questionText: question.questionText,
                    answerStats: []
                };
                
                question.answers.forEach(answer => {
                    const answerResponses = responses.filter(r => 
                        r.answers.some(a => a.questionId === question.id && a.answer === answer.text)
                    ).length;

                    questionStats.answerStats.push({
                        answerId: answer.id,
                        answerText: answer.text,
                        responseCount: answerResponses,
                        percentage: responses.length > 0 ? Math.round((answerResponses / responses.length) * 100) : 0
                    });
                });
                
                stats.answerStats.push(questionStats);
            });
        } else {
            // Single question survey stats (backward compatibility)
            survey.answers.forEach(answer => {
                const answerResponses = responses.filter(r => 
                    r.answers.some(a => a.answer === answer.text)
                ).length;

                stats.answerStats.push({
                    answerId: answer.id,
                    answerText: answer.text,
                    responseCount: answerResponses,
                    percentage: responses.length > 0 ? Math.round((answerResponses / responses.length) * 100) : 0
                });
            });
        }

        return {
            success: true,
            stats
        };
    }

    /**
     * Export survey data to Excel
     * @param {number} surveyId - Survey ID
     * @param {number} userId - User ID for authorization
     * @returns {Object} - Export result
     */
    static exportSurveyData(surveyId, userId) {
        const survey = surveys.find(s => s.id === surveyId);
        if (!survey) {
            return {
                success: false,
                error: 'סקר לא נמצא'
            };
        }

        // Check if user is creator or has export permissions
        // Convert both to numbers to ensure proper comparison
        const userIdNum = parseInt(userId);
        const creatorIdNum = parseInt(survey.creatorId);
        
        const isCreator = creatorIdNum === userIdNum;
        const hasExportPermission = survey.sharedWith && survey.sharedWith.some(share => 
            parseInt(share.userId) === userIdNum && (share.permissions === 'export' || share.permissions === 'full')
        );

        if (!isCreator && !hasExportPermission) {
            return {
                success: false,
                error: 'אין לך הרשאה לייצא נתונים של סקר זה'
            };
        }

        const responses = surveyResponses.filter(r => r.surveyId === surveyId);

        // Prepare data for export
        let exportData;
        
        if (survey.isMultiQuestion) {
            // Multi-question survey export
            exportData = {
                surveyInfo: {
                    title: survey.title,
                    description: survey.description,
                    category: survey.category,
                    isMultiQuestion: true,
                    totalQuestions: survey.questions.length,
                    requirePhone: survey.requirePhone || false,
                    totalResponses: responses.length,
                    exportDate: new Date().toISOString()
                },
                questions: survey.questions.map(question => ({
                    questionId: question.id,
                    questionText: question.questionText,
                    answers: question.answers.map(answer => ({
                        answerId: answer.id,
                        answerText: answer.text,
                        votes: answer.votes,
                        percentage: responses.length > 0 ? Math.round((answer.votes / responses.length) * 100) : 0
                    }))
                })),
                responses: responses.map(r => ({
                    responseId: r.id,
                    userId: r.userId,
                    answers: r.answers.map(a => ({
                        questionId: a.questionId,
                        answer: a.answer
                    })),
                    submittedAt: r.submittedAt,
                    sourceUrl: r.surveyUrl || `https://sekerapp.online/survey/${surveyId}`,
                    surveyUrl: r.surveyUrl || `https://sekerapp.online/survey/${surveyId}`
                }))
            };
        } else {
            // Single question survey export (backward compatibility)
            exportData = {
                surveyInfo: {
                    title: survey.title,
                    description: survey.description,
                    category: survey.category,
                    question: survey.question,
                    isMultiQuestion: false,
                    requirePhone: survey.requirePhone || false,
                    totalResponses: responses.length,
                    exportDate: new Date().toISOString()
                },
                answers: survey.answers.map(answer => ({
                    answerId: answer.id,
                    answerText: answer.text,
                    votes: answer.votes,
                    percentage: responses.length > 0 ? Math.round((answer.votes / responses.length) * 100) : 0
                })),
                responses: responses.map(r => ({
                    responseId: r.id,
                    userId: r.userId,
                    answer: r.answers[0]?.answer || 'לא ידוע',
                    submittedAt: r.submittedAt,
                    sourceUrl: r.surveyUrl || `https://sekerapp.online/survey/${surveyId}`,
                    surveyUrl: r.surveyUrl || `https://sekerapp.online/survey/${surveyId}`
                }))
            };
        }

        return {
            success: true,
            message: 'הנתונים מוכנים לייצוא',
            data: exportData
        };
    }

    /**
     * Share survey data with another user
     * @param {number} surveyId - Survey ID
     * @param {number} ownerId - Survey owner ID
     * @param {string} email - Email of user to share with
     * @param {string} permissions - Permission level (view, export, full)
     * @returns {Object} - Sharing result
     */
    static shareSurveyData(surveyId, ownerId, email, permissions = 'view') {
        try {
            const survey = surveys.find(s => s.id === surveyId);
            if (!survey) {
                return {
                    success: false,
                    error: 'סקר לא נמצא'
                };
            }

            // Convert both to numbers to ensure proper comparison
            const ownerIdNum = parseInt(ownerId);
            const creatorIdNum = parseInt(survey.creatorId);
            
            if (creatorIdNum !== ownerIdNum) {
                return {
                    success: false,
                    error: 'אין לך הרשאה לשתף נתונים של סקר זה'
                };
            }

            // Find user by email
            const targetUser = UserManager.getUserByEmail(email);
            if (!targetUser) {
                return {
                    success: false,
                    error: 'משתמש לא נמצא במערכת'
                };
            }

            if (parseInt(targetUser.id) === ownerIdNum) {
                return {
                    success: false,
                    error: 'לא ניתן לשתף נתונים עם עצמך'
                };
            }

            // Initialize sharedSurveys array if it doesn't exist
            if (!survey.sharedWith) {
                survey.sharedWith = [];
            }

            // Check if already shared
            const existingShare = survey.sharedWith.find(share => share.userId === targetUser.id);
            if (existingShare) {
                // Update existing permissions
                existingShare.permissions = permissions;
                existingShare.sharedAt = new Date().toISOString();
            } else {
                // Add new share
                survey.sharedWith.push({
                    userId: targetUser.id,
                    email: targetUser.email,
                    permissions: permissions,
                    sharedAt: new Date().toISOString()
                });
            }

            // Save to file
            saveDataToFiles();

            return {
                success: true,
                message: `הנתונים שותפו בהצלחה עם ${targetUser.email}`,
                sharedWith: survey.sharedWith
            };
        } catch (error) {
            console.error('Error sharing survey data:', error);
            return {
                success: false,
                error: 'שגיאה בשיתוף הנתונים'
            };
        }
    }

    /**
     * Get all surveys (admin only)
     * @param {string} role - User role for authorization
     * @returns {Object} - Surveys list result
     */
    static getAllSurveys(role) {
        if (role !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לצפות ברשימת כל הסקרים'
            };
        }

        // Enhance surveys with response counts and creator names
        const enhancedSurveys = surveys.map(survey => {
            const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
            
            // Try to get creator name from UserManager if available
            let creatorName = survey.creatorName || 'לא ידוע';
            try {
                if (survey.creatorId) {
                    const creator = UserManager.getUserById(survey.creatorId);
                    if (creator) {
                        creatorName = creator.fullName || creator.username || creatorName;
                    }
                }
            } catch (error) {
    
            }
            
            return {
                ...survey,
                responseCount,
                creatorName
            };
        });

        return {
            success: true,
            surveys: enhancedSurveys,
            total: enhancedSurveys.length
        };
    }

    /**
     * Get surveys shared with a specific user
     * @param {number} userId - User ID
     * @returns {Object} - Shared surveys result
     */
    static getSharedSurveys(userId) {
        try {
            // Convert userId to number for proper comparison
            const userIdNum = parseInt(userId);
            
            const sharedSurveys = surveys.filter(s => 
                s.sharedWith && s.sharedWith.some(share => parseInt(share.userId) === userIdNum)
            ).map(survey => {
                const share = survey.sharedWith.find(s => parseInt(s.userId) === userIdNum);
                return {
                    ...survey,
                    sharedPermissions: share.permissions,
                    sharedAt: share.sharedAt,
                    isShared: true
                };
            });
            
            return {
                success: true,
                surveys: sharedSurveys,
                total: sharedSurveys.length
            };
        } catch (error) {
            console.error('Error getting shared surveys:', error);
            return {
                success: false,
                error: 'שגיאה בטעינת הסקרים המשותפים'
            };
        }
    }

    /**
     * Get user's own surveys
     * @param {number} userId - User ID
     * @returns {Object} - User surveys result
     */
    static getMySurveys(userId) {
        try {
            // Convert userId to number for proper comparison
            const userIdNum = parseInt(userId);
            
            // Get surveys created by user
            const userSurveys = surveys.filter(s => parseInt(s.creatorId) === userIdNum);
            
            // Get surveys shared with user
            const sharedSurveys = surveys.filter(s => 
                s.sharedWith && s.sharedWith.some(share => parseInt(share.userId) === userIdNum)
            ).map(survey => {
                const share = survey.sharedWith.find(s => parseInt(s.userId) === userIdNum);
                return {
                    ...survey,
                    sharedPermissions: share.permissions,
                    sharedAt: share.sharedAt,
                    isShared: true,
                    originalCreator: survey.creatorId
                };
            });
            
            // Combine both lists, removing duplicates
            const allSurveys = [...userSurveys, ...sharedSurveys];
            
            // Ensure all surveys have consistent structure with imageUrl field
            const processedSurveys = allSurveys.map(survey => {
                // Count responses for this survey
                const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
                
                // Create survey object with all necessary fields
                const surveyObj = {
                    id: survey.id,
                    title: survey.title,
                    description: survey.description,
                    category: survey.category,
                    status: survey.status,
                    createdAt: survey.createdAt,
                    updatedAt: survey.updatedAt,
                    responses: responseCount,
                    imageUrl: survey.imageUrl, // Ensure imageUrl field is present
                    requirePhone: survey.requirePhone,
                    creatorId: survey.creatorId,
                    creatorName: survey.creatorName,
                    isPublic: survey.isPublic,
                    question: survey.question,
                    answers: survey.answers,
                    isMultiQuestion: survey.isMultiQuestion,
                    questions: survey.questions,
                    thankYouMessage: survey.thankYouMessage,
                    sharedWith: survey.sharedWith,
                    // Keep shared survey specific fields
                    ...(survey.isShared && {
                        sharedPermissions: survey.sharedPermissions,
                        sharedAt: survey.sharedAt,
                        isShared: survey.isShared,
                        originalCreator: survey.originalCreator
                    })
                };
                
                // Debug: Log the survey structure before returning
                console.log('Survey processed in getMySurveys:', {
                    id: surveyObj.id,
                    title: surveyObj.title,
                    isMultiQuestion: surveyObj.isMultiQuestion,
                    hasQuestions: !!surveyObj.questions,
                    questionsLength: surveyObj.questions ? surveyObj.questions.length : 0,
                    hasAnswers: !!surveyObj.answers,
                    answersLength: surveyObj.answers ? surveyObj.answers.length : 0,
                    responses: surveyObj.responses
                });
                
                // Debug: Log the full questions structure if it exists
                if (surveyObj.isMultiQuestion && surveyObj.questions) {
                    console.log(`Full questions structure for survey ${surveyObj.id}:`, JSON.stringify(surveyObj.questions, null, 2));
                }
                
                return surveyObj;
            });
            
            return {
                success: true,
                surveys: processedSurveys,
                total: processedSurveys.length,
                createdCount: userSurveys.length,
                sharedCount: sharedSurveys.length
            };
        } catch (error) {
            console.error('Error getting user surveys:', error);
            return {
                success: false,
                error: 'שגיאה בטעינת הסקרים שלך'
            };
        }
    }

    /**
     * Get user-specific survey statistics
     * @param {number} userId - User ID
     * @returns {Object} - User statistics result
     */
    static getUserStats(userId) {
        try {
            // Convert userId to number for proper comparison
            const userIdNum = parseInt(userId);
            
            const userSurveys = surveys.filter(s => parseInt(s.creatorId) === userIdNum);
            const userResponses = surveyResponses.filter(r => 
                userSurveys.some(s => s.id === r.surveyId)
            );
            
            const totalSurveys = userSurveys.length;
            const activeSurveys = userSurveys.filter(s => s.status === 'active').length;
            const totalResponses = userResponses.length;
            const surveysThisMonth = userSurveys.filter(s => {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return s.createdAt > monthAgo;
            }).length;

            return {
                success: true,
                stats: {
                    totalSurveys,
                    activeSurveys,
                    totalResponses,
                    surveysThisMonth,
                    averageResponsesPerSurvey: totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0
                }
            };
        } catch (error) {
            console.error('Error getting user statistics:', error);
            return {
                success: false,
                error: 'שגיאה בטעינת הסטטיסטיקות שלך'
            };
        }
    }

    /**
     * Get survey statistics overview
     * @returns {Object} - Overview statistics
     */
    static getSurveyOverview() {
        const totalSurveys = surveys.length;
        const activeSurveys = surveys.filter(s => s.status === 'active').length;
        const totalResponses = surveyResponses.length;
        const surveysThisMonth = surveys.filter(s => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return s.createdAt > monthAgo;
        }).length;

        return {
            totalSurveys,
            activeSurveys,
            totalResponses,
            surveysThisMonth,
            averageResponsesPerSurvey: totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0
        };
    }

    /**
     * Get recent surveys for public display
     * @returns {Object} - Recent surveys result
     */
    static getRecentSurveys() {
        try {
            // Reload data from files to ensure we have the latest data
            loadDataFromFiles();
            
            // Get the 6 most recent surveys
            const recentSurveys = surveys
                .filter(s => s.status === 'active') // Only active surveys
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by creation date
                .slice(0, 6) // Get top 6
                .map(survey => {
                    // Count responses for this survey
                    const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
                    
                    return {
                        id: survey.id,
                        title: survey.title,
                        description: survey.description,
                        category: survey.category,
                        status: survey.status,
                        createdAt: survey.createdAt,
                        responses: responseCount,
                        imageUrl: survey.imageUrl // Add imageUrl field for image display
                    };
                });

            return {
                success: true,
                surveys: recentSurveys,
                total: recentSurveys.length
            };
        } catch (error) {
            console.error('Error getting recent surveys:', error);
            return {
                success: false,
                error: 'שגיאה בטעינת הסקרים האחרונים'
            };
        }
    }

    /**
     * Delete survey (admin only)
     * @param {number} surveyId - Survey ID to delete
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Delete result
     */
    static deleteSurvey(surveyId, adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק סקרים'
            };
        }

        try {
            const surveyIndex = surveys.findIndex(s => s.id === surveyId);
            if (surveyIndex === -1) {
                return {
                    success: false,
                    error: 'הסקר לא נמצא'
                };
            }

            // Remove survey
            surveys.splice(surveyIndex, 1);
            
            // Remove all responses for this survey
            const responsesToRemove = surveyResponses.filter(r => r.surveyId === surveyId);
            responsesToRemove.forEach(response => {
                const responseIndex = surveyResponses.findIndex(r => r.id === response.id);
                if (responseIndex !== -1) {
                    surveyResponses.splice(responseIndex, 1);
                }
            });

            // Save updated data to files
            saveDataToFiles();
            
            // Reload data from files to ensure consistency
            loadDataFromFiles();

            return {
                success: true,
                message: 'הסקר נמחק בהצלחה',
                deletedSurveyId: surveyId,
                deletedResponsesCount: responsesToRemove.length
            };
        } catch (error) {
            console.error('Error deleting survey:', error);
            return {
                success: false,
                error: 'שגיאה במחיקת הסקר'
            };
        }
    }

    /**
     * Delete all surveys (admin only)
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Bulk delete result
     */
    static deleteAllSurveys(adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק סקרים'
            };
        }

        try {
            const totalSurveys = surveys.length;
            const totalResponses = surveyResponses.length;
            
            // Clear all surveys and responses
            surveys.length = 0;
            surveyResponses.length = 0;
            
            // Save updated data to files
            saveDataToFiles();
            
            // Reload data from files to ensure consistency
            loadDataFromFiles();

            return {
                success: true,
                message: 'כל הסקרים נמחקו בהצלחה',
                deletedSurveysCount: totalSurveys,
                deletedResponsesCount: totalResponses
            };
        } catch (error) {
            console.error('Error deleting all surveys:', error);
            return {
                success: false,
                error: 'שגיאה במחיקת כל הסקרים'
            };
        }
    }

    /**
     * Reset entire system (admin only)
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Reset result
     */
    static resetEntireSystem(adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לאפס את המערכת'
            };
        }

        try {
            const totalSurveys = surveys.length;
            const totalResponses = surveyResponses.length;
            
            // Clear all data
            surveys.length = 0;
            surveyResponses.length = 0;
            
            // Save updated data to files
            saveDataToFiles();
            
            // Reload data from files to ensure consistency
            loadDataFromFiles();

            return {
                success: true,
                message: 'המערכת אופסה בהצלחה',
                resetSurveysCount: totalSurveys,
                resetResponsesCount: totalResponses
            };
        } catch (error) {
            console.error('Error resetting system:', error);
            return {
                success: false,
                error: 'שגיאה באיפוס המערכת'
            };
        }
    }

    /**
     * Get all survey responses (admin only)
     * @param {string} role - User role for authorization
     * @returns {Object} - Responses list result
     */
    static getAllResponses(role) {
        if (role !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לצפות בתשובות'
            };
        }

        return {
            success: true,
            responses: surveyResponses,
            total: surveyResponses.length
        };
    }

    /**
     * Clear all survey responses (admin only)
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Clear result
     */
    static clearAllResponses(adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לאפס תשובות'
            };
        }

        try {
            const totalResponses = surveyResponses.length;
            
            // Clear all responses
            surveyResponses.length = 0;
            
            // Save updated data to files
            saveDataToFiles();

            return {
                success: true,
                message: 'כל התשובות אופסו בהצלחה',
                clearedResponsesCount: totalResponses
            };
        } catch (error) {
            console.error('Error clearing responses:', error);
            return {
                success: false,
                error: 'שגיאה באיפוס התשובות'
            };
        }
    }

    /**
     * Delete individual response (admin only)
     * @param {number} responseId - Response ID to delete
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Delete result
     */
    static deleteResponse(responseId, adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה למחוק תשובות'
            };
        }

        try {
            const responseIndex = surveyResponses.findIndex(r => r.id === responseId);
            if (responseIndex === -1) {
                return {
                    success: false,
                    error: 'התשובה לא נמצאה'
                };
            }

            // Remove response
            surveyResponses.splice(responseIndex, 1);
            
            // Save updated data to files
            saveDataToFiles();

            return {
                success: true,
                message: 'התשובה נמחקה בהצלחה',
                deletedResponseId: responseId
            };
        } catch (error) {
            console.error('Error deleting response:', error);
            return {
                success: false,
                error: 'שגיאה במחיקת התשובה'
            };
        }
    }

    /**
     * Toggle survey status (active/inactive) - admin only
     * @param {number} surveyId - Survey ID to toggle
     * @param {string} adminRole - Admin role for authorization
     * @returns {Object} - Toggle result
     */
    static toggleSurveyStatus(surveyId, adminRole) {
        if (adminRole !== 'superadmin') {
            return {
                success: false,
                error: 'אין לך הרשאה לשנות סטטוס סקרים'
            };
        }

        try {
            const survey = surveys.find(s => s.id === surveyId);
            if (!survey) {
                return {
                    success: false,
                    error: 'הסקר לא נמצא'
                };
            }

            // Toggle status
            survey.status = survey.status === 'active' ? 'inactive' : 'active';
            
            // Save updated data to files
            saveDataToFiles();

            return {
                success: true,
                message: `הסקר "${survey.title}" ${survey.status === 'active' ? 'הופעל' : 'הושבת'} בהצלחה`,
                surveyId: surveyId,
                newStatus: survey.status
            };
        } catch (error) {
            console.error('Error toggling survey status:', error);
            return {
                success: false,
                error: 'שגיאה בשינוי סטטוס הסקר'
            };
        }
    }
}

// Export PollManager as default for backward compatibility
module.exports = PollManager;

// Load data from files on module initialization
loadDataFromFiles();
