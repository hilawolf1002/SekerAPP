# תיעוד מלא של פרויקט SurveyPro (Pseker)

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [מבנה הפרויקט](#מבנה-הפרויקט)
3. [קבצי תצורה](#קבצי-תצורה)
4. [קבצי שרת](#קבצי-שרת)
5. [מודולי ניהול](#מודולי-ניהול)
6. [נתיבים (Routes)](#נתיבים-routes)
7. [שירותים (Services)](#שירותים-services)
8. [כלי עזר (Utils)](#כלי-עזר-utils)
9. [קבצי HTML](#קבצי-html)
10. [קבצי סקריפטים](#קבצי-סקריפטים)
11. [קבצי תצורה נוספים](#קבצי-תצורה-נוספים)
12. [תיקיות נתונים](#תיקיות-נתונים)

---

## סקירה כללית

**SurveyPro** היא מערכת סקרים מתקדמת בעברית המאפשרת:
- יצירה וניהול סקרים (סקרים עם שאלה אחת או מספר שאלות)
- איסוף תשובות וניתוח סטטיסטיקות
- שליחת SMS עם קישורים לסקרים
- ניהול משתמשים והרשאות
- אינטגרציה עם BigQuery ו-Micropay
- לינקים מקוצרים
- ממשק ניהול מתקדם

**טכנולוגיות:**
- Node.js + Express
- SQLite (better-sqlite3)
- Google BigQuery
- Micropay SMS API
- Passport.js (אימות)
- PM2 (ניהול תהליכים)

---

## מבנה הפרויקט

```
pseker/
├── server.js                 # קובץ השרת הראשי
├── config.js                 # קובץ תצורה מרכזי
├── auth.js                   # פונקציות אימות בצד הלקוח
├── users.js                  # ניהול משתמשים
├── polls.js                  # ניהול סקרים
├── package.json              # תלויות הפרויקט
├── ecosystem.config.js       # תצורת PM2
├── routes/                   # נתיבי API
├── services/                 # שירותים חיצוניים
├── utils/                    # כלי עזר
├── config/                   # קבצי תצורה נוספים
├── data/                     # קבצי נתונים
├── sessions/                 # קבצי סשן
├── uploads/                  # קבצים מועלים
└── logs/                     # קבצי לוג
```

---

## קבצי תצורה

### `config.js`
**תפקיד:** קובץ תצורה מרכזי של המערכת
**תיאור:**
- הגדרות שרת (פורט 7766, host)
- הגדרות JWT (סוד, תוקף)
- הגדרות CORS
- הגדרות אבטחה (rate limiting, bcrypt)
- הגדרות העלאות קבצים
- הגדרות סקרים (מגבלות)
- הגדרות שירותים חיצוניים (Google, Facebook)
- הגדרות לוגים

**שימוש:** מיובא בכל הקבצים הזקוקים להגדרות המערכת

---

### `package.json`
**תפקיד:** הגדרת הפרויקט ותלויות
**תיאור:**
- שם הפרויקט: `surveypro`
- גרסה: 1.0.0
- סקריפטים: start, dev, pm2:start, pm2:stop, deploy, health
- תלויות עיקריות:
  - express, express-session, express-rate-limit
  - passport, passport-google-oauth20
  - bcrypt, jsonwebtoken
  - better-sqlite3
  - @google-cloud/bigquery
  - multer, helmet, compression, cors

---

### `ecosystem.config.js`
**תפקיד:** תצורת PM2 לניהול תהליכים
**תיאור:**
- שם האפליקציה: `surveypro`
- סקריפט: `server.js`
- משתני סביבה (production)
- הגדרות לוגים
- הגבלות זיכרון (1GB)
- הגדרות restart אוטומטי

---

## קבצי שרת

### `server.js` (3,260 שורות)
**תפקיד:** קובץ השרת הראשי - מטפל בכל הבקשות
**תיאור:**
זהו הקובץ המרכזי של המערכת המכיל:

**הגדרות בסיס:**
- Express app initialization
- Session management (FileStore)
- Passport.js (Google OAuth)
- Multer (העלאת קבצים)
- Middleware (CORS, Helmet, Compression, Rate Limiting)

**נתיבי API:**
- `/api/auth/*` - אימות משתמשים (register, login, logout, profile)
- `/api/surveys/*` - ניהול סקרים (create, get, update, delete, answer, stats, export)
- `/api/admin/*` - ניהול מערכת (users, surveys)
- `/api/stats/*` - סטטיסטיקות כלליות
- `/api/short-links/*` - לינקים מקוצרים
- `/api/sms/*` - שליחת SMS (דרך routes/sms.js)
- `/s/:shortCode` - הפניה ללינקים מקוצרים

**נתיבי HTML:**
- `/` - home.html
- `/login` - login.html
- `/register` - register.html
- `/dashboard` - dashboard.html
- `/surveys` - surveys.html
- `/survey/:id` - survey.html
- `/create-survey` - create-survey.html
- `/s-admin` - s-admin.html (ניהול SMS)
- `/send_sms` - send_sms.html
- `/whatsappgroups` - whatsappgroups.html
- `/faq`, `/help`, `/about`, `/privacy`, `/terms`, `/cookies`

**תכונות:**
- אימות JWT ו-Session
- Rate limiting (שונה לפי סוג בקשה)
- העלאת תמונות לסקרים
- ייצוא נתונים ל-Excel
- ניהול סשנים
- Health check endpoint

---

## מודולי ניהול

### `users.js` (707 שורות)
**תפקיד:** ניהול משתמשים במערכת
**תיאור:**
מודול המטפל בכל פעולות המשתמשים:

**פונקציות עיקריות:**
- `getAllUsers()` - קבלת כל המשתמשים
- `getUserById(id)` - קבלת משתמש לפי ID
- `getUserByUsername(username)` - קבלת משתמש לפי שם משתמש
- `getUserByEmail(email)` - קבלת משתמש לפי אימייל
- `createUser(userData)` - יצירת משתמש חדש
- `updateUser(id, updates)` - עדכון משתמש
- `deleteUser(id)` - מחיקת משתמש
- `authenticateUser(username, password)` - אימות משתמש
- `generateToken(user)` - יצירת JWT token
- `verifyToken(token)` - אימות JWT token
- `saveUsers()` - שמירת משתמשים לקובץ JSON
- `loadUsers()` - טעינת משתמשים מקובץ JSON

**מבנה נתונים:**
- שמירה ב-memory ובקובץ `data/users.json`
- תמיכה ב-bcrypt להצפנת סיסמאות
- תפקידים: `user`, `admin`, `superadmin`

---

### `polls.js` (1,953 שורות)
**תפקיד:** ניהול סקרים ותשובות
**תיאור:**
מודול המטפל בכל פעולות הסקרים:

**פונקציות עיקריות:**
- `createSurvey(surveyData, creatorId)` - יצירת סקר חדש
- `getAllSurveys()` - קבלת כל הסקרים
- `getSurveyById(id)` - קבלת סקר לפי ID
- `getSurveysByCreator(creatorId)` - קבלת סקרים של יוצר
- `updateSurvey(id, updates, userId)` - עדכון סקר
- `deleteSurvey(id, userId)` - מחיקת סקר
- `submitResponse(surveyId, responseData)` - שליחת תשובה
- `getResponses(surveyId, userId)` - קבלת תשובות לסקר
- `getStats(surveyId, userId)` - קבלת סטטיסטיקות
- `exportData(surveyId, userId)` - ייצוא נתונים

**תכונות:**
- תמיכה בסקרים עם שאלה אחת או מספר שאלות
- ניהול הצבעות (votes)
- סטטיסטיקות מפורטות
- ייצוא ל-Excel
- שמירה ב-memory ובקובץ `data/surveys.json` ו-`data/responses.json`

---

### `auth.js` (194 שורות)
**תפקיד:** פונקציות אימות בצד הלקוח (Client-side)
**תיאור:**
קובץ JavaScript שפועל בדפדפן לניהול אימות:

**פונקציות:**
- `isAuthenticated()` - בדיקת אימות משתמש
- `getCurrentUser()` - קבלת משתמש נוכחי
- `logout()` - התנתקות
- `checkExistingSession()` - בדיקת סשן קיים
- `requireAuth()` - דרישת אימות לעמודים מוגנים
- `redirectIfLoggedIn()` - הפניה אם כבר מחובר
- `clearSession()` - ניקוי סשן

**שימוש:** מיובא בדפי HTML לניהול אימות בצד הלקוח

---

## נתיבים (Routes)

### `routes/short-links.js` (265 שורות)
**תפקיד:** ניהול לינקים מקוצרים
**תיאור:**
מודול Express Router לניהול לינקים מקוצרים:

**Endpoints:**
- `POST /api/short-links/store` - יצירת לינק מקוצר
- `GET /api/short-links/:shortCode` - קבלת לינק מקוצר
- `GET /api/short-links/stats/:shortCode` - סטטיסטיקות לינק
- `GET /api/short-links/list/all` - רשימת כל הלינקים
- `DELETE /api/short-links/:shortCode` - מחיקת לינק

**תכונות:**
- שמירה בקובץ `data/short-links.json`
- ניהול תאריכי תפוגה
- מעקב לחיצות (hits)
- ניקוי אוטומטי של לינקים שפג תוקפם

---

### `routes/sms.js` (686 שורות)
**תפקיד:** ניהול שליחת SMS
**תיאור:**
מודול Express Router לשליחת SMS דרך Micropay:

**Endpoints:**
- `GET /api/sms/blacklist` - קבלת רשימה שחורה
- `POST /api/sms/blacklist/merge` - הוספה לרשימה שחורה
- `POST /api/sms/send` - שליחת SMS
- `POST /api/sms/send-from-db` - שליחת SMS מרשימת DB
- `GET /api/sms/campaigns/:id/logs` - לוגי קמפיין
- `GET /api/sms/callback` - callback מ-Micropay
- `GET /api/sms/recipients/:gid` - קבלת נמענים מ-BigQuery
- `GET /api/sms/lists` - רשימת רשימות זמינות

**תכונות:**
- אימות JWT/Session (סופר אדמין בלבד)
- אינטגרציה עם MicropayService
- בניית קישורים מותאמים אישית
- ניהול קמפיינים ב-CampaignStore
- אינטגרציה עם BigQuery

---

## שירותים (Services)

### `services/micropay.js` (284 שורות)
**תפקיד:** שירות לשליחת SMS דרך Micropay
**תיאור:**
Class לניהול תקשורת עם Micropay API:

**פונקציות:**
- `sendPersonalizedSMS(options)` - שליחת SMS מותאמים אישית
- `sendWithGET()` - שליחה בשיטת GET (עד 10 מספרים)
- `sendWithPOST()` - שליחה בשיטת POST (יותר מ-10)
- `validateRecipients()` - אימות נמענים

**תכונות:**
- תמיכה ב-GET ו-POST
- תמיכה בתזמון (schedule)
- התראות (alerts)
- אימות נמענים

---

### `services/linkBuilder.js` (196 שורות)
**תפקיד:** בניית קישורים לסקרים
**תיאור:**
Class לבניית קישורים מותאמים אישית לסקרים:

**פונקציות:**
- `buildSurveyLink(surveyId, phoneE164)` - בניית קישור לסקר
- `buildMultipleSurveyLinks(surveyId, phones, shorten)` - בניית קישורים מרובים
- `shortenUrl(url)` - קיצור URL
- `createShortLink(url)` - יצירת לינק מקוצר

**תכונות:**
- הוספת פרמטר `mp_phone` לקישור
- תמיכה בקיצור URL (Shortl service)
- בנייה מרובה של קישורים

---

### `services/campaignStore.js` (392 שורות)
**תפקיד:** ניהול קמפיינים SMS בבסיס נתונים
**תיאור:**
Class לניהול קמפיינים ב-SQLite:

**טבלאות:**
- `sms_blacklist` - רשימה שחורה של מספרי טלפון
- `sms_campaigns` - קמפיינים SMS
- `sms_campaign_logs` - לוגים של קמפיינים

**פונקציות:**
- `createCampaign(data)` - יצירת קמפיין
- `getCampaignById(id)` - קבלת קמפיין
- `getCampaignByTID(tid)` - קבלת קמפיין לפי TID של Micropay
- `updateCampaign(id, updates)` - עדכון קמפיין
- `getBlacklist()` - קבלת רשימה שחורה
- `mergeBlacklist(phones)` - הוספה לרשימה שחורה
- `addLog(campaignId, type, message)` - הוספת לוג

---

### `services/bigqueryService.js` (284 שורות)
**תפקיד:** אינטגרציה עם Google BigQuery
**תיאור:**
Class לשאילתות BigQuery:

**פונקציות:**
- `ensureInitialized()` - אתחול השירות
- `getRecipientsByGid(gid)` - קבלת נמענים לפי GID
- `testConnection()` - בדיקת חיבור
- `listTables()` - רשימת טבלאות
- `getTableInfo()` - מידע על טבלה

**תכונות:**
- אימות עם Service Account
- שאילתות דינמיות לפי GID
- Project: nadlanet, Dataset: profiles, Table: all_profiles

---

## כלי עזר (Utils)

### `utils/phone.js` (247 שורות)
**תפקיד:** כלי עזר לעיבוד מספרי טלפון ישראליים
**תיאור:**
מודול לעיבוד ואימות מספרי טלפון:

**פונקציות:**
- `normalizeIL(phoneRaw)` - נרמול למספר E.164 (972XXXXXXXXX)
- `validateIL(phone)` - אימות מספר טלפון
- `dedupe(phoneList)` - הסרת כפילויות
- `filterBlacklist(phones, blacklistSet)` - סינון רשימה שחורה
- `extractPhonesFromCSV(csvContent)` - חילוץ מספרים מ-CSV
- `getPhoneType(phone)` - זיהוי סוג (mobile/landline)
- `formatForDisplay(phone)` - עיצוב לתצוגה
- `createBatches(phones, batchSize)` - חלוקה לאצוות
- `processPhoneList(rawPhones, blacklist)` - עיבוד מלא של רשימה

---

### `utils/csv.js` (299 שורות)
**תפקיד:** כלי עזר לעיבוד קבצי CSV
**תיאור:**
מודול לעיבוד וניקוי קבצי CSV:

**פונקציות:**
- `parseCSV(csvContent, options)` - פענוח CSV
- `extractFirstNumberFromLine(line)` - חילוץ מספר ראשון משורה
- `extractPhonesFromCSV(csvContent, options)` - חילוץ מספרי טלפון
- `toCSV(data, columns)` - המרה ל-CSV
- `validateCSV(csvContent, options)` - אימות CSV
- `cleanCSV(csvContent, options)` - ניקוי CSV

---

## קבצי HTML

### דפי אימות וניהול
- **`login.html`** - דף התחברות
- **`register.html`** - דף הרשמה
- **`home.html`** - דף בית
- **`dashboard.html`** - לוח בקרה ראשי (10,635 שורות - גדול מאוד)

### דפי סקרים
- **`surveys.html`** - רשימת סקרים
- **`survey.html`** - דף סקר בודד (1,964 שורות)
- **`survey-21.html`** - גרסה נוספת של דף סקר (2,110 שורות)
- **`create-survey.html`** - יצירת סקר חדש (881 שורות)
- **`survey-dashboard-15.html`** - לוח בקרה לסקר 15 (922 שורות)
- **`survey-dashboard-18.html`** - לוח בקרה לסקר 18 (1,545 שורות)
- **`survey-dashboard-20.html`** - לוח בקרה לסקר 20 (1,894 שורות)

### דפי ניהול SMS
- **`s-admin.html`** - ממשק ניהול SMS (6,212 שורות)
- **`send_sms.html`** - שליחת SMS (1,002 שורות)
- **`whatsappgroups.html`** - ניהול קבוצות WhatsApp (128 שורות)
- **`whatsapp-rotation.html`** - רוטציית WhatsApp (103 שורות)
- **`whatsapp-rotation2.html`** - רוטציית WhatsApp 2 (103 שורות)

### דפי מידע
- **`faq.html`** - שאלות נפוצות (829 שורות)
- **`help.html`** - עזרה (598 שורות)
- **`about.html`** - אודות (570 שורות)
- **`privacy.html`** - מדיניות פרטיות (510 שורות)
- **`terms.html`** - תנאי שימוש (681 שורות)
- **`cookies.html`** - מדיניות עוגיות (541 שורות)

---

## קבצי סקריפטים

### `create-primaries-survey.js` (95 שורות)
**תפקיד:** סקריפט ליצירת סקר פריימריז
**תיאור:**
סקריפט ליצירת סקר עם 43 מועמדים לפריימריז:
- יוצר סקר עם שאלה אחת
- 43 תשובות (מועמדים)
- דורש מספר טלפון
- יוצר על ידי משתמש admin (ID: 1)

**שימוש:** `node create-primaries-survey.js`

---

### `survey-15-tracker.js` (456 שורות)
**תפקיד:** מעקב תשובות לסקר 15 בזמן אמת
**תיאור:**
סקריפט JavaScript (Client-side) למעקב סטטיסטיקות:
- טעינת סטטיסטיקות מ-localStorage
- סנכרון עם שרת
- שמירה אוטומטית
- אינטגרציה עם Google Analytics

---

### `health-check.js` (48 שורות)
**תפקיד:** בדיקת תקינות המערכת
**תיאור:**
סקריפט לבדיקת תקינות השרת:
- בודק endpoint `/health`
- מחזיר קוד יציאה 0 אם תקין, 1 אם לא
- שימושי ל-monitoring ו-PM2

**שימוש:** `node health-check.js` או `npm run health`

---

### `check-gids.js` (83 שורות)
**תפקיד:** בדיקת תקינות GIDs ב-BigQuery
**תיאור:**
סקריפט שבודק אילו GIDs מ-`glist.csv` קיימים ב-BigQuery:
- קורא את `data/glist.csv`
- בודק כל GID מול BigQuery
- מעדכן את הקובץ עם רק GIDs תקינים

**שימוש:** `node check-gids.js`

---

### `update-glist.js` (68 שורות)
**תפקיד:** עדכון `glist.csv` לפי סכמת BigQuery
**תיאור:**
סקריפט שמעדכן את `glist.csv` לפי GIDs הקיימים בטבלת BigQuery:
- מקבל סכמה מ-BigQuery
- מסנן רק GIDs קיימים
- מעדכן את הקובץ

**שימוש:** `node update-glist.js`

---

### `test-bigquery.js` (45 שורות)
**תפקיד:** בדיקת חיבור ל-BigQuery
**תיאור:**
סקריפט לבדיקת תקינות חיבור BigQuery:
- בודק חיבור
- מציג רשימת טבלאות
- מציג מידע על טבלה
- בודק GID values
- מנסה לקבל נמענים

**שימוש:** `node test-bigquery.js`

---

## קבצי תצורה נוספים

### `config/smsLists.js` (20 שורות)
**תפקיד:** הגדרת רשימות SMS זמינות
**תיאור:**
קובץ המגדיר רשימות SMS שניתן לשלוח אליהן:
- `active_subscribers_il` - מנויים פעילים מישראל
- `verified_users` - משתמשים מאומתים
- `survey_participants` - משתתפי סקרים
- `newsletter_subscribers` - מנויי ניוזלטר
- `custom_list_1`, `custom_list_2` - רשימות מותאמות

**שימוש:** מיובא ב-`routes/sms.js` לאימות רשימות

---

### `ssl-config.js` (117 שורות)
**תפקיד:** תצורת SSL/HTTPS
**תיאור:**
קובץ לניהול תצורת SSL:
- הגדרות HTTPS
- ניהול תעודות SSL
- Redirect מ-HTTP ל-HTTPS

---

### `nginx-sekerapp.online.conf` (77 שורות)
**תפקיד:** תצורת Nginx לפרודקשן
**תיאור:**
קובץ תצורת Nginx:
- Reverse proxy לשרת Node.js
- הגדרות SSL
- הגדרות CORS
- הגדרות caching
- הגדרות compression

---

### `nginx-simple.conf` (1.2KB)
**תפקיד:** תצורת Nginx פשוטה
**תיאור:**
תצורת Nginx בסיסית לפיתוח/בדיקה

---

### `surveypro.service` (697B)
**תפקיד:** קובץ systemd service
**תיאור:**
קובץ systemd להפעלת השרת כשירות:
- הפעלה אוטומטית
- ניהול תהליכים
- הגדרות סביבה

---

## קבצי deployment

### `deploy.sh` (2.3KB)
**תפקיד:** סקריפט deployment
**תיאור:**
סקריפט bash לפריסת המערכת:
- עצירת שרת קיים
- עדכון קוד
- התקנת תלויות
- הפעלת PM2
- בדיקת תקינות

---

### `start-pm2.sh` (1.7KB)
**תפקיד:** הפעלת PM2
**תיאור:**
סקריפט להפעלת השרת עם PM2

---

### `stop-pm2.sh` (401B)
**תפקיד:** עצירת PM2
**תיאור:**
סקריפט לעצירת השרת

---

## קבצי תיעוד

### `README.md` (5,740 שורות)
**תפקיד:** תיעוד ראשי של הפרויקט
**תיאור:**
קובץ תיעוד מפורט עם:
- הוראות התקנה
- הוראות שימוש
- תיאור תכונות
- API documentation
- דוגמאות קוד

---

### `API_ENDPOINTS.md` (866 שורות)
**תפקיד:** תיעוד מלא של כל ה-API endpoints
**תיאור:**
מסמך מפורט עם:
- כל ה-endpoints
- פרמטרים נדרשים
- דוגמאות תגובות
- קודי שגיאה
- דוגמאות שימוש

---

### `PRODUCTION_DEPLOYMENT.md` (180 שורות)
**תפקיד:** הוראות פריסה לפרודקשן
**תיאור:**
מדריך לפריסת המערכת בסביבת פרודקשן:
- הגדרות שרת
- הגדרות SSL
- הגדרות PM2
- הגדרות Nginx
- בדיקות תקינות

---

### `SSL-SETUP.md` (129 שורות)
**תפקיד:** הוראות הגדרת SSL
**תיאור:**
מדריך להגדרת SSL/HTTPS:
- יצירת תעודות
- הגדרת Nginx
- בדיקות תקינות

---

### `SMS_SETUP.md` (91 שורות)
**תפקיד:** הוראות הגדרת SMS
**תיאור:**
מדריך להגדרת שירות SMS:
- הגדרת Micropay
- הגדרת BigQuery
- הגדרת רשימות

---

### `MICROPAY_FIXES_SUMMARY.md` (183 שורות)
**תפקיד:** סיכום תיקונים ב-Micropay
**תיאור:**
מסמך המתעד תיקונים ושיפורים בשירות Micropay

---

## קבצי נתונים

### `data/`
**תפקיד:** תיקיית קבצי נתונים
**תיאור:**
תיקייה המכילה:
- `users.json` - משתמשים
- `surveys.json` - סקרים
- `responses.json` - תשובות
- `short-links.json` - לינקים מקוצרים
- `glist.csv` - רשימת GIDs מ-BigQuery
- `survey-15-stats.json` - סטטיסטיקות סקר 15
- `app.db` - בסיס נתונים SQLite (קמפיינים SMS)
- `log.txt` - לוגים

---

### `sessions/`
**תפקיד:** תיקיית קבצי סשן
**תיאור:**
תיקייה לשמירת קבצי סשן (session-file-store)

---

### `uploads/`
**תפקיד:** תיקיית קבצים מועלים
**תיאור:**
תיקייה לשמירת תמונות שמועלות לסקרים

---

### `logs/`
**תפקיד:** תיקיית לוגים
**תיאור:**
תיקייה לשמירת קבצי לוג:
- `err.log` - שגיאות
- `out.log` - פלט
- `combined.log` - משולב

---

## קבצים נוספים

### קבצי תמונה
- `logo.png` - לוגו המערכת
- `02e1465276d61713b7ef8c4a4d23939e.jpg` - תמונה
- `original-05022435da2a414a5258627b7fee94c7.gif` - אנימציה

### קבצי JavaScript חיצוניים
- `chart.js` (200KB) - ספריית גרפים
- `xlsx.min.js` (861KB) - ספריית Excel

### קבצי תצורה נוספים
- `client_secret_*.json` - תעודת Google OAuth
- `nadlanet-d74611f076ac.json` - תעודת BigQuery Service Account
- `available_gids.txt` - רשימת GIDs זמינים
- `requirements.txt` - תלויות Python (אם יש)

### קבצי HAR
- `sekerapp.online.har` - קובץ HAR (HTTP Archive)
- `p.har` - קובץ HAR נוסף

---

## מבנה בסיס הנתונים

### SQLite (`data/app.db`)

**טבלה: `sms_blacklist`**
```sql
CREATE TABLE sms_blacklist (
    phone TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**טבלה: `sms_campaigns`**
```sql
CREATE TABLE sms_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL,
    from_sender TEXT NOT NULL,
    total INTEGER NOT NULL,
    sent INTEGER DEFAULT 0,
    skipped_blacklist INTEGER DEFAULT 0,
    invalid INTEGER DEFAULT 0,
    micropay_tid TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**טבלה: `sms_campaign_logs`**
```sql
CREATE TABLE sms_campaign_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    log_type TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id)
)
```

---

## משתני סביבה נדרשים

```bash
# שרת
PORT=7766
NODE_ENV=production
HOST=0.0.0.0

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Session
SESSION_SECRET=your-session-secret

# CORS
CORS_ORIGIN=https://sekerapp.online

# Micropay
MICROPAY_TOKEN=your-micropay-token
MICROPAY_FROM=your-sender-name

# BigQuery
BIGQUERY_PROJECT_ID=nadlanet
BIGQUERY_DATASET_ID=profiles
BIGQUERY_TABLE_NAME=all_profiles
GOOGLE_APPLICATION_CREDENTIALS=./nadlanet-d74611f076ac.json

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Public URL
PUBLIC_BASE_URL=https://sekerapp.online
```

---

## זרימת עבודה טיפוסית

### יצירת סקר חדש:
1. משתמש מתחבר (`/login`)
2. יוצר סקר (`/create-survey` או `POST /api/surveys/create`)
3. הסקר נשמר ב-`data/surveys.json`
4. משתמש מקבל קישור לסקר

### שליחת תשובה:
1. משתמש נכנס לקישור הסקר (`/survey/:id`)
2. בוחר תשובה
3. שולח תשובה (`POST /api/surveys/:id/answer`)
4. התשובה נשמרת ב-`data/responses.json`
5. סטטיסטיקות מתעדכנות

### שליחת SMS:
1. סופר אדמין נכנס ל-`/s-admin`
2. בוחר סקר ורשימת נמענים
3. שולח SMS (`POST /api/sms/send`)
4. MicropayService שולח SMS
5. CampaignStore שומר קמפיין ב-SQLite
6. נמענים מקבלים SMS עם קישור מותאם אישית

---

## הערות חשובות

1. **אבטחה:**
   - כל ה-endpoints דורשים אימות (JWT או Session)
   - Rate limiting מופעל על כל ה-endpoints
   - סיסמאות מוצפנות עם bcrypt
   - CORS מוגדר רק לדומיינים מורשים

2. **ביצועים:**
   - הנתונים נשמרים ב-memory ובקבצי JSON (לא אופטימלי לפרודקשן)
   - מומלץ לעבור ל-MongoDB או PostgreSQL לפרודקשן
   - SQLite משמש רק לקמפיינים SMS

3. **תחזוקה:**
   - קבצי JSON נטענים בכל הפעלה
   - אין גיבוי אוטומטי - יש ליצור גיבויים ידניים
   - לוגים נשמרים ב-`logs/`

4. **פיתוח:**
   - השרת רץ על פורט 7766
   - PM2 מנהל את התהליך
   - Nginx משמש כ-reverse proxy

---

## סיכום

פרויקט SurveyPro הוא מערכת סקרים מתקדמת בעברית עם תכונות:
- ניהול סקרים מלא (יצירה, עריכה, מחיקה, סטטיסטיקות)
- אימות משתמשים (JWT + Session)
- שליחת SMS עם קישורים מותאמים אישית
- אינטגרציה עם BigQuery ו-Micropay
- ממשק ניהול מתקדם
- לינקים מקוצרים
- ייצוא נתונים ל-Excel

המערכת בנויה על Node.js + Express עם שמירת נתונים ב-JSON files ו-SQLite, ומוכנה לפרודקשן עם PM2 ו-Nginx.

---

**תאריך עדכון אחרון:** 2025-01-13
**גרסה:** 1.0.0

