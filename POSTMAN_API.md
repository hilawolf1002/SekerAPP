# קריאות מוכנות ל-Postman – SekerApp API

בסיס: `http://localhost:5000`  
בכל בקשה עם Body: **Body → raw → JSON** + Header `Content-Type: application/json`

טיפ: צרי Collection ב-Postman, ואחרי Login שמרי Cookie `sekerapp_token` אוטומטית (Settings → Cookies).  
אפשר גם להעתיק את ה-Cookie ידנית ל-Header: `Cookie: sekerapp_token=...`

למען נוחות בדיקה בלי SMS, אפשר זמנית ב-`server/.env`:
`OTP_DELIVERY=console`
ואז הקוד יופיע בתשובת השרת בשדה `devCode` / בקונסול.

---

## 1) Health
**GET** `http://localhost:5000/health`

---

## 2) בקשת OTP
**POST** `http://localhost:5000/api/auth/otp/request`

```json
{
  "phone": "0501234567"
}
```

---

## 3) אימות OTP (התחברות)
**POST** `http://localhost:5000/api/auth/otp/verify`

```json
{
  "phone": "0501234567",
  "code": "123456"
}
```

אחרי הצלחה נשמר Cookie. השתמשי באותו Session ב-Postman לבקשות הבאות.

---

## 4) מי אני
**GET** `http://localhost:5000/api/auth/me`

---

## 5) יצירת סקר
**POST** `http://localhost:5000/api/surveys`  
(דורש Cookie / התחברות)

```json
{
  "title": "סקר בדיקה",
  "description": "סקר לדוגמה",
  "publish": true,
  "isRewarded": true,
  "rewardPoints": 50,
  "timeLimitMinutes": 10,
  "maxResponses": 100,
  "thankYouMessage": "תודה על המענה!",
  "questions": [
    {
      "questionText": "מה הצבע האהוב עליך?",
      "allowMultiple": false,
      "answers": ["כחול", "ירוק", "אדום"]
    },
    {
      "questionText": "באילו תחומים אתה מתעניין?",
      "allowMultiple": true,
      "answers": ["טכנולוגיה", "ספורט", "בישול"]
    }
  ]
}
```

שמרי את `survey.id` מהתשובה לשימוש בהמשך.

---

## 6) רשימת הסקרים שלי
**GET** `http://localhost:5000/api/surveys/my`

---

## 7) קבלת סקר לפי מזהה (למענה)
**GET** `http://localhost:5000/api/surveys/{{SURVEY_ID}}`

---

## 8) התחלת מענה (נעילת זמן)
**POST** `http://localhost:5000/api/surveys/{{SURVEY_ID}}/start`  
Body: ריק / `{}`

התשובה כוללת `expiresAt` – עד מתי אפשר להשלים.

---

## 9) השלמת מענה
**POST** `http://localhost:5000/api/surveys/{{SURVEY_ID}}/complete`

```json
{
  "answers": [
    "כחול",
    ["טכנולוגיה", "ספורט"]
  ]
}
```

הערות:
- סדר התשובות = סדר השאלות
- שאלה רגילה: מחרוזת אחת
- שאלה עם `allowMultiple: true`: מערך מחרוזות
- הטקסט חייב להתאים בדיוק לאחת האפשרויות בסקר

---

## 10) סטטיסטיקות (ליוצר הסקר)
**GET** `http://localhost:5000/api/surveys/{{SURVEY_ID}}/stats`

---

## 11) שינוי סטטוס סקר
**PATCH** `http://localhost:5000/api/surveys/{{SURVEY_ID}}/status`

```json
{
  "status": "CLOSED"
}
```

ערכים אפשריים: `DRAFT` | `ACTIVE` | `CLOSED`

---

## 12) התנתקות
**POST** `http://localhost:5000/api/auth/logout`

---

### סדר בדיקה מומלץ
1 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 10
