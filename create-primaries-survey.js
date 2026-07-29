const PollManager = require('./polls');
const UserManager = require('./users');

// Get admin user (creatorId = 1)
const adminUser = UserManager.getUserById(1);

if (!adminUser) {
    console.error('Admin user not found!');
    process.exit(1);
}

// Question text
const question = 'במי את/ה מתכוון לבחור בפריימריז הקרוב?';

// Answers (43 candidates)
const answers = [
    'יריב לוין',
    'אלי כהן',
    'יואב גלנט',
    'דודי אמסלם',
    'אמיר אוחנה',
    'יואב קיש',
    'ניר ברקת',
    'מירי רגב',
    'מיקי זוהר',
    'אבי דיכטר',
    'ישראל כ״ץ',
    'שלמה קרעי',
    'עמיחי שיקלי',
    'עידית סילמן',
    'דוד ביטן',
    'יולי אדלשטיין',
    'אליהו רביבו',
    'גלית דיסטל אטבריאן',
    'ניסים ואטורי',
    'שלום דנינו',
    'רון דרמר',
    'חיים כץ',
    'טלי גוטליב',
    'חנוך מילביצקי',
    'בועז ביסמוט',
    'משה סעדה',
    'אלי דלל',
    'גילה גמליאל',
    'אופיר כץ',
    'מאי גולן',
    'דן אילוז',
    'גדעון סער',
    'זאב אלקין',
    'אריאל קלנר',
    'אתי עטיה',
    'עמית הלוי',
    'צגה מלקו',
    'אושר שקלים',
    'קטי שטרית',
    'מושיקו פסל',
    'ששון גואטה',
    'אביחי בוארון',
    'עפיף עבד'
];

// Survey data
const surveyData = {
    title: 'סקר פריימריז',
    description: 'סקר על בחירת מועמדים בפריימריז הקרוב',
    category: 'פוליטי',
    backgroundColor: 'default',
    isMultiQuestion: false,
    question: question,
    answers: answers,
    thankYouMessage: 'תודה על השתתפותך בסקר!',
    requirePhone: true,
    creatorName: adminUser.fullName || adminUser.username
};

// Create survey
console.log('Creating primaries survey...');
console.log('Question:', question);
console.log('Number of answers:', answers.length);
console.log('Creator:', adminUser.fullName || adminUser.username);

const result = PollManager.createSurvey(surveyData, 1);

if (result.success) {
    console.log('\n✅ Survey created successfully!');
    console.log('Survey ID:', result.survey.id);
    console.log('Survey Title:', result.survey.title);
    console.log('Survey URL: https://sekerapp.online/survey/' + result.survey.id);
} else {
    console.error('\n❌ Failed to create survey:');
    console.error(result.error);
    process.exit(1);
}

