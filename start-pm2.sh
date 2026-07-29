#!/bin/bash

# SurveyPro PM2 Startup Script
# סקריפט הפעלה למערכת SurveyPro עם PM2

echo "🚀 מתחיל את מערכת SurveyPro עם PM2..."

# יצירת תיקיית לוגים אם לא קיימת
if [ ! -d "./logs" ]; then
    echo "📁 יוצר תיקיית לוגים..."
    mkdir -p ./logs
fi

# בדיקה אם PM2 מותקן
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 לא מותקן. מתקין..."
    npm install -g pm2
fi

# התקנת תלויות אם לא מותקנות
if [ ! -d "./node_modules" ]; then
    echo "📦 מתקין תלויות..."
    npm install
fi

# עצירת אפליקציה קיימת אם קיימת
echo "🛑 עוצר אפליקציה קיימת אם קיימת..."
pm2 stop surveypro 2>/dev/null || true
pm2 delete surveypro 2>/dev/null || true

# הפעלת האפליקציה עם PM2
echo "▶️ מפעיל את SurveyPro עם PM2..."
pm2 start ecosystem.config.js --env production

# שמירת תצורת PM2
echo "💾 שומר תצורת PM2..."
pm2 save

# הגדרת PM2 להפעלה אוטומטית עם השרת
echo "🔧 מגדיר PM2 להפעלה אוטומטית..."
pm2 startup

# הצגת סטטוס
echo "📊 סטטוס האפליקציה:"
pm2 status

echo ""
echo "✅ SurveyPro פועל עם PM2 על פורט 6578"
echo "🌐 גש ל: http://localhost:6578"
echo ""
echo "פקודות שימושיות:"
echo "  npm run pm2:logs    - הצג לוגים"
echo "  npm run pm2:monit   - צג מוניטור"
echo "  npm run pm2:restart - הפעל מחדש"
echo "  npm run pm2:stop    - עצור"
echo ""
echo "🔍 לבדיקת לוגים: pm2 logs surveypro"
echo "📈 למוניטור: pm2 monit"
