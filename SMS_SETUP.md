# מערכת SMS - הוראות התקנה

## תצורה נדרשת

יש להוסיף את המשתנים הבאים לקובץ `.env`:

```bash
# SMS System Configuration
MICROPAY_TOKEN=your_micropay_token_here
MICROPAY_FROM=your_verified_sender_name_or_number
PUBLIC_BASE_URL=https://sekerapp.online

# Optional SMS Alerts
SMS_ALERT_PHONE=0500000000
SMS_ALERT_EMAIL=ops@site.co.il
```

## התקנת תלויות

```bash
npm install better-sqlite3@^9.4.3
```

## מבנה הקבצים

```
pseker/
├── routes/
│   └── sms.js                 # SMS API routes
├── services/
│   ├── micropay.js            # Micropay SMS service
│   ├── linkBuilder.js         # Survey link builder
│   └── campaignStore.js       # Campaign database storage
├── utils/
│   ├── phone.js               # Phone number utilities
│   └── csv.js                 # CSV processing utilities
├── config/
│   └── smsLists.js            # Database list configurations
├── js/
│   └── send_sms.js            # Frontend JavaScript
├── send_sms.html              # SMS sending page
└── data/                      # SQLite database directory
```

## API Endpoints

### SMS Management
- `POST /api/sms/send` - Send SMS campaign
- `POST /api/sms/send-from-db` - Send SMS from database list
- `GET /api/sms/blacklist` - Get blacklisted phones
- `POST /api/sms/blacklist/merge` - Update blacklist
- `GET /api/sms/campaigns/:id/logs` - Get campaign logs
- `GET /api/sms/callback` - Micropay callback

### Pages
- `GET /send_sms?surveyId=<ID>` - SMS sending page

## שימוש

1. **הוספת כפתור SMS**: כפתור "הפץ סקר ב SMS" נוסף לכל סקר בדף הסופר-אדמין
2. **עמוד SMS**: מעבר לעמוד `/send_sms?surveyId=<ID>` עם כל הפונקציונליות
3. **שליחה**: העלאת CSV, ניהול רשימה שחורה, שליחה דרך Micropay

## בדיקות

### בדיקת Micropay Callback
```bash
curl "http://localhost:8765/api/sms/callback?msg=END&tid=123&info=999"
```

### בדיקת שליחת SMS
```bash
curl -X POST http://localhost:8765/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": 15,
    "from": "test",
    "messageTemplate": "שלום! {{survey_link}}",
    "phones": ["0501234567"],
    "validate": true
  }'
```

## הערות חשובות

- הטוקן של Micropay חייב להיות מאומת
- שדה ה-From חייב להיות מאומת במערכת Micropay
- המערכת תומכת בקיצור לינקים דרך שירות Shortl (localhost:5000)
- כל הקבצים נשמרים ב-SQLite מקומי
- אין חשיפת סודות בלוגים
