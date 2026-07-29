# SurveyPro API Endpoints Documentation

מסמך זה מתעד את כל נקודות הקצה (endpoints) של ה-API של מערכת SurveyPro. המסמך מתעדכן באופן שוטף עם הוספת או שינוי נקודות קצה חדשות.

## 📋 תוכן עניינים

- [אימות משתמשים](#אימות-משתמשים)
- [ניהול סקרים](#ניהול-סקרים)
- [תשובות לסקרים](#תשובות-לסקרים)
- [ניהול מערכת](#ניהול-מערכת)
- [לינקים מקוצרים](#לינקים-מקוצרים)
- [סטטיסטיקות](#סטטיסטיקות)
- [קודי תגובה](#קודי-תגובה)
- [דוגמאות שימוש](#דוגמאות-שימוש)

---

## 🔐 אימות משתמשים

### הרשמת משתמש חדש
- **URL:** `POST /api/auth/register`
- **תיאור:** יצירת חשבון משתמש חדש במערכת
- **הרשאות:** אין צורך באימות
- **Body:**
```json
{
  "username": "string",
  "email": "string",
  "fullName": "string",
  "password": "string"
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "ההרשמה הושלמה בהצלחה",
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com",
    "fullName": "יוסי כהן",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-07-20T10:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### התחברות משתמש
- **URL:** `POST /api/auth/login`
- **תיאור:** התחברות למערכת עם שם משתמש/אימייל וסיסמה
- **הרשאות:** אין צורך באימות
- **Body:**
```json
{
  "username": "string",
  "password": "string"
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "ההתחברות הושלמה בהצלחה",
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com",
    "fullName": "יוסי כהן",
    "role": "user"
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

### רענון טוקן
- **URL:** `POST /api/auth/refresh`
- **תיאור:** קבלת טוקן גישה חדש באמצעות טוקן רענון
- **הרשאות:** אין צורך באימות
- **Body:**
```json
{
  "refreshToken": "string"
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "token": "new_jwt_token_here"
}
```

### קבלת פרופיל משתמש
- **URL:** `GET /api/auth/profile`
- **תיאור:** קבלת פרטי הפרופיל של המשתמש המחובר
- **הרשאות:** דורש אימות JWT
- **Headers:** `Authorization: Bearer <token>`
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com",
    "fullName": "יוסי כהן",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-07-20T10:00:00.000Z",
    "lastLogin": "2024-07-20T15:30:00.000Z"
  }
}
```

### עדכון פרופיל משתמש
- **URL:** `PUT /api/auth/profile`
- **תיאור:** עדכון פרטי הפרופיל של המשתמש המחובר
- **הרשאות:** דורש אימות JWT
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string"
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "הפרופיל עודכן בהצלחה",
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com",
    "fullName": "יוסי כהן חדש",
    "role": "user"
  }
}
```

---

## 📊 ניהול סקרים

### יצירת סקר חדש
- **URL:** `POST /api/surveys/create`
- **תיאור:** יצירת סקר חדש על ידי משתמש מחובר (תומך בשאלה אחת או מספר שאלות)
- **הרשאות:** דורש אימות JWT
- **Headers:** `Authorization: Bearer <token>`
- **Body (multipart/form-data):**

#### סקר עם שאלה אחת (backward compatibility):
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "isMultiQuestion": "false",
  "question": "string",
  "answers": ["string"],
  "thankYouMessage": "string",
  "requirePhone": "boolean",
  "image": "file (optional)"
}
```

#### סקר עם מספר שאלות:
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "isMultiQuestion": "true",
  "questions": [
    {
      "questionText": "string",
      "answers": ["string"]
    }
  ],
  "thankYouMessage": "string",
  "requirePhone": "boolean",
  "image": "file (optional)"
}
```

- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "הסקר נוצר בהצלחה",
  "surveyId": 1,
  "survey": {
    "id": 1,
    "title": "סקר שביעות רצון",
    "description": "תיאור הסקר",
    "category": "חברתי",
    "isMultiQuestion": false,
    "question": "איך אתה מעריך את השירות?",
    "answers": [
      {"id": 1, "text": "מעולה", "votes": 0},
      {"id": 2, "text": "טוב", "votes": 0}
    ],
    "status": "active",
    "responses": 0,
    "createdAt": "2024-07-20T10:00:00.000Z"
  }
}
```

### קבלת סקרים ציבוריים
- **URL:** `GET /api/surveys`
- **תיאור:** קבלת רשימת כל הסקרים הציבוריים והפעילים
- **הרשאות:** אין צורך באימות
- **Query Parameters:**
  - `page` (אופציונלי): מספר העמוד (ברירת מחדל: 1)
  - `limit` (אופציונלי): מספר הסקרים לעמוד (ברירת מחדל: 10)
  - `category` (אופציונלי): סינון לפי קטגוריה
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "surveys": [
    {
      "id": 1,
      "title": "סקר שביעות רצון",
      "description": "תיאור הסקר",
      "category": "שביעות רצון",
      "responses": 150,
      "createdAt": "2024-07-20T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### קבלת הסקרים שלי
- **URL:** `GET /api/surveys/my`
- **תיאור:** קבלת רשימת הסקרים שיצר המשתמש המחובר
- **הרשאות:** דורש אימות JWT
- **Headers:** `Authorization: Bearer <token>`
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "surveys": [
    {
      "id": 1,
      "title": "סקר שביעות רצון",
      "description": "תיאור הסקר",
      "status": "active",
      "responses": 150,
      "createdAt": "2024-07-20T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### קבלת סקר לפי מזהה
- **URL:** `GET /api/surveys/:id`
- **תיאור:** קבלת פרטי סקר ספציפי לפי מזהה
- **הרשאות:** אין צורך באימות
- **Parameters:** `id` - מזהה הסקר
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "survey": {
    "id": 1,
    "title": "סקר שביעות רצון",
    "description": "תיאור הסקר",
    "category": "שביעות רצון",
    "status": "active",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "text": "איך היית מדרג את השירות?",
        "options": ["מצוין", "טוב", "סביר", "גרוע"],
        "required": true
      }
    ],
    "responses": 150,
    "createdAt": "2024-07-20T10:00:00.000Z"
  }
}
```

### עדכון סקר
- **URL:** `PUT /api/surveys/:id`
- **תיאור:** עדכון סקר קיים (רק על ידי יוצר הסקר)
- **הרשאות:** דורש אימות JWT + בעלות על הסקר
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה הסקר
- **Body:** זהה ליצירת סקר (כל השדות אופציונליים)
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "הסקר עודכן בהצלחה",
  "survey": {
    "id": 1,
    "title": "סקר שביעות רצון מעודכן",
    "updatedAt": "2024-07-20T16:00:00.000Z"
  }
}
```

### מחיקת סקר
- **URL:** `DELETE /api/surveys/:id`
- **תיאור:** מחיקת סקר (רק על ידי יוצר הסקר)
- **הרשאות:** דורש אימות JWT + בעלות על הסקר
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה הסקר
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "הסקר נמחק בהצלחה"
}
```

---

## 📝 תשובות לסקרים

### שליחת תשובה לסקר
- **URL:** `POST /api/surveys/:id/answer`
- **תיאור:** שליחת תשובה לסקר (תומך בשאלה אחת או מספר שאלות)
- **הרשאות:** אופציונלי (אם יש טוקן, התשובה תהיה מזוהה)
- **Headers:** `Authorization: Bearer <token>` (אופציונלי)
- **Parameters:** `id` - מזהה הסקר
- **Body:**

#### סקר עם שאלה אחת (backward compatibility):
```json
{
  "answer": "מצוין",
  "surveyUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567"
}
```

#### סקר עם מספר שאלות:
```json
{
  "answers": ["מצוין", "5", "כן"],
  "surveyUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567"
}
```

- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "התשובה נשלחה בהצלחה",
  "responseId": 1
}
```

### קבלת תשובות לסקר
- **URL:** `GET /api/surveys/:id/responses`
- **תיאור:** קבלת כל התשובות לסקר (רק ליוצר הסקר)
- **הרשאות:** דורש אימות JWT + בעלות על הסקר
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה הסקר
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "responses": [
    {
      "id": 1,
      "surveyId": 1,
      "userId": null,
      "surveyUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567",
      "answers": [
        {
          "questionId": 1,
          "answer": "מצוין"
        }
      ],
      "submittedAt": "2024-07-20T15:30:00.000Z"
    }
  ],
  "total": 1
}
```

### קבלת סטטיסטיקות סקר
- **URL:** `GET /api/surveys/:id/stats`
- **תיאור:** קבלת סטטיסטיקות מפורטות של הסקר (רק ליוצר הסקר)
- **הרשאות:** דורש אימות JWT + בעלות על הסקר
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה הסקר
- **תגובה מוצלחת:**

#### סקר עם שאלה אחת:
```json
{
  "success": true,
  "stats": {
    "totalResponses": 150,
    "completionRate": 100,
    "answerStats": [
      {
        "answerId": 1,
        "answerText": "מצוין",
        "responseCount": 75,
        "percentage": 50
      },
      {
        "answerId": 2,
        "answerText": "טוב",
        "responseCount": 45,
        "percentage": 30
      }
    ]
  }
}
```

#### סקר עם מספר שאלות:
```json
{
  "success": true,
  "stats": {
    "totalResponses": 150,
    "completionRate": 100,
    "answerStats": [
      {
        "questionId": 1,
        "questionText": "איך היית מדרג את השירות?",
        "answerStats": [
          {
            "answerId": 1,
            "answerText": "מצוין",
            "responseCount": 75,
            "percentage": 50
          }
        ]
      },
      {
        "questionId": 2,
        "questionText": "האם תמליץ על השירות?",
        "answerStats": [
          {
            "answerId": 1,
            "answerText": "כן",
            "responseCount": 120,
            "percentage": 80
          }
        ]
      }
    ]
  }
}
```

### ייצוא נתוני סקר
- **URL:** `GET /api/surveys/:id/export`
- **תיאור:** ייצוא נתוני הסקר לפורמט Excel (רק ליוצר הסקר)
- **הרשאות:** דורש אימות JWT + בעלות על הסקר
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה הסקר
- **תגובה מוצלחת:**

#### סקר עם שאלה אחת:
```json
{
  "success": true,
  "message": "הנתונים מוכנים לייצוא",
  "data": {
    "surveyInfo": {
      "title": "סקר שביעות רצון",
      "description": "תיאור הסקר",
      "category": "חברתי",
      "question": "איך היית מדרג את השירות?",
      "isMultiQuestion": false,
      "requirePhone": false,
      "totalResponses": 150,
      "exportDate": "2024-07-20T16:00:00.000Z"
    },
    "answers": [
      {
        "answerId": 1,
        "answerText": "מצוין",
        "votes": 75,
        "percentage": 50
      }
    ],
    "responses": [
      {
        "responseId": 1,
        "userId": null,
        "answer": "מצוין",
        "submittedAt": "2024-07-20T15:30:00.000Z",
        "sourceUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567",
        "surveyUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567"
      }
    ]
  }
}
```

#### סקר עם מספר שאלות:
```json
{
  "success": true,
  "message": "הנתונים מוכנים לייצוא",
  "data": {
    "surveyInfo": {
      "title": "סקר שביעות רצון",
      "description": "תיאור הסקר",
      "category": "חברתי",
      "isMultiQuestion": true,
      "totalQuestions": 2,
      "requirePhone": false,
      "totalResponses": 150,
      "exportDate": "2024-07-20T16:00:00.000Z"
    },
    "questions": [
      {
        "questionId": 1,
        "questionText": "איך היית מדרג את השירות?",
        "answers": [
          {
            "answerId": 1,
            "answerText": "מצוין",
            "votes": 75,
            "percentage": 50
          }
        ]
      }
    ],
    "responses": [
      {
        "responseId": 1,
        "userId": null,
        "answers": [
          {
            "questionId": 1,
            "answer": "מצוין"
          },
          {
            "questionId": 2,
            "answer": "כן"
          }
        ],
        "submittedAt": "2024-07-20T15:30:00.000Z",
        "sourceUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567",
        "surveyUrl": "https://sekerapp.online/survey/123?mp_phone=972501234567"
      }
    ]
  }
}
```

---

## 👑 ניהול מערכת

### קבלת כל המשתמשים
- **URL:** `GET /api/admin/users`
- **תיאור:** קבלת רשימת כל המשתמשים במערכת (סופראדמין בלבד)
- **הרשאות:** דורש אימות JWT + תפקיד סופראדמין
- **Headers:** `Authorization: Bearer <token>`
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@surveypro.com",
      "fullName": "מנהל מערכת",
      "role": "superadmin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### קבלת כל הסקרים
- **URL:** `GET /api/admin/surveys`
- **תיאור:** קבלת רשימת כל הסקרים במערכת (סופראדמין בלבד)
- **הרשאות:** דורש אימות JWT + תפקיד סופראדמין
- **Headers:** `Authorization: Bearer <token>`
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "surveys": [
    {
      "id": 1,
      "title": "סקר שביעות רצון",
      "creatorName": "יוסי כהן",
      "status": "active",
      "responses": 150,
      "createdAt": "2024-07-20T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### עדכון סטטוס משתמש
- **URL:** `PUT /api/admin/users/:id/status`
- **תיאור:** הפעלה/השעיה של משתמש (סופראדמין בלבד)
- **הרשאות:** דורש אימות JWT + תפקיד סופראדמין
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה המשתמש
- **Body:**
```json
{
  "isActive": false
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "המשתמש הושעה בהצלחה"
}
```

### מחיקת משתמש
- **URL:** `DELETE /api/admin/users/:id`
- **תיאור:** מחיקת משתמש מהמערכת (סופראדמין בלבד)
- **הרשאות:** דורש אימות JWT + תפקיד סופראדמין
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `id` - מזהה המשתמש
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "המשתמש נמחק בהצלחה"
}
```

---

## 🔗 לינקים מקוצרים

### יצירת לינק מקוצר
- **URL:** `POST /api/short-links/store`
- **תיאור:** יצירת לינק מקוצר חדש במערכת
- **הרשאות:** דורש אימות סשן
- **Body:**
```json
{
  "short_code": "abc123",
  "original_url": "https://sekerapp.online/survey/15?mp_phone=972524200311",
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "short_code": "abc123",
  "message": "Short link stored successfully"
}
```

### הפניה ללינק מקוצר
- **URL:** `GET /s/:shortCode`
- **תיאור:** הפניה אוטומטית ללינק המקורי דרך הלינק המקוצר
- **הרשאות:** אין צורך באימות
- **Parameters:** `shortCode` - הקוד הקצר של הלינק
- **תגובה:** הפניה אוטומטית ללינק המקורי

### קבלת סטטיסטיקות לינק מקוצר
- **URL:** `GET /api/short-links/stats/:shortCode`
- **תיאור:** קבלת מידע על לינק מקוצר כולל מספר לחיצות
- **הרשאות:** דורש אימות סשן
- **Parameters:** `shortCode` - הקוד הקצר של הלינק
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "short_code": "abc123",
  "original_url": "https://sekerapp.online/survey/15?mp_phone=972524200311",
  "created_at": "2024-01-01T00:00:00.000Z",
  "expires_at": "2024-12-31T23:59:59.000Z",
  "hits": 42,
  "last_accessed": "2024-01-15T10:30:00.000Z"
}
```

### רשימת כל הלינקים המקוצרים
- **URL:** `GET /api/short-links/list/all`
- **תיאור:** קבלת רשימת כל הלינקים המקוצרים במערכת
- **הרשאות:** דורש אימות סשן
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "total": 2,
  "links": [
    {
      "short_code": "abc123",
      "original_url": "https://sekerapp.online/survey/15?mp_phone=972524200311",
      "created_at": "2024-01-01T00:00:00.000Z",
      "expires_at": "2024-12-31T23:59:59.000Z",
      "hits": 42,
      "last_accessed": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### מחיקת לינק מקוצר
- **URL:** `DELETE /api/short-links/:shortCode`
- **תיאור:** מחיקת לינק מקוצר מהמערכת
- **הרשאות:** דורש אימות סשן
- **Parameters:** `shortCode` - הקוד הקצר של הלינק
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "message": "Short link deleted successfully"
}
```

---

## 📈 סטטיסטיקות

### סקירה כללית של המערכת
- **URL:** `GET /api/stats/overview`
- **תיאור:** קבלת סטטיסטיקות כלליות של המערכת
- **הרשאות:** דורש אימות JWT
- **Headers:** `Authorization: Bearer <token>`
- **תגובה מוצלחת:**
```json
{
  "success": true,
  "users": {
    "totalUsers": 2847,
    "activeUsers": 2750,
    "suspendedUsers": 97,
    "newUsersThisMonth": 156
  },
  "surveys": {
    "totalSurveys": 156,
    "activeSurveys": 142,
    "totalResponses": 45892,
    "surveysThisMonth": 23,
    "averageResponsesPerSurvey": 294
  }
}
```

---

## 🔢 קודי תגובה

### קודי הצלחה
- `200 OK` -שה הושלמה בהצלחה
- `201 Created` - משאב נוצר בהצלחה
- `204 No Content` -שה הושלמה ללא תוכן

### קודי שגיאה
- `400 Bad Request` -שה לא תקינה
- `401 Unauthorized` - לא מורשה (חסר טוקן)
- `403 Forbidden` - אסור (חסרות הרשאות)
- `404 Not Found` - משאב לא נמצא
- `429 Too Many Requests` - יותר מדי בקשות
- `500 Internal Server Error` - שגיאה פנימית בשרת

---

## 💡 דוגמאות שימוש

### דוגמה 1: יצירת סקר חדש
```javascript
const createSurvey = async () => {
  const response = await fetch('/api/surveys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'סקר שביעות רצון לקוחות',
      description: 'סקר לבדיקת שביעות רצון מהשירות',
      category: 'שביעות רצון',
      questions: [
        {
          type: 'multiple_choice',
          text: 'איך היית מדרג את השירות?',
          options: ['מצוין', 'טוב', 'סביר', 'גרוע'],
          required: true
        }
      ]
    })
  });
  
  const result = await response.json();
  console.log(result);
};
```

### דוגמה 2: שליחת תשובה לסקר
```javascript
const submitResponse = async (surveyId, answers) => {
  const response = await fetch(`/api/surveys/${surveyId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ answers })
  });
  
  const result = await response.json();
  console.log(result);
};
```

### דוגמה 3: קבלת סטטיסטיקות
```javascript
const getSurveyStats = async (surveyId) => {
  const response = await fetch(`/api/surveys/${surveyId}/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  console.log(result.stats);
};
```

---

## 📝 הערות חשובות

1. **אימות:** רוב נקודות הקצה דורשות טוקן JWT תקין
2. **הרשאות:** חלק מהפעולות דורשות תפקיד ספציפי
3. **עברית:** כל הטקסטים במערכת בעברית עם תמיכה ב-RTL
4. **שגיאות:** כל השגיאות מוחזרות בעברית
5. **תאריכים:** כל התאריכים בפורמט ISO 8601

---

## 🔄 עדכונים אחרונים

- **20/07/2024** - יצירת המסמך הראשוני
- **20/07/2024** - הוספת כל נקודות הקצה הבסיסיות
- **20/07/2024** - הוספת דוגמאות שימוש

---

**מסמך זה מתעדכן באופן שוטף עם הוספת תכונות חדשות למערכת**
