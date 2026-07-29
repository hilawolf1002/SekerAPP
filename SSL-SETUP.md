# SSL Setup for SekerApp

## בעיית SSL בטלפונים ניידים

הבעיה שאתה נתקל בה היא שגיאת SSL בטלפונים ניידים: `err_ssl_version_or_cipher_mismatch`. זה קורה כי השרת רץ על HTTP ולא על HTTPS.

## פתרונות

### פתרון 1: Let's Encrypt (מומלץ לפרודקשן)

1. **התקן Certbot:**
```bash
sudo apt update
sudo apt install certbot
```

2. **צור SSL certificate:**
```bash
sudo certbot certonly --standalone -d sekerapp.online
```

3. **התקן את השרת מחדש:**
```bash
npm restart
```

### פתרון 2: Self-Signed Certificate (לפיתוח)

1. **צור SSL directory:**
```bash
mkdir ssl
cd ssl
```

2. **צור self-signed certificate:**
```bash
openssl req -x509 -newkey rsa:4096 -keyout private.key -out certificate.crt -days 365 -nodes -subj "/C=IL/ST=Israel/L=Tel Aviv/O=SekerApp/CN=localhost"
```

3. **התקן את השרת מחדש:**
```bash
npm restart
```

### פתרון 3: Nginx Reverse Proxy

אם אתה משתמש ב-Nginx, הוסף את הקונפיגורציה הבאה:

```nginx
server {
    listen 80;
    server_name sekerapp.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sekerapp.online;
    
    ssl_certificate /etc/letsencrypt/live/sekerapp.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sekerapp.online/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## בדיקת SSL

לאחר ההתקנה, בדוק שהכל עובד:

```bash
# בדוק SSL certificate
openssl s_client -connect sekerapp.online:443 -servername sekerapp.online

# בדוק עם nmap
nmap --script ssl-enum-ciphers -p 443 sekerapp.online
```

## פתרון בעיות

### שגיאת "Permission denied"
```bash
sudo chown -R $USER:$USER /etc/letsencrypt/live/sekerapp.online/
sudo chmod 755 /etc/letsencrypt/live/sekerapp.online/
sudo chmod 644 /etc/letsencrypt/live/sekerapp.online/*.pem
```

### SSL certificate expired
```bash
sudo certbot renew
```

### Port 443 already in use
```bash
sudo netstat -tlnp | grep :443
sudo kill -9 <PID>
```

## הערות חשובות

1. **HTTPS הוא חובה** לטלפונים ניידים מודרניים
2. **Let's Encrypt** מספק certificates חינמיים
3. **Self-signed certificates** יגרמו לאזהרות בדפדפן
4. **Port 443** צריך להיות פנוי ל-HTTPS
5. **Firewall** צריך לאפשר תעבורה על port 443

## בדיקת פונקציונליות

לאחר ההתקנה:
1. פתח את האתר בטלפון נייד
2. בדוק שאין שגיאות SSL
3. בדוק שהשליחה עובדת
4. בדוק שה-sessions נשמרים

אם עדיין יש בעיות, בדוק את הלוגים של השרת:
```bash
tail -f logs/server.log
```
