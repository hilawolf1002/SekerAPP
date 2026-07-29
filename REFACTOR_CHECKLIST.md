# צ'קליסט פיתוח מלא: מערכת סקרים ופאנל עונים מתוגמל (SekerApp)

צ'קליסט זה מתאר את כל השלבים הדרושים כדי לייצב את המערכת הקיימת (שלב א') ולאחר מכן להרחיב אותה למערכת "פאנל עונים מתוגמל" (שלב ב').
המערכת נבנית בארכיטקטורה של React (Client) ו-Node.js/TypeScript (Server), מתוך הבנה שהיא עתידה לשרת **כמות גדולה מאוד של משתמשים (High Scalability)**, ותוכננה לביצועים מהירים, אבטחה מחמירה, וממשק משתמש (UI/UX) אינטואיטיבי המותאם במיוחד למובייל.

**החלטות מוצר/טכניות שאושרו:**
- מסד נתונים: **PostgreSQL + Prisma**
- מבנה תיקיות: לפי תבנית `alidealbot` (Client/Server ממוספר בשרת)
- נתונים ישנים (JSON): **לא מעבירים** – בונים מאפס
- אזור אדמין מורחב: **נדחה לשלב מאוחר יותר** (אחרי ליבת העונים והנקודות)
- שפות: TypeScript בכל הפרויקט
- הודעות מערכת מותאמות מין: ברירת מחדל = ניסוח לבן; אחרי KYC לפי `demographics.gender`
- **מודל משתמשים (מאושר ע"י בוס, יולי 2026):**
  - כל משתמש יכול ליצור סקרים חינמיים – רק OTP נדרש
  - עונה בתשלום דורש KYC מלא (שאלון + אימות זהות) ואישור ידני
  - `UserRole` (USER/ADMIN) מייצג הרשאות מערכת
  - `ResponderStatus` (NEW/PENDING/APPROVED/...) מייצג מצב באישור ה-KYC

**עדכון אחרון:** 28 ביולי 2026 – סגירת קצוות מול האפיון + מדריך בדיקות בתוכנית

> **מדריך בדיקות מלא לפני לקוח/ענן:**  
> `C:\Users\נחמן\.cursor\plans\system_status_review_3df1bf2b.plan.md`  
> (מטריצה מול PDF + בדיקות 0–9 + איך לדווח תוצאות)

---

## 🔍 סיכום מצב נוכחי (ביקורת יולי 2026)

### מה בוצע ועובד:
- אימות OTP + JWT ב-HttpOnly Cookie ✅
- מבנה שרת Express/TypeScript מסודר בשכבות ✅
- Prisma schema מלא (כולל User, Tag, Survey, SurveyResponse, PointTransaction, KYC) ✅
- API: יצירת סקר, רשימה, צפייה, שינוי סטטוס, סטטיסטיקות ✅
- API: התחלה + השלמה עם טיימר ונעילה ✅
- API: נקודות (יתרה + היסטוריה) ✅
- React Client: מסך כניסה, בית, רשימת סקרים, יצירה, מענה, סטטיסטיקות, נקודות ✅
- Rate Limiting, Helmet, CORS, Zod validation ✅
- Toast, Gender-aware text, PrivateRoute ✅

### באגים שנמצאו בסקירה – מצב טיפול:

| # | באג | חומרה | קובץ |
|---|-----|--------|------|
| B1 | נתיב הפעלת production שגוי | ✅ תוקן | `server/package.json` |
| B2 | משתמש לא מאושר יכול לצבור נקודות | ✅ תוקן – החזרנו את `assertRewardEligibility`; כעת רק APPROVED/ADMIN יכולים לענות על סקרים מתוגמלים | `server/src/5-logic/surveys/survey-logic.ts` |
| B3 | Race condition במכסת תשובות | ✅ תוקן בנעילת PostgreSQL אטומית לפי סקר | `server/src/5-logic/surveys/survey-logic.ts` |
| B4 | `STARTED` לא נחשב במכסה | ✅ תוקן; STARTED פעיל שומר מקום ופגי-זמן משתחררים | `server/src/5-logic/surveys/survey-logic.ts` |
| B5 | הגבלת OTP לפי IP בלבד | ✅ נוספה מגבלה אטומית לפי טלפון + cooldown | `server/src/5-logic/auth/auth-logic.ts` |
| B6 | Token של Micropay בתוך URL | ✅ הועבר לגוף POST מוצפן ב-HTTPS | `server/src/5-logic/auth/sms-service.ts` |
| B7 | JWT secret חלש כברירת מחדל | ✅ בפרודקשן חובה סוד באורך 32+ | `server/src/2-utils/config.ts` |
| B8 | מעקף OTP עלול להגיע לפרודקשן | ✅ אין מספר ברירת מחדל והוא מנוטרל תמיד בפרודקשן | `server/src/2-utils/config.ts` |
| B9 | קבצי credentials ישנים בשורש | ⚠️ נוספו ל-`.gitignore`; עדיין נדרשים מחיקה/ארכוב וסיבוב מפתחות בידי בעל החשבון | שורש הפרויקט |

---

## 🏗️ שלב א': ייצוב תשתיתי (Refactoring & Stabilization)
מטרת שלב זה: בניית יסודות חזקים, מסד נתונים אמיתי, ארכיטקטורה מסודרת ואבטחה, תוך שימור יכולות הסקרים הבסיסיות.

### 1. הכנת תשתיות וארכיטקטורה
- [x] מחיקת תוסף הוורדפרס (`wordpress-plugin/`).
- [x] הקמת מבנה פרויקט מופרד: תיקיית `client` (React/Vite) ותיקיית `server` (Node.js/Express).
- [x] הגדרת **TypeScript** בשתי הסביבות.
- [x] הגדרת משתני סביבה `.env` בשרת החדש (סודות, DB, מפתחות API) – ללא סודות בקוד.
- [x] **[B9]** נוסף `.gitignore` שכולל `.env`, גיבויים וקבצי credentials.
- [ ] **[B9 – פעולה ידנית]** לסובב/לבטל את המפתחות אצל הספקים ורק אז למחוק או לארכב מחוץ לפרויקט את `client_secret_*.json`, `.env.backup`, `nadlanet-*.json`.

### 2. מסד נתונים וביצועים (Database & Performance)
- [x] התקנת Prisma 6 והגדרת `schema.prisma`.
- [x] הגדרת מודלים לפי האפיון: User, Tag, Survey, SurveyResponse, PointTransaction (+ קשרים).
- [x] אינדקסים לשאילתות נפוצות (טלפון, סטטוס עונה, סקר+סטטוס מענה, ארנק לפי משתמש).
- [x] חיבור ל-PostgreSQL (Docker מקומי) והרצת Migration ראשון (`init` + `add_auth_otp`).
- [x] DAL בסיסי (`server/src/2-utils/dal.ts`) – Prisma Client יחיד לכל השרת.
- [x] ~~הגירת JSON ישן~~ – **לא רלוונטי** (החלטה: מתחילים מאפס).
- [x] **[B3/B4]** תוקן race condition במכסת תשובות:
  - `start` ו-`complete` משתמשים ב-PostgreSQL advisory transaction lock לפי `surveyId`.
  - המכסה סופרת `COMPLETED` וגם `STARTED` שטרם פג זמנם.
  - נעילות שפג זמנן משתחררות אוטומטית לפני הקצאת מקום חדש.

### 3. אבטחה, פרטיות והגנה מפני ניצול לרעה (Security & Abuse Prevention)

#### 3.1 הגנה על API ושרת
- [x] Helmet, CORS מוגבל לדומיינים מורשים, Rate-Limiting גלובלי.
- [x] Rate-Limiting מוגבר על: שליחת OTP, אימות OTP.
- [x] Rate-Limiting על שליחת תשובה לסקר (`start` / `complete`).
- [x] Rate-Limiting על בקשת מימוש נקודות (`POST /api/points/redeem`, עד 5 ליום).
- [x] ולידציה מחמירה בשרת עם Zod (Auth + Surveys).
- [x] טיפול שגיאות גלובלי – בלי לחשוף stack / פרטים פנימיים למשתמש.
- [x] **[B5]** Rate-limit לפי מספר טלפון נוסף להגבלת ה-IP: נעילת DB אטומית, עד 5 בקשות ב-15 דקות ו-cooldown של 60 שניות. הערכים ניתנים להגדרה ב-`.env`.

#### 3.2 הזדהות והרשאות
- [x] התחברות ללא סיסמה – OTP לטלפון עם SMS אמיתי (Micropay). `OTP_DELIVERY=console` לפיתוח מקומי בלי SMS.
- [x] מעקף פיתוח זמני למספר מוגדר (להסיר לפני פרודקשן).
- [x] JWT ב-HttpOnly Cookie (SameSite=lax, Secure בפרודקשן).
- [x] Middleware הרשאות: requireAuth / optionalAuth / requireApprovedResponder / requireAdmin.
- [x] בדיקת בעלות על סקר (סטטוס / סטטיסטיקות – רק ליוצר).
- [x] **[B2 – חובר מחדש]** רק משתמש מאושר (APPROVED) או אדמין יכול לענות על סקרים מתוגמלים. הבדיקה מתבצעת ב-`startSurveyResponse` דרך `assertRewardEligibility`. משתמש NEW/PENDING/REJECTED/BLOCKED נחסם מסקר מתוגמל עם הודעה מתאימה.
- [x] **[B7]** בפרודקשן `JWT_SECRET` חובה ובאורך 32 תווים לפחות; בפיתוח בלבד קיים fallback מקומי.
- [x] **[B8]** Dev bypass אופציונלי, ללא מספר קשיח, ומנוטרל תמיד בפרודקשן. גם `OTP_DELIVERY=console` חסום בפרודקשן.

#### 3.3 מידע רגיש (KYC / ת.ז. / פרטיות)
- [x] בפיתוח מקומי תמונות ת.ז. נשמרות רק ב-`server/private-uploads/kyc`, אינן מוגשות כ-static, אינן נשמרות ב-DB ונמצאות ב-`.gitignore`.
- [x] נשמר ב-`user.idDocumentUrl` רק storage key פרטי; שם הקובץ אקראי והרשאות הכתיבה מצומצמות.
- [x] הגנת העלאה: חובה JPG/PNG/WEBP, בדיקת חתימת קובץ אמיתית, מקסימום 8MB וקובץ יחיד.
- [x] **מחיקת קובץ ת.ז. לאחר אישור וגם לאחר דחייה** – נשאר רק דגל `idVerified` / סטטוס.
- [x] החלטה זמנית (יולי 2026): אחסון ת.ז. נשאר בתיקייה מקומית גם לקראת פרודקשן, כי הקובץ זמני עד החלטת אדמין ואז נמחק. אם בעתיד יהיו כמה שרתים – לשקול S3.
- [ ] לפני scale / כמה instances: להעביר ל-S3 Private אם נדרש.
- [ ] גישה לת.ז. רק דרך Presigned URL זמני לאדמין (כרגע base64 מאובטח מאחורי requireAdmin).
- [ ] הצפנת דיסק של PostgreSQL (Encryption at Rest) בסביבת הפרודקשן.
- [ ] בחינת הצפנת שדות רגישים ברמת האפליקציה אם יישמרו מספרי ת.ז. כטקסט.

#### 3.4 הגנה על נקודות וסקרים (Anti-Fraud)
- [x] נקודות מתווספות **רק בשרת** אחרי אימות שהסקר הושלם – הלקוח לא שולח "תן לי X נקודות".
- [x] ארנק כ-Ledger (`PointTransaction`) + טרנזקציות DB (ACID) למניעת כפילויות / משיכה כפולה.
- [x] מניעת מענה כפול על אותו סקר (Unique על userId+surveyId).
- [x] נעילת מכסה + תוקף זמן ברמת DB (start/complete) + חידוש אחרי פג זמן.
- [ ] תיעוד פעולות רגישות בלוג שרת (אישור עונה, מימוש נקודות, שינוי הרשאות).
  - **איך לבצע:** הוסף `winston` או `pino` לשרת. כתוב `auditLog(action, userId, details)` ב-`2-utils/logger.ts`. קרא אותו בכל פעולה רגישה.

### 4. בניית ה-API מחדש (Backend) – ליבה בסיסית
- [x] Auth: OTP + פרופיל בסיסי (`/me`) כולל `demographics`.
- [x] סקרים: יצירה, רשימה שלי, צפייה, שינוי סטטוס.
- [x] סוגי שאלות: בחירה (אחת/מרובה) + **תשובה חופשית (open_text)**.
- [x] קליטת תשובות: התחלה (נעילת זמן) + השלמה + סטטיסטיקות בסיסיות + נקודות ב-Ledger אם מתוגמל.
- [x] API נקודות: `GET /api/points/me` (יתרה + היסטוריה).
- [x] אינטגרציית SMS ל-OTP (Micropay). הפצת סקרים ב-SMS – בהמשך.
- [x] קובץ קריאות Postman: `POSTMAN_API.md`.
- [x] **[B1]** `server/package.json` מפעיל כעת `node dist/index.js`.
- [x] **[B6]** Micropay אינו תומך ב-Authorization header בממשק הזה; ה-token מועבר בגוף בקשת HTTPS POST ולא ב-URL.
- [x] העלאת תמונה לסקר (תיקייה מקומית `server/public-uploads/surveys`, מוגש ב-`/uploads/surveys`):
  - Route: `POST /api/surveys/upload-image` + שדה בטופס יצירה.
  - JPG/PNG/WEBP עד 5MB + בדיקת חתימת קובץ.
- [x] בחירת צבע רקע לסקר (`backgroundColor` בפורמט `#RRGGBB`) – בטופס יצירה + תצוגה במענה.

### 5. ממשק משתמש בסיסי ב-React (Frontend)
- [x] Routing + Services + AuthContext לפי מבנה `Components/`.
- [x] מסך התחברות OTP מותאם מובייל (עיצוב לפי הגרסה הישנה).
- [x] דף בית עם קישורים לסקרים / נקודות / יצירה.
- [x] מסכי סקר: רשימה, יצירה, מענה (שאלה־שאלה + טיימר), סטטיסטיקות.
- [x] דשבורד נקודות (יתרה + היסטוריה).
- [x] Toast להתראות שגיאה/הצלחה (~3 שניות).
- [x] הודעות מערכת מותאמות מין (`useGender`) – ברירת מחדל: ניסוח לבן.
- [x] הסברים קצרים ואינטואיטיביים ליד פעולות חשובות.
- [x] העלאת / הצגת תמונת סקר בממשק.
- [x] בחירת צבע רקע לסקר בממשק.
- [x] Lazy loading לנתיבים ב-`AppRoutes.tsx` (`React.lazy` + `Suspense`) – שיפור ביצועי טעינה ראשונית.

---

## 🚀 שלב ב': פאנל עונים מתוגמל
מטרת שלב זה: עונים מאומתים, נקודות, קהלים, הזמנות לסקרים – עם UX מובייל וביצועים תחת עומס.

### 6. הצטרפות ואישור עונים (KYC)

**מצב נוכחי:** שאלון KYC + אישור/דחייה באדמין + SMS באישור – הושלמו. נבדק ב-28/7/2026 מקצה לקצה (PENDING → APPROVE → status=APPROVED).

#### 6.1 שרת – API הרשמה ופרופיל
- [x] `kyc-logic.ts`: שמירת פרופיל, מסמך פרטי ושינוי סטטוס ל-`PENDING_APPROVAL`.
- [x] `POST /api/auth/kyc/apply`: בקשת multipart אטומית הכוללת גם שאלון וגם `idDocument`; אין מצב שבו בקשה מוגשת בלי מסמך.
- [x] `GET /api/auth/kyc/status`: סטטוס, האם קיים מסמך ומועד הגשה.
- [x] `kycApplicationSchema`: ולידציה מלאה בשרת, כולל תאריך אמיתי וגיל 18 ומעלה.
- [x] שדות פרופיל: שם מלא, תאריך לידה, מגדר, עיר, מצב תעסוקתי ורמת השכלה.
- [x] הגשה כפולה נחסמת כאשר המשתמש כבר `PENDING_APPROVAL` או `APPROVED`; משתמש `REJECTED` יכול להגיש מחדש.
- [x] אישור/דחייה ידניים על ידי מנהל + מחיקת המסמך לאחר החלטה.
- [x] בעת אישור: שליחת SMS לעונה ועדכון `status=APPROVED`, `idVerified=true`.

#### 6.2 לקוח – מסכי הרשמה
- [x] `KycRegistrationPage.tsx`: שאלון RTL מותאם מובייל ב-3 שלבים – פרטים, פרופיל ואימות זהות.
- [x] גיל 18 נאכף גם בממשק וגם בשרת.
- [x] צילום ת.ז. הוא חובה, עם צילום ישיר מהטלפון או בחירת קובץ, בדיקת סוג וגודל.
- [x] לאחר הגשה מוצג מסך המתנה שמסביר כי לאחר אישור ידני תישלח הודעת SMS.
- [x] `/join` מוגן ב-`PrivateRoute`; אותו מסך מציג מצבי NEW/REJECTED/PENDING_APPROVAL/APPROVED.
- [x] `HomePage` מציג CTA להצטרפות או הודעת "הבקשה בבדיקה" לפי הסטטוס.
- [x] `kycService.ts` שולח שאלון ומסמך יחד ב-`multipart/form-data`.
- [x] **הבהרת UX (יולי 2026):** מסכי הבית וה-KYC מבהירים שכל אחד יכול ליצור סקרים חינמיים, וה-KYC מיועד רק למי שרוצה להרוויח נקודות מענייה על סקרים בתשלום.
- [ ] לבצע בדיקת UX מלאה במובייל אמיתי לאחר הפעלת PostgreSQL המקומי.

### 7. אזור אישי לעונה (User Dashboard)
- [x] יתרת נקודות + היסטוריית תנועות (`/points`).
- [x] התקדמות ליעד מימוש: `progress` ב-`GET /api/points/me` + Progress Bar + באנר פדיון בדף הנקודות.
- [x] פדיון קופון: בחירת חנות → קבלת קוד מיידי (`POST /api/points/redeem`).
- [ ] היסטוריית סקרים שהעונה ענה עליהם:
  - **שרת:** הוסף `GET /api/surveys/my-responses` עם `requireAuth`.
  - **לקוח:** לשונית "סקרים שעניתי" ב-`PointsDashboardPage` או דף נפרד.
- [ ] הזמנות פעילות (ראה שלב 9 – הפצה).

### 8. מנגנון נקודות וחבר מביא חבר
- [x] Ledger בסיסי (`PointTransaction`) + זיכוי על השלמת סקר מתוגמל.
- [x] בונוס הצטרפות (`JOIN_BONUS`) בעת `approveResponder` לפי `signupBonus` בהגדרות.
- [x] בונוס חבר מביא חבר (`REFERRAL_BONUS`) ל-`referredById` בעת אישור (אם הוגדר).
- [x] שאלון KYC: "הגעתי דרך חבר" + טלפון מפנה → שמירת `referredById` אם קיים במאגר.
- [x] היסטוריית נקודות: `note` עם שם החבר שהגיע (`הגיע דרכך חבר בשם: …`).
- [ ] קישור הפניה למשתמש (אופציונלי / מסלול נוסף):
  - **שרת:** `GET /api/auth/referral-link` – `{ referralCode, referralUrl }`.
  - **לקוח:** בדף הנקודות – הצגת קישור + כפתור "העתק".
  - **Auth:** קליטת `referralCode` בהרשמה/OTP ושמירת `referredById`.

### 9. סקרים מתוגמלים והפצה לקהל

#### 9.1 מכסה ונעילה (תיקון + הרחבה)
- [x] ניקוד פר סקר (בטופס יצירה) + זיכוי אוטומטי בסיום מענה.
- [x] מגבלת כמות תשובות לסקר (`maxResponses`).
- [x] **[B3/B4]** תיקון race condition (ראה סעיף 2).

#### 9.2 Invitation System – שליחת הזמנות
- [ ] **שרת:** צור `server/src/5-logic/surveys/invitation-logic.ts`:
  - `inviteByTags(surveyId, tagIds[])` – שלוף כל `User` בעל כל התגיות, הסנן כבר ענו / חסומים, שלח SMS לכל אחד.
  - `inviteByPhoneList(surveyId, phones[])` – פרסום לרשימת מספרים (קובץ CSV או מערך).
  - SMS message: `"הוזמנת לענות על סקר ולהרוויח {N} נקודות: {shortUrl}"`.
- [ ] **שרת:** הוסף route `POST /api/surveys/:id/invite` עם `requireAdmin`:
  - Body: `{ mode: 'tags' | 'phones', tagIds?: [], phones?: [] }`.
  - הגבל לסקרים במצב `ACTIVE`.
  - החזר: `{ sent: N, skipped: M }`.
- [ ] **שרת:** הוסף route `GET /api/surveys/invited` עם `requireApprovedResponder` – מחזיר סקרים פעילים שהמשתמש הוזמן אליהם (לפי `SurveyInvitation` – ראה Migration למטה).
- [ ] **Migration:** הוסף מודל `SurveyInvitation` ל-schema: `id, surveyId, userId, sentAt, status (SENT/OPENED/RESPONDED)`.
- [ ] **לקוח:** הוסף לדף `PointsDashboardPage` או דף `InvitationsPage.tsx`: רשימת הזמנות פעילות עם כפתור "ענה עכשיו".

#### 9.3 שיפורי UI יצירת סקר
- [x] התעלמות משאלות ריקות בסוף הטופס: אם יש לפחות שאלה תקינה אחת, טיוטות ריקות לא חוסמות יצירה.
- [ ] ב-`CreateSurveyPage.tsx`: הוסף מקטע "הפצה":
  - בחירת תגיות לשלוח (dropdown multi-select).
  - לחצן "שלח הזמנות" → קריאה ל-`POST /api/surveys/:id/invite`.

### 10. נעילת סקרים וזמן מענה
- [x] תפיסת מקום ב-DB בכניסה לסקר (`STARTED`).
- [x] טיימר ברור במובייל (ברירת מחדל 10 דקות, ניתן בטופס).
- [x] שחרור / חידוש אחרי פג זמן (`EXPIRED_TIME` → אפשרות להתחיל מחדש).
- [x] מימוש נקודות להטבות (קופון לחנות):
  - מודלים: `GlobalSettings`, `GiftOption`, `GiftCoupon`, `RedemptionRequest`.
  - אדמין קובע יעד פדיון (למשל 100/200) ב-`/admin/settings`.
  - אדמין מוסיף חנויות + מלאי קודי קופון ב-`/admin/gifts`.
  - עונה מאושר שעובר את היעד רואה באנר ברור בדף הנקודות ובוחר חנות.
  - `POST /api/points/redeem` מנכה נקודות, מסמן קופון כמשומש ומחזיר את הקוד מיד.
  - Rate-limit על פדיון + היסטוריית פדיונות למשתמש ולאדמין.

### 11. פאנל אדמין
**מצב נוכחי (יולי 2026):** אדמין שולט בהגדרות, מתנות/קופונים, משתמשים, אישורי KYC ופדיונות.

#### 11.1 Backend Admin API
- [x] התחברות אדמין + `requireAdmin`
- [x] ניהול עונים: pending / approve / reject / block / שינוי סטטוס כללי
- [x] צפייה בת.ז. מאובטחת + מחיקה אחרי אישור/דחייה
- [x] `GET/PATCH /api/admin/settings` – יעד פדיון, בונוסים, ברירות מחדל לסקר
- [x] `GET/POST/PATCH /api/admin/gifts` + `POST /api/admin/gifts/:id/coupons`
- [x] `GET /api/admin/redemptions` – זכאים + היסטוריה
- [x] רק אדמין יכול ליצור סקר מתוגמל
- [x] חיבור בונוס הצטרפות / חבר מביא חבר בפועל בעת `approveResponder` (לפי ההגדרות)
- [x] ניהול תגיות (`GET/POST/DELETE /api/admin/tags`) + שיוך לעונים
- [x] שליחת הזמנות לסקר לפי תגיות/טלפונים

#### 11.2 Frontend Admin Panel
- [x] `AdminLoginPage`, `AdminDashboardPage`, `AdminPendingApprovalsPage`
- [x] `AdminUsersPage` – חיפוש/סינון + אישור/חסימה/שחרור/דחייה
- [x] `AdminSettingsPage` – יעד פדיון והגדרות
- [x] `AdminGiftsPage` – חנויות + מלאי קופונים
- [x] `AdminRedemptionsPage` – זכאים + היסטוריה
- [x] נתיבים: `/admin`, `/admin/pending`, `/admin/users`, `/admin/settings`, `/admin/gifts`, `/admin/redemptions`, `/admin/tags`
- [x] `AdminTagsPage` + שיוך תגיות לעונים + הפצה לפי תגיות
- [x] הפצת סקר בטלפונים/תגיות אחרי יצירה (`CreateSurveyPage`) + מסך הזמנות לעונה (`/invitations`)
- [ ] יצירת סקר מתוגמל ייעודית בתוך אזור האדמין (אופציונלי – כרגע דרך `/surveys/create`)

---

## 📦 מה עדיין חסר (Backlog מסודר) – מעודכן 28/7/2026

### ליבת פאנל עונים
- [x] Invitation system (backend): מודל `SurveyInvitation`, `inviteByTags` / `inviteByPhones`, routes
- [x] Invite frontend: `InvitationsPage` + הפצה ב-SMS אחרי יצירת סקר (טלפונים)
- [x] תגיות: API + `AdminTagsPage` + שיוך לעונים + הפצה לפי תגיות ב-UI
- [x] דשבורד עונה: סקרים שעניתי (`GET /api/surveys/my-responses` + לשונית ב־`/points`)
- [x] חבר מביא חבר: זיכוי בונוס באישור (שדה `referredById` + `referralBonus`) + שאלון KYC עם טלפון מפנה
- [x] בונוס הצטרפות באישור KYC לפי `signupBonus`
- [ ] קישור הפניה למשתמש (העתקה + שמירת מפנה ב-OTP)

### חוויית משתמש / מוצר
- [x] יצירת סקר: התעלמות משאלות ריקות אם יש לפחות שאלה תקינה
- [x] KYC בלי ת.ז. בהרשמה; ת.ז. רק בפדיון
- [x] פדיון כפנייה ידנית (מייל + ת.ז. → אדמין שולח קופון)
- [x] ספק SMS: Mesergo (במקום Micropay)
- [ ] בדיקת UX מלאה במובייל אמיתי ל-KYC + פדיון + הזמנות
- [ ] הודעת SMS אמיתית בפרודקשן (`OTP_DELIVERY=sms` + `MESERGO_*`)
- [ ] מסך יצירת סקר מתוגמל נפרד לאדמין (אופציונלי)

### תשתית / פרודקשן – לפני עלייה ראשונה ללקוח
- [ ] מילוי `.env`: `MESERGO_USERNAME`, `MESERGO_TOKEN`, `MESERGO_SENDER`, `ADMIN_EMAIL`, `PUBLIC_BASE_URL`
- [ ] B9: סיבוב מפתחות ישנים + ארכוב קבצי credentials
- [ ] הסרת / וידוא כיבוי `DEV_AUTH_BYPASS_PHONE` בפרודקשן
- [ ] Audit log לפעולות אדמין רגישות (מומלץ)
- [ ] בדיקות ידניות מקצה לקצה (OTP, KYC, סקר, פדיון, הזמנה)
- [x] Pagination בכל הרשימות (מומלץ לפני עומס)
- [ ] Redis + Bull Queue – רק כששולחים אלפי SMS בבת אחת
- [ ] PM2 Cluster + Nginx – בעת פריסה לשרת

---

## 📋 סדר עדיפויות – לפני שליחה ללקוח לבדיקה

### ✅ הושלם (יולי 2026)
1. תשתית + Auth + סקרים + נקודות + KYC + אדמין
2. Invitation backend + InvitationsPage + הפצה בטלפונים אחרי יצירה
3. KYC בלי ת.ז. + פדיון כפנייה ידנית + Mesergo SMS
4. פאנל אדמין: משתמשים, הגדרות, מתנות, פדיונות

### 🔴 חובה לפני עלייה ראשונה (MVP ללקוח)
1. **Tags** (backend + AdminTagsPage + שיוך) – כדי להפיץ לפי קהל
2. מילוי `.env` אמיתי + בדיקת SMS מול Mesergo
3. כיבוי מעקף OTP בפרודקשן + סיבוב credentials ישנים
4. בדיקת UX ידנית במובייל (התחברות → KYC → מענה → פדיון → הזמנות)

### 🟡 רצוי לפני / מיד אחרי בדיקת לקוח
5. Referral link למשתמש
6. סקרים שעניתי בדשבורד
7. Audit log בסיסי

### 🔵 Scale מאוחר יותר
8. Pagination / Redis / Bull / PM2 Cluster

---

## 🛠️ שלב ג': הרחבות עתידיות (Out of Scope)
- מכסות מתקדמות לפי חיתוך קהלים מורכב.
- אוטומציית קופונים / ספק חיצוני.
- דוחות וייצוא מתקדמים.
- הרשאות אדמין מרובות.
- אוטומציות נוספות לפי צורך עסקי.
