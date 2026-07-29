#!/bin/bash

# SurveyPro PM2 Stop Script
# סקריפט עצירה למערכת SurveyPro עם PM2

echo "🛑 עוצר את מערכת SurveyPro..."

# עצירת האפליקציה
pm2 stop surveypro

# מחיקת האפליקציה מ-PM2
pm2 delete surveypro

# שמירת התצורה החדשה
pm2 save

echo "✅ SurveyPro נעצר בהצלחה"
echo ""
echo "📊 סטטוס PM2:"
pm2 status
