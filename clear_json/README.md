# Survey Phone Validator - מעקב בזמן אמת

## הפעלה רגילה (לבדיקה)
```bash
cd pseker/clear_json
source /home/lior0334/venv/bin/activate
python survey_phone_validator.py
```

## הפעלה עם PM2 (לשימוש קבוע)
```bash
# התקנת PM2 (אם לא מותקן)
npm install -g pm2

# הפעלת הסקריפט
cd pseker/clear_json
pm2 start ecosystem.config.js

# צפייה בלוגים
pm2 logs survey-phone-validator

# צפייה בסטטוס
pm2 status

# עצירת הסקריפט
pm2 stop survey-phone-validator

# הפעלה מחדש
pm2 restart survey-phone-validator

# מחיקת הסקריפט מ-PM2
pm2 delete survey-phone-validator
```

## מה הסקריפט עושה
1. **מעקב בזמן אמת** - בודק עדכונים בקובץ `../data/responses.json` כל דקה
2. **סינון אוטומטי** - מסנן רשומות לא תקינות וכפילויות
3. **בדיקת BigQuery** - בודק אם מספרי הטלפון קיימים במסד הנתונים
4. **עדכון אוטומטי** - מעדכן את הקובץ `responses_cleaned.json` עם רשומות חדשות

## קבצים
- `survey_phone_validator.py` - הסקריפט הראשי
- `ecosystem.config.js` - הגדרות PM2
- `responses_cleaned.json` - קובץ התשובות המנוקות
- `logs/` - תיקיית לוגים

## לוגים
הלוגים נשמרים ב:
- `logs/survey-validator.log` - לוג כללי
- `logs/survey-validator-out.log` - פלט רגיל
- `logs/survey-validator-error.log` - שגיאות
