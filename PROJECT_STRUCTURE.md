# מבנה הפרויקט: מערכת חדשה מול מערכת ישנה

מסמך זה מפריד בין **מה שאנחנו בונים עכשיו** לבין **שאריות המערכת הישנה** שנשארו בפרויקט כרפרנס בלבד.

**כלל אצבע:**
| אם זה… | זה… |
|--------|-----|
| בתוך `client/` או `server/` | **חדש** – הקוד הפעיל |
| בשורש הפרויקט כ־HTML/JS / `data/` / `client_old_jsx/` | **ישן** – לא חלק מהרצה השוטפת |

---

## המערכת החדשה (פעילה)

### תיקיות ראשיות

| תיקייה | תפקיד |
|--------|--------|
| `client/` | React + Vite + TypeScript (ממשק משתמש) |
| `server/` | Express + TypeScript + Prisma (API ומסד נתונים) |

### קבצים ברמת השורש (חדשים)

| קובץ | תפקיד |
|------|--------|
| `package.json` | מריץ client + server ביחד (`npm run dev`) + פקודות DB |
| `compose.yml` | הגדרת Docker Compose למסד נתונים PostgreSQL מקומי |
| `REFACTOR_CHECKLIST.md` | צ'קליסט פיתוח לפי האפיון |
| `POSTMAN_API.md` | דוגמאות קריאות API |
| `PROJECT_STRUCTURE.md` | המסמך הזה |
| `.gitignore` | מגן על .env, private-uploads/, קבצי credentials ישנים |

### `client/` – מבנה

```
client/
  index.html
  package.json
  vite.config.ts
  public/                 לוגו ונכסים סטטיים
  src/
    main.tsx
    App.tsx
    index.css
    Context/
      AuthContext.tsx     משתמש מחובר
      ToastContext.tsx    התראות Toast
      Toast.css
    Models/
      UserModel.ts
      SurveyModel.ts
    Services/
      api.ts              Axios משותף
      authService.ts
      surveyService.ts
      pointsService.ts
      kycService.ts       שליחת בקשת KYC
      adminService.ts     כל API calls של האדמין
    Utils/
      genderText.ts       התאמת ניסוח לפי מין
      useGender.ts
    components/
      LayoutArea/
        AppRoutes.tsx     ניתוב
      AuthArea/
        LoginPage.tsx
        LoginPage.css
        PrivateRoute.tsx
      HomeArea/
        HomePage.tsx
        HomePage.css
        LandingPage.tsx
      SurveyArea/
        SurveysListPage.tsx
        CreateSurveyPage.tsx
        AnswerSurveyPage.tsx
        SurveyStatsPage.tsx
        survey-shared.css
        (+ קבצי CSS ייעודיים)
      PointsArea/
        PointsDashboardPage.tsx
        PointsDashboardPage.css
      KycArea/
        KycRegistrationPage.tsx
        KycRegistrationPage.css
      AdminArea/
        AdminLoginPage.tsx / .css
        AdminDashboardPage.tsx / .css
        AdminPendingApprovalsPage.tsx / .css
        AdminUsersPage.tsx / .css
        AdminSettingsPage.tsx / .css   יעד פדיון + בונוסים
        AdminGiftsPage.tsx / .css      חנויות + מלאי קופונים
        AdminRedemptionsPage.tsx / .css
        AdminRoute.tsx
```

### `server/` – מבנה

```
server/
  package.json
  .env                    סודות מקומיים (לא ב-git)
  .env.example
  prisma/
    schema.prisma
    migrations/           init, add_auth_otp
  src/
    index.ts              נקודת כניסה
    app.ts                Express app
    2-utils/
      config.ts
      dal.ts              Prisma Client
      app-error.ts
    3-middleware/
      auth-middleware.ts
      validate-middleware.ts
      error-middleware.ts
    4-models/
      auth-schemas.ts
      survey-schemas.ts
      admin-schemas.ts         הגדרות / מתנות / פדיון / סטטוס משתמש
    5-logic/
      auth/
        auth-logic.ts          OTP + התחברות אדמין
        sms-service.ts         שליחת SMS (Micropay)
        kyc-logic.ts           שאלון KYC ואחסון ת.ז. פרטי בפיתוח
      surveys/
        survey-logic.ts
        survey-image-logic.ts  העלאת תמונת סקר
      points/
        points-logic.ts
      admin/
        admin-logic.ts         ניהול עונים, אישור/דחייה, SMS
        settings-redemption-logic.ts  הגדרות, מתנות, קופונים, פדיון
    6-controllers/
      auth/
        auth-controller.ts     כולל POST /api/auth/admin/login
      surveys/
        survey-controller.ts
      points/
        points-controller.ts   כולל /gifts + /redeem
      admin/
        admin-controller.ts    settings, gifts, users, redemptions
```

### איך מריצים את החדש

**הערה:** יש לוודא שDocker Desktop פעיל לפני הרצת המערכת (למסד הנתונים).

```bash
# מהשורש, בפעם הראשונה
npm install
npm run install:all
npm run db:up          # הפעלת PostgreSQL דרך Docker
npm run db:migrate     # הרצת Migrations

# בכל הפעלה רגילה (אחרי ש-Docker Desktop פעיל)
npm run db:up
npm run dev

# או בנפרד:
# server → http://localhost:5000
# client → http://localhost:3000
```

דרוש Docker Desktop. הקובץ `compose.yml` מרים PostgreSQL מקומי בשם
`sekerapp-db`. ניתן לפתוח את הנתונים עם `npm run db:studio`.

מסמכי KYC בפיתוח נשמרים ב-`server/private-uploads/kyc` בלבד. התיקייה פרטית,
אינה מוגשת דרך Express ונמצאת ב-`.gitignore`. לפני production יש להעביר ל-S3 Private.

---

## המערכת הישנה (לרפרנס בלבד – לא לפיתוח השוטף)

הקבצים והתיקיות האלה שייכים לגרסה המבולגנת הקודמת.  
הם **לא** חלק מה־stack החדש, ומשמשים בעיקר להשוואת עיצוב / לוגיקה ישנה.

### תיקיות ישנות

| תיקייה | מה זה |
|--------|--------|
| `client_old_jsx/` | ניסיון React ישן (לא ה־`client/` החדש) |
| `routes/` | נתיבי API ישנים (למשל short-links) |
| `config/` | הגדרות ישנות |
| `services/` | שירותים ישנים |
| `utils/` | עזרים ישנים |
| `js/` | סקריפטים ישנים |
| `data/` | נתוני JSON / DB ישנים |
| `clear_json/` | קבצי ניקוי/נתונים ישנים |

### קבצי ליבה ישנים (בשורש)

- `server.js` — השרת הישן הגדול (Express מונוליתי)
- `polls.js` — ניהול סקרים ב־JSON
- `auth.js`, `users.js`, `config.js`
- `chart.js`, `ssl-config.js`
- `ecosystem.config.js` — PM2
- סקריפטים שונים: `health-check.js`, `create-primaries-survey.js`, `survey-15-tracker.js` וכו'

### דפי HTML ישנים

- התחברות / בית: `login.html`, `register.html`, `home.html`
- סקרים: `survey.html`, `create-survey.html`, `surveys.html`
- דשבורד / אדמין: `dashboard.html`, `s-admin.html`
- דפי סקר ספציפיים: `survey-21.html`, `survey-dashboard-15.html` וכו'
- תוכן כללי: `about.html`, `faq.html`, `help.html`, `privacy.html`, `terms.html`, `cookies.html`
- SMS / WhatsApp: `send_sms.html`, `whatsapp-rotation.html` וכו'

### נתונים ונכסים ישנים

- `data/` — `surveys`, `users`, `responses`, `short-links`, CSV וכו'
- `logo.png` ונכסי תמונה בשורש
- קבצי `.env` / credentials ישנים (אם קיימים בשורש)

### תיעוד ופריסה ישנים

- `README.md`, `API_ENDPOINTS.md`, `PROJECT_DOCUMENTATION.md`
- `PRODUCTION_DEPLOYMENT.md`, `SMS_SETUP.md`, `SSL-SETUP.md`
- `deploy.sh`, `start-pm2.sh`, `nginx-*.conf`, `surveypro.service`
- `package_old.json` (אם קיים)

---

## מה חשוב לזכור

1. **עובדים רק ב־`client/` ו־`server/`.**
2. הישן נשאר כדי להעתיק עיצוב / להבין התנהגות קודמת — לא כדי להריץ אותו בפיתוח החדש.
3. אחרי שהמערכת החדשה יציבה בפרודקשן, אפשר לשקול ארכוב/מחיקה של התיקיות הישנות (בזהירות, אחרי גיבוי).
4. מעקב התקדמות לפי אפיון: `REFACTOR_CHECKLIST.md`.
