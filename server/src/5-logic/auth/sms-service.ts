import https from 'https';
import { appConfig } from '../../2-utils/config';
import { AppError } from '../../2-utils/app-error';

/**
 * בניית XML לספק Mesergo (Inforu).
 * https://uapi.mesergo.co.il/SendMessageXml.ashx
 */
function buildMesergoXml(phone: string, message: string): string {
  // הימנעות מהזרקת XML – נסתר תווים מיוחדים
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const { username, token, sender } = appConfig.sms;
  return (
    `<InforuRoot><Inforu>` +
    `<User><Username>${escapeXml(username)}</Username><ApiToken>${escapeXml(token)}</ApiToken></User>` +
    `<Content Type="sms"><Message>${escapeXml(message)}</Message></Content>` +
    `<Recipients><PhoneNumber>${escapeXml(phone)}</PhoneNumber></Recipients>` +
    `<Settings><Sender>${escapeXml(sender)}</Sender></Settings>` +
    `</Inforu></InforuRoot>`
  );
}

async function callMesergo(phone: string, message: string): Promise<void> {
  const { username, token } = appConfig.sms;
  if (!username || !token) {
    throw new AppError('שירות SMS לא מוגדר בשרת. פני למנהל המערכת.', 503);
  }

  const xml = buildMesergoXml(phone, message);
  const body = `INFORUXML=${encodeURIComponent(xml)}`;

  const raw = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'uapi.mesergo.co.il',
        path: '/SendMessageXml.ashx',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Mesergo HTTP status ${res.statusCode ?? 'unknown'}: ${data}`));
            return;
          }
          resolve(data);
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });

  // Mesergo מחזיר XML – שגיאה מכילה Status != 1
  if (/<Status>0<\/Status>/i.test(raw) || /<Error>/i.test(raw)) {
    console.error('[Mesergo SMS] failed response:', raw);
    throw new AppError('שליחת ה-SMS נכשלה. נסי שוב בעוד רגע.', 502);
  }
}

/**
 * שליחת SMS לקוד OTP.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const msg = `קוד האימות שלך ב-SekerApp: ${code}`;
  await callMesergo(phone, msg);
}

/**
 * שליחת SMS כללי (אישור KYC, הזמנות וכו').
 * כש-OTP_DELIVERY=console – מדפיס ללוג בלבד (פיתוח מקומי).
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  if (appConfig.otp.delivery === 'console') {
    console.log(`[DEV SMS console] to=${phone}\n${message}`);
    return;
  }
  await callMesergo(phone, message);
}
