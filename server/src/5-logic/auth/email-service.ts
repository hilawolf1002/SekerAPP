import { appConfig } from '../../2-utils/config';

/**
 * שליחת מייל פשוט דרך SMTP.
 * אם SMTP_HOST לא מוגדר – מדפיס ללוג (נוח לפיתוח).
 *
 * מותקן: npm install nodemailer + @types/nodemailer
 */

type MailOptions = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(options: MailOptions): Promise<void> {
  const { host, port, user, pass } = appConfig.smtp;

  if (!host || !user) {
    console.log(
      `[DEV EMAIL] to=${options.to}\nSubject: ${options.subject}\n${options.text}`
    );
    return;
  }

  // Dynamic import – nodemailer הוא dependency אופציונלי.
  // אם לא מותקן – ממשיך עם לוג בלבד.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const nodemailer = require('nodemailer') as {
      createTransport: (opts: object) => {
        sendMail: (opts: object) => Promise<void>;
      };
    };
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: user,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Cannot find module 'nodemailer'")) {
      console.warn('[email-service] nodemailer not installed. Email not sent:', options.subject);
      console.log(`[EMAIL FALLBACK] to=${options.to}\n${options.text}`);
    } else {
      throw err;
    }
  }
}

/**
 * שולח התראה לאדמין על בקשת פדיון חדשה.
 */
export async function notifyAdminRedemption(params: {
  userName: string;
  userPhone: string;
  userEmail: string;
  pointsSpent: number;
  redemptionId: string;
}): Promise<void> {
  const adminEmail = appConfig.adminEmail;
  if (!adminEmail) {
    console.log(
      `[DEV REDEMPTION] פנייה חדשה:\n` +
      `שם: ${params.userName}\nטלפון: ${params.userPhone}\n` +
      `מייל לשליחת קופון: ${params.userEmail}\n` +
      `נקודות: ${params.pointsSpent}\nמזהה פנייה: ${params.redemptionId}`
    );
    return;
  }

  await sendEmail({
    to: adminEmail,
    subject: `SekerApp – בקשת פדיון חדשה מ-${params.userName}`,
    text:
      `התקבלה בקשת פדיון חדשה:\n\n` +
      `שם: ${params.userName}\n` +
      `טלפון: ${params.userPhone}\n` +
      `כתובת מייל לשליחת קופון: ${params.userEmail}\n` +
      `נקודות שנצברו: ${params.pointsSpent}\n` +
      `מזהה פנייה: ${params.redemptionId}\n\n` +
      `משתמש זה זכאי לקופון. יש לשלוח קופון למייל שלעיל ולסמן כ-מטופל בפאנל האדמין.\n` +
      `לאחר הטיפול, תמונת תעודת הזהות תימחק אוטומטית.`,
  });
}
