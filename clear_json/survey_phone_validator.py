import json
import re
import os
import time
import hashlib
from urllib.parse import urlparse, parse_qs
import logging
from google.cloud import bigquery
from google.oauth2 import service_account

# הגדרת לוגים
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('survey_validator.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SurveyPhoneValidator:
    def __init__(self):
        # הגדרות BigQuery
        self.PROJECT_ID = "lllll-465115"
        self.DATASET_ID = "wolfscan_data1"
        self.TABLE_NAME = "Israel_data"
        
        # מטמון לטלפונים שכבר נבדקו
        self.phone_cache = {}
        self.bigquery_client = None
        
        # מעקב אחרי רשומות שכבר עובדו
        self.processed_entries = set()
        
        # מטמון לטלפונים לא תקינים שכבר נבדקו
        self.invalid_phones_cache = set()
        
        # מטמון לטלפונים שכבר נשלחו לבדיקת BigQuery
        self.bigquery_checked_phones = set()
        
        # יצירת BigQuery client
        self.init_bigquery_client()
        
        # טעינת מטמון קיים - חייב להיות אחרי יצירת ה-client
        # המטמון נטען תמיד, גם אם BigQuery לא זמין
        cache_loaded = self.load_bigquery_cache()
        if cache_loaded:
            logger.info(f"נטען מטמון BigQuery: {len(self.bigquery_checked_phones)} טלפונים")
            logger.info(f"נטען מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
        else:
            logger.info("לא נמצא מטמון קיים - מתחיל עם מטמון ריק")
            logger.info(f"מטמון BigQuery: {len(self.bigquery_checked_phones)} טלפונים")
            logger.info(f"מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
    
    def normalize_phone(self, phone):
        """נרמול מספר טלפון לפורמט אחיד: 972XXXXXXXXX"""
        if not phone:
            return None
        
        # הסרת תווים מיוחדים ורווחים
        clean_phone = re.sub(r'[^\d]', '', phone)
        
        # וידוא שמתחיל ב-972
        if clean_phone.startswith('972'):
            return clean_phone
        elif clean_phone.startswith('0'):
            # אם מתחיל ב-0, החלף ב-972
            return '972' + clean_phone[1:]
        elif len(clean_phone) == 9:
            # אם 9 ספרות, הוסף 972
            return '972' + clean_phone
        else:
            return clean_phone
    
    def init_bigquery_client(self):
        """יצירת BigQuery client עם קובץ המפתח"""
        try:
            # שימוש בקובץ המפתח המקורי
            credentials = service_account.Credentials.from_service_account_file(
                'wolfscan-key.json',
                scopes=['https://www.googleapis.com/auth/bigquery']
            )
            
            self.bigquery_client = bigquery.Client(credentials=credentials, project=self.PROJECT_ID)
            logger.info("BigQuery client נוצר בהצלחה")
            
        except Exception as e:
            logger.error(f"שגיאה בחיבור ל-BigQuery: {e}")
            self.bigquery_client = None
    
    def extract_phone_from_url(self, url):
        """חילוץ מספר טלפון מה-URL"""
        try:
            parsed_url = urlparse(url)
            query_params = parse_qs(parsed_url.query)
            phone = query_params.get('mp_phone', [''])[0]
            if phone:
                return self.normalize_phone(phone.strip())
            return None
        except Exception as e:
            logger.error(f"שגיאה בחילוץ טלפון מה-URL {url}: {e}")
            return None
    
    def validate_israeli_phone(self, phone):
        """בדיקת תקינות מספר טלפון ישראלי"""
        if not phone:
            return False
        
        # נרמול הטלפון
        normalized_phone = self.normalize_phone(phone)
        if not normalized_phone:
            return False
        
        # בדיקה שמתחיל ב-972
        if not normalized_phone.startswith('972'):
            return False
        
        # בדיקה שאורך המספר הוא בדיוק 12 (972 + 9 ספרות)
        if len(normalized_phone) != 12:
            return False
        
        # בדיקה שהספרות אחרי 972 מתחילות ב-5
        if not normalized_phone[3].startswith('5'):
            return False
        
        return True
    
    def check_phone_in_bigquery(self, phone):
        """בדיקה אם מספר טלפון קיים ב-BigQuery (עם מטמון)"""
        # נרמול הטלפון לבדיקה במטמון
        normalized_phone = self.normalize_phone(phone)
        if not normalized_phone:
            return False
        
        # בדיקה במטמון קודם
        if normalized_phone in self.phone_cache:
            logger.debug(f"טלפון {normalized_phone} נמצא במטמון: {self.phone_cache[normalized_phone]}")
            return self.phone_cache[normalized_phone]
        
        # בדיקה אם הטלפון כבר נבדק ב-BigQuery
        if normalized_phone in self.bigquery_checked_phones:
            logger.debug(f"טלפון {normalized_phone} כבר נבדק ב-BigQuery")
            # החזרת התוצאה מהמטמון (אם יש) או False
            return self.phone_cache.get(normalized_phone, False)
        
        # בדיקה אם הטלפון כבר נבדק ולא תקין
        if normalized_phone in self.invalid_phones_cache:
            logger.debug(f"טלפון {normalized_phone} כבר נבדק ולא תקין")
            return False
        
        if not self.bigquery_client:
            logger.warning("BigQuery לא זמין - מחזיר False")
            return False
        
        try:
            query = f"""
            SELECT COUNT(*) as count
            FROM `{self.PROJECT_ID}.{self.DATASET_ID}.{self.TABLE_NAME}`
            WHERE CAST(phone AS STRING) = '{normalized_phone}'
            LIMIT 1
            """
            
            query_job = self.bigquery_client.query(query)
            results = list(query_job.result())
            
            exists = results[0].count > 0 if results else False
            
            # שמירה במטמון וסימון כנבדק
            self.phone_cache[normalized_phone] = exists
            self.bigquery_checked_phones.add(normalized_phone)
            
            # אם לא נמצא, שמירה במטמון הטלפונים הלא תקינים
            if not exists:
                self.invalid_phones_cache.add(normalized_phone)
            
            # שמירת מטמון אוטומטית אחרי בדיקה
            logger.info(f"מנסה לשמור מטמון BigQuery עבור טלפון: {normalized_phone}")
            try:
                self.save_bigquery_cache()
                logger.info(f"מטמון BigQuery נשמר אוטומטית עבור טלפון: {normalized_phone}")
            except Exception as e:
                logger.error(f"שגיאה בשמירת מטמון BigQuery: {e}")
                import traceback
                logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            
            return exists
            
        except Exception as e:
            logger.error(f"שגיאה בבדיקת BigQuery עבור מספר {normalized_phone}: {e}")
            return False
    
    def check_phones_batch_in_bigquery(self, phones):
        """בדיקה batch של מספר טלפונים ב-BigQuery"""
        try:
            if not self.bigquery_client:
                logger.warning("BigQuery לא זמין - מחזיר False לכל הטלפונים")
                return {phone: False for phone in phones}
            
            if not phones:
                return {}
            
            logger.info(f"מתחיל בדיקת {len(phones)} טלפונים...")
            
            # נרמול כל הטלפונים
            normalized_phones = []
            for phone in phones:
                normalized = self.normalize_phone(phone)
                if normalized:
                    normalized_phones.append(normalized)
            
            # סינון טלפונים שכבר נבדקו או לא תקינים
            new_phones = []
            for phone in normalized_phones:
                if phone not in self.bigquery_checked_phones and phone not in self.invalid_phones_cache:
                    new_phones.append(phone)
            
            logger.info(f"טלפונים חדשים: {len(new_phones)}")
            logger.info(f"טלפונים שכבר נבדקו: {len(normalized_phones) - len(new_phones)}")
            
            if not new_phones:
                logger.info("כל הטלפונים כבר נבדקו ב-BigQuery או לא תקינים - אין צורך בבדיקה נוספת")
                # החזרת תוצאות מהמטמון
                return {phone: self.phone_cache.get(phone, False) for phone in normalized_phones}
            
            logger.info(f"מתחיל בדיקת {len(new_phones)} מספרי טלפונים חדשים ב-BigQuery...")
            
            # יצירת רשימת ערכים לשאילתה
            phone_values = "', '".join(new_phones)
            
            query = f"""
            SELECT CAST(phone AS STRING) as phone_str
            FROM `{self.PROJECT_ID}.{self.DATASET_ID}.{self.TABLE_NAME}`
            WHERE CAST(phone AS STRING) IN ('{phone_values}')
            """
            
            query_job = self.bigquery_client.query(query)
            results = list(query_job.result())
            
            logger.info(f"קיבלתי {len(results)} תוצאות מ-BigQuery")
            
            # יצירת מילון של תוצאות לטלפונים החדשים
            found_new_phones = {row.phone_str: True for row in results}
            
            # מילוי תוצאות לכל הטלפונים (חדשים + שכבר נבדקו)
            phone_results = {}
            found_count = 0
            not_found_count = 0
            cached_count = 0
            new_checked_count = 0
            
            for phone in normalized_phones:
                if phone in self.bigquery_checked_phones:
                    # טלפון שכבר נבדק - שימוש בתוצאה הקיימת
                    phone_results[phone] = self.phone_cache.get(phone, False)
                    cached_count += 1
                else:
                    # טלפון חדש - שימוש בתוצאה החדשה
                    phone_results[phone] = found_new_phones.get(phone, False)
                    
                    # שמירה במטמון וסימון כנבדק
                    self.phone_cache[phone] = phone_results[phone]
                    self.bigquery_checked_phones.add(phone)
                    new_checked_count += 1
                
                if phone_results[phone]:
                    found_count += 1
                else:
                    not_found_count += 1
            
            logger.info(f"טלפונים מהמטמון: {cached_count}, טלפונים חדשים: {new_checked_count}")
            logger.info(f"סיכום בדיקת BigQuery: {found_count} נמצאו, {not_found_count} לא נמצאו")
            
            # שמירת מטמון אוטומטית אחרי בדיקה
            try:
                self.save_bigquery_cache()
                logger.info(f"מטמון BigQuery נשמר אוטומטית: {len(self.bigquery_checked_phones)} טלפונים")
            except Exception as e:
                logger.error(f"שגיאה בשמירת מטמון BigQuery: {e}")
                import traceback
                logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            
            return phone_results
            
        except Exception as e:
            logger.error(f"שגיאה בבדיקת BigQuery batch: {e}")
            import traceback
            logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            return {phone: False for phone in phones}
    
    def validate_survey_response(self, response):
        """בדיקת רשומת סקר בודדת"""
        try:
            survey_url = response.get('surveyUrl', '')
            phone = self.extract_phone_from_url(survey_url)
            
            # בדיקה אם יש טלפון
            if not phone:
                return {
                    'valid': False,
                    'reason': 'אין מספר טלפון',
                    'phone': None
                }
            
            # בדיקת תקינות טלפון
            if not self.validate_israeli_phone(phone):
                return {
                    'valid': False,
                    'reason': 'מספר טלפון לא תקין',
                    'phone': phone
                }
            
            # בדיקה ב-BigQuery
            if not self.check_phone_in_bigquery(phone):
                return {
                    'valid': False,
                    'reason': 'מספר טלפון לא נמצא במסד הנתונים',
                    'phone': phone
                }
            
            # הרשומה תקינה
            return {
                'valid': True,
                'reason': 'תקין',
                'phone': phone
            }
            
        except Exception as e:
            logger.error(f"שגיאה בבדיקת רשומת סקר: {e}")
            return {
                'valid': False,
                'reason': f'שגיאה: {str(e)}',
                'phone': None
            }
    
    def process_responses_file(self, input_file, output_file):
        """עיבוד קובץ תשובות שלם"""
        logger.info(f"מתחיל עיבוד קובץ: {input_file}")
        
        try:
            # קריאת הקובץ המקורי
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"נטענו {len(data)} רשומות מהקובץ")
            
            # ===== שלב 1: ניקוי כפילויות ובדיקת תקינות טלפונים =====
            logger.info("שלב 1: ניקוי כפילויות ובדיקת תקינות טלפונים...")
            
            phone_to_response = {}
            cleaned_responses = []
            invalid_count = 0
            duplicate_count = 0
            
            for i, response in enumerate(data):
                if i % 1000 == 0:  # דיווח כל 1000 רשומות
                    logger.info(f"מעבד רשומה {i+1}/{len(data)}")
                
                survey_url = response.get('surveyUrl', '')
                phone = self.extract_phone_from_url(survey_url)
                
                # בדיקה אם הטלפון כבר נבדק ולא תקין
                if phone and phone in self.invalid_phones_cache:
                    invalid_count += 1
                    continue
                
                # בדיקה אם יש טלפון תקין
                if phone and self.validate_israeli_phone(phone):
                    # אם זה הטלפון הראשון או עדיף על הקיים
                    if phone not in phone_to_response:
                        phone_to_response[phone] = response
                        cleaned_responses.append(response)
                    else:
                        duplicate_count += 1
                else:
                    invalid_count += 1
                    # שמירת טלפון לא תקין במטמון
                    if phone:
                        self.invalid_phones_cache.add(phone)
            
            logger.info(f"שלב 1 הושלם:")
            logger.info(f"  - רשומות לא תקינות: {invalid_count}")
            logger.info(f"  - כפילויות: {duplicate_count}")
            logger.info(f"  - רשומות תקינות: {len(cleaned_responses)}")
            
            # ===== שלב 2: בדיקת טלפונים ב-BigQuery =====
            logger.info("שלב 2: בדיקת טלפונים ב-BigQuery...")
            
            # איסוף כל הטלפונים לבדיקה
            phones_to_check = []
            for response in cleaned_responses:
                survey_url = response.get('surveyUrl', '')
                phone = self.extract_phone_from_url(survey_url)
                if phone:
                    phones_to_check.append(phone)
            
            logger.info(f"נאספו {len(phones_to_check)} מספרי טלפונים לבדיקה")
            
            # בדיקה batch של כל הטלפונים
            phone_results = self.check_phones_batch_in_bigquery(phones_to_check)
            
            # סינון לפי תוצאות BigQuery
            final_responses = []
            found_in_bigquery = 0
            not_found_in_bigquery = 0
            
            for response in cleaned_responses:
                survey_url = response.get('surveyUrl', '')
                phone = self.extract_phone_from_url(survey_url)
                
                if phone and phone_results.get(phone, False):
                    final_responses.append(response)
                    found_in_bigquery += 1
                else:
                    not_found_in_bigquery += 1
            
            logger.info(f"שלב 2 הושלם:")
            logger.info(f"  - נמצאו ב-BigQuery: {found_in_bigquery}")
            logger.info(f"  - לא נמצאו ב-BigQuery: {not_found_in_bigquery}")
            
            # ===== שמירת התוצאות =====
            logger.info("שומר קובץ מנוקה...")
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(final_responses, f, ensure_ascii=False, indent=2)
            
            # שמירת מטמון BigQuery
            logger.info(f"מנסה לשמור מטמון BigQuery עם {len(self.bigquery_checked_phones)} טלפונים...")
            try:
                self.save_bigquery_cache()
                logger.info("מטמון BigQuery נשמר בהצלחה")
            except Exception as e:
                logger.error(f"שגיאה בשמירת מטמון BigQuery: {e}")
                import traceback
                logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            
            logger.info(f"הקובץ המנוקה נשמר: {output_file}")
            
            # ===== סיכום סופי =====
            total_removed = len(data) - len(final_responses)
            logger.info("=== סיכום סופי ===")
            logger.info(f"רישומים מקוריים: {len(data)}")
            logger.info(f"רישומים לא תקינים: {invalid_count}")
            logger.info(f"כפילויות: {duplicate_count}")
            logger.info(f"לא נמצאו ב-BigQuery: {not_found_in_bigquery}")
            logger.info(f"סה״כ הוסרו: {total_removed}")
            logger.info(f"נשארו: {len(final_responses)}")
            
            return len(final_responses)
            
        except Exception as e:
            logger.error(f"שגיאה בעיבוד הקובץ: {e}")
            return 0
    
    def generate_entry_hash(self, response):
        """יצירת hash ייחודי לרשומה"""
        # יצירת מחרוזת ייחודית מהרשומה
        unique_string = f"{response.get('id', '')}_{response.get('surveyUrl', '')}_{response.get('submittedAt', '')}"
        return hashlib.md5(unique_string.encode()).hexdigest()
    
    def load_processed_entries(self, output_file):
        """טעינת רשומות שכבר עובדו מהקובץ המנוקה"""
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                
                # יצירת hash לכל רשומה קיימת
                for response in existing_data:
                    entry_hash = self.generate_entry_hash(response)
                    self.processed_entries.add(entry_hash)
                
                logger.info(f"נטענו {len(self.processed_entries)} רשומות שכבר עובדו")
                return existing_data
            except:
                logger.warning("לא ניתן לטעון קובץ מנוקה קיים")
        
        return []
    
    def process_new_responses_only(self, input_file, output_file):
        """עיבוד רק רשומות חדשות"""
        logger.info(f"מתחיל עיבוד רשומות חדשות: {input_file}")
        
        try:
            # טעינת רשומות שכבר עובדו
            existing_cleaned = self.load_processed_entries(output_file)
            
            # קריאת הקובץ המקורי
            with open(input_file, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
            
            logger.info(f"נטענו {len(current_data)} רשומות מהקובץ המקורי")
            logger.info(f"כבר עובדו {len(existing_cleaned)} רשומות")
            
            # עיבוד רק רשומות חדשות
            new_valid_responses = []
            new_invalid_count = 0
            new_duplicate_count = 0
            
            # מילון לשמירת הטלפון הראשון לכל מספר
            phone_to_response = {}
            
            for response in current_data:
                entry_hash = self.generate_entry_hash(response)
                
                # בדיקה אם כבר עובדה
                if entry_hash in self.processed_entries:
                    continue
                
                # סימון כעובדה
                self.processed_entries.add(entry_hash)
                
                survey_url = response.get('surveyUrl', '')
                phone = self.extract_phone_from_url(survey_url)
                
                # בדיקה אם הטלפון כבר נבדק ולא תקין
                if phone and phone in self.invalid_phones_cache:
                    new_invalid_count += 1
                    continue
                
                # בדיקה אם יש טלפון תקין
                if phone and self.validate_israeli_phone(phone):
                    # אם זה הטלפון הראשון או עדיף על הקיים
                    if phone not in phone_to_response:
                        phone_to_response[phone] = response
                        new_valid_responses.append(response)
                    else:
                        new_duplicate_count += 1
                else:
                    # שמירת טלפון לא תקין במטמון
                    if phone:
                        self.invalid_phones_cache.add(phone)
                    new_invalid_count += 1
            
            logger.info(f"נמצאו {len(new_valid_responses)} רשומות חדשות תקינות")
            
            # בדיקת טלפונים חדשים ב-BigQuery
            if new_valid_responses:
                phones_to_check = []
                for response in new_valid_responses:
                    survey_url = response.get('surveyUrl', '')
                    phone = self.extract_phone_from_url(survey_url)
                    if phone:
                        phones_to_check.append(phone)
                
                logger.info(f"בודק {len(phones_to_check)} טלפונים חדשים ב-BigQuery...")
                phone_results = self.check_phones_batch_in_bigquery(phones_to_check)
                
                # סינון לפי BigQuery
                final_new_responses = []
                for response in new_valid_responses:
                    survey_url = response.get('surveyUrl', '')
                    phone = self.extract_phone_from_url(survey_url)
                    
                    if phone and phone_results.get(phone, False):
                        final_new_responses.append(response)
                
                logger.info(f"לאחר BigQuery: {len(final_new_responses)} רשומות חדשות תקינות")
                
                # הוספה לקובץ המנוקה
                existing_cleaned.extend(final_new_responses)
                
                # שמירת הקובץ המעודכן
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(existing_cleaned, f, ensure_ascii=False, indent=2)
                
                # שמירת מטמון BigQuery
                logger.info(f"מנסה לשמור מטמון BigQuery עם {len(self.bigquery_checked_phones)} טלפונים...")
                try:
                    self.save_bigquery_cache()
                    logger.info("מטמון BigQuery נשמר בהצלחה")
                except Exception as e:
                    logger.error(f"שגיאה בשמירת מטמון BigQuery: {e}")
                    import traceback
                    logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
                
                logger.info(f"הקובץ עודכן: {len(existing_cleaned)} רשומות סה״כ")
            
            return len(new_valid_responses)
            
        except Exception as e:
            logger.error(f"שגיאה בעיבוד רשומות חדשות: {e}")
            return 0
    
    def validate_single_url(self, survey_url):
        """בדיקת URL בודד (לשימוש ב-API)"""
        try:
            phone = self.extract_phone_from_url(survey_url)
            
            if not phone:
                return {
                    'valid': False,
                    'reason': 'אין מספר טלפון',
                    'phone': None
                }
            
            # בדיקה אם הטלפון כבר נבדק ולא תקין
            if phone and phone in self.invalid_phones_cache:
                return {
                    'valid': False,
                    'reason': 'מספר טלפון לא תקין (נבדק בעבר)',
                    'phone': phone
                }
            
            if not self.validate_israeli_phone(phone):
                return {
                    'valid': False,
                    'reason': 'מספר טלפון לא תקין',
                    'phone': phone
                }
            
            if not self.check_phone_in_bigquery(phone):
                return {
                    'valid': False,
                    'reason': 'מספר טלפון לא נמצא במסד הנתונים',
                    'phone': phone
                }
            
            return {
                'valid': True,
                'reason': 'תקין',
                'phone': phone
            }
            
        except Exception as e:
            return {
                'valid': False,
                'reason': f'שגיאה: {str(e)}',
                'phone': None
            }

    def save_bigquery_cache(self, cache_file="bigquery_phones_cache.json"):
        """שמירת מטמון הטלפונים שנבדקו ב-BigQuery"""
        try:
            # שימוש בנתיב מלא - שמירה בתיקייה הנוכחית
            if not os.path.isabs(cache_file):
                cache_file = os.path.join(os.getcwd(), cache_file)
            
            cache_data = {
                'checked_phones': list(self.bigquery_checked_phones),
                'phone_results': self.phone_cache,
                'invalid_phones': list(self.invalid_phones_cache),
                'timestamp': time.time()
            }
            
            logger.info(f"שומר מטמון BigQuery: {len(self.bigquery_checked_phones)} טלפונים")
            logger.info(f"שומר מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
            logger.info(f"נתיב הקובץ: {cache_file}")
            
            # יצירת התיקייה אם היא לא קיימת
            cache_dir = os.path.dirname(cache_file)
            if cache_dir and not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
                logger.info(f"נוצרה תיקייה: {cache_dir}")
            
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
            # בדיקה שהקובץ באמת נוצר
            if os.path.exists(cache_file):
                file_size = os.path.getsize(cache_file)
                logger.info(f"מטמון BigQuery נשמר בהצלחה: {cache_file} (גודל: {file_size} בתים)")
            else:
                logger.error("הקובץ לא נוצר למרות שלא הייתה שגיאה!")
            
        except Exception as e:
            logger.error(f"שגיאה בשמירת מטמון BigQuery: {e}")
            import traceback
            logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            # ניסיון שמירה לקובץ גיבוי
            try:
                backup_file = f"{cache_file}.backup"
                logger.info(f"מנסה שמירה לקובץ גיבוי: {backup_file}")
                with open(backup_file, 'w', encoding='utf-8') as f:
                    json.dump(cache_data, f, ensure_ascii=False, indent=2)
                logger.info(f"מטמון נשמר לקובץ גיבוי: {backup_file}")
            except Exception as backup_e:
                logger.error(f"שגיאה גם בשמירת גיבוי: {backup_e}")
    
    def load_bigquery_cache(self, cache_file="bigquery_phones_cache.json"):
        """טעינת מטמון הטלפונים שנבדקו ב-BigQuery"""
        try:
            # שימוש בנתיב מלא
            if not os.path.isabs(cache_file):
                cache_file = os.path.join(os.getcwd(), cache_file)
            
            logger.info(f"מנסה לטעון מטמון BigQuery מהקובץ: {cache_file}")
            logger.info(f"נתיב נוכחי: {os.getcwd()}")
            logger.info(f"האם הקובץ קיים: {os.path.exists(cache_file)}")
            
            if os.path.exists(cache_file):
                file_size = os.path.getsize(cache_file)
                logger.info(f"גודל קובץ המטמון: {file_size} בתים")
                
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                self.bigquery_checked_phones = set(cache_data.get('checked_phones', []))
                self.phone_cache = cache_data.get('phone_results', {})
                self.invalid_phones_cache = set(cache_data.get('invalid_phones', []))
                
                logger.info(f"נטען מטמון BigQuery: {len(self.bigquery_checked_phones)} טלפונים")
                logger.info(f"נטען מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
                logger.info(f"דוגמאות טלפונים: {list(self.bigquery_checked_phones)[:5]}...")
                return True
            else:
                # ניסיון לטעון מקובץ גיבוי
                backup_file = f"{cache_file}.backup"
                if os.path.exists(backup_file):
                    logger.info(f"מנסה לטעון מקובץ גיבוי: {backup_file}")
                    try:
                        with open(backup_file, 'r', encoding='utf-8') as f:
                            cache_data = json.load(f)
                        
                        self.bigquery_checked_phones = set(cache_data.get('checked_phones', []))
                        self.phone_cache = cache_data.get('phone_results', {})
                        self.invalid_phones_cache = set(cache_data.get('invalid_phones', []))
                        
                        logger.info(f"נטען מטמון BigQuery מקובץ גיבוי: {len(self.bigquery_checked_phones)} טלפונים")
                        logger.info(f"נטען מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
                        return True
                    except Exception as backup_e:
                        logger.error(f"שגיאה בטעינת קובץ גיבוי: {backup_e}")
                
                logger.info("לא נמצא קובץ מטמון BigQuery - מתחיל עם מטמון ריק")
                return False
                
        except Exception as e:
            logger.error(f"שגיאה בטעינת מטמון BigQuery: {e}")
            import traceback
            logger.error(f"פירוט השגיאה: {traceback.format_exc()}")
            
            # ניסיון לטעון מקובץ גיבוי
            backup_file = f"{cache_file}.backup"
            if os.path.exists(backup_file):
                logger.info(f"מנסה לטעון מקובץ גיבוי: {backup_file}")
                try:
                    with open(backup_file, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    
                    self.bigquery_checked_phones = set(cache_data.get('checked_phones', []))
                    self.phone_cache = cache_data.get('phone_results', {})
                    self.invalid_phones_cache = set(cache_data.get('invalid_phones', []))
                    
                    logger.info(f"נטען מטמון BigQuery מקובץ גיבוי: {len(self.bigquery_checked_phones)} טלפונים")
                    logger.info(f"נטען מטמון טלפונים לא תקינים: {len(self.invalid_phones_cache)} טלפונים")
                    return True
                except Exception as backup_e:
                    logger.error(f"שגיאה גם בטעינת קובץ גיבוי: {backup_e}")
            
            return False

    def get_cache_stats(self):
        """קבלת סטטיסטיקות המטמון"""
        return {
            'total_checked_phones': len(self.bigquery_checked_phones),
            'total_phone_results': len(self.phone_cache),
            'invalid_phones': len(self.invalid_phones_cache),
            'processed_entries': len(self.processed_entries),
            'cache_file': "bigquery_phones_cache.json",
            'backup_file': "bigquery_phones_cache.json.backup"
        }
    
    def print_cache_stats(self):
        """הדפסת סטטיסטיקות המטמון"""
        stats = self.get_cache_stats()
        print("=== סטטיסטיקות מטמון ===")
        print(f"טלפונים שנבדקו ב-BigQuery: {stats['total_checked_phones']}")
        print(f"תוצאות טלפונים במטמון: {stats['total_phone_results']}")
        print(f"טלפונים לא תקינים: {stats['invalid_phones']}")
        print(f"רשומות שעובדו: {stats['processed_entries']}")
        print(f"קובץ מטמון: {stats['cache_file']}")
        print(f"קובץ גיבוי: {stats['backup_file']}")
        print("==========================")

# פונקציות עזר לשימוש חיצוני
def create_validator():
    """יצירת מופע של הוולידטור"""
    return SurveyPhoneValidator()

def validate_url(survey_url):
    """בדיקת URL בודד"""
    validator = create_validator()
    return validator.validate_single_url(survey_url)

def process_file(input_file, output_file):
    """עיבוד קובץ שלם"""
    validator = create_validator()
    return validator.process_responses_file(input_file, output_file)

# הפונקציה process_new_responses_only הוסרה כי היא יוצרת מופעים חדשים
# במקום זה, הפונקציות המעקב משתמשות במופע אחד לאורך כל הריצה

def run_realtime_monitoring(input_file, output_file):
    """הפעלת מעקב בזמן אמת - בודק עדכונים כל 5 דקות"""
    print(f"מתחיל מעקב אחרי {input_file}")
    print("בודק עדכונים כל 5 דקות...")
    
    # יצירת מופע אחד של הוולידטור לשימוש לאורך כל הריצה
    validator = create_validator()
    print("וולידטור נוצר - מטמון נטען")
    
    last_modified_time = 0
    last_count = 0
    last_cache_save = time.time()
    
    try:
        while True:
            current_time = time.time()
            
            # בדיקה אם הקובץ השתנה
            if os.path.exists(input_file):
                file_modified_time = os.path.getmtime(input_file)
                
                if file_modified_time > last_modified_time:
                    print(f"\n[{time.strftime('%H:%M:%S')}] קובץ התעדכן - מתחיל עיבוד...")
                    
                    # עיבוד רשומות חדשות עם המופע הקיים
                    count = validator.process_new_responses_only(input_file, output_file)
                    
                    if count > 0:
                        print(f"[{time.strftime('%H:%M:%S')}] עובדו {count} רשומות חדשות")
                        last_count = count
                    else:
                        print(f"[{time.strftime('%H:%M:%S')}] אין רשומות חדשות")
                    
                    last_modified_time = file_modified_time
                else:
                    # הדפסת נקודה כל 10 שניות להראות שהסקריפט עדיין רץ
                    if int(current_time) % 10 == 0:
                        print(".", end="", flush=True)
            else:
                print(f"\n[{time.strftime('%H:%M:%S')}] אזהרה: הקובץ {input_file} לא נמצא")
            
            # שמירת מטמון כל 5 דקות
            if current_time - last_cache_save > 300:  # 5 דקות
                try:
                    validator.save_bigquery_cache()
                    print(f"\n[{time.strftime('%H:%M:%S')}] מטמון נשמר אוטומטית")
                    last_cache_save = current_time
                except Exception as e:
                    print(f"\n[{time.strftime('%H:%M:%S')}] שגיאה בשמירת מטמון: {e}")
            
            # המתנה 5 דקות
            time.sleep(300)
            
    except KeyboardInterrupt:
        print(f"\n\nמעקב הופסק על ידי המשתמש")
        print(f"סה״כ עובדו {last_count} רשומות חדשות")
        print("הסקריפט הסתיים")
    except Exception as e:
        print(f"\nשגיאה במעקב: {e}")
        print("הסקריפט הסתיים")

def run_silent_monitoring(input_file, output_file):
    """הפעלת מעקב שקט (ל-PM2) - בודק עדכונים כל 5 דקות ללא הדפסות מיותרות"""
    # יצירת מופע אחד של הוולידטור לשימוש לאורך כל הריצה
    validator = create_validator()
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] וולידטור נוצר - מטמון נטען")
    
    last_modified_time = 0
    last_cache_save = time.time()
    
    while True:
        try:
            current_time = time.time()
            
            # בדיקה אם הקובץ השתנה
            if os.path.exists(input_file):
                file_modified_time = os.path.getmtime(input_file)
                
                if file_modified_time > last_modified_time:
                    # עיבוד רשומות חדשות עם המופע הקיים
                    count = validator.process_new_responses_only(input_file, output_file)
                    
                    if count > 0:
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] עובדו {count} רשומות חדשות")
                    
                    last_modified_time = file_modified_time
            
            # שמירת מטמון כל 5 דקות
            if current_time - last_cache_save > 300:  # 5 דקות
                try:
                    validator.save_bigquery_cache()
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] מטמון נשמר אוטומטית")
                    last_cache_save = current_time
                except Exception as e:
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] שגיאה בשמירת מטמון: {e}")
            
            # המתנה 5 דקות
            time.sleep(300)
            
        except Exception as e:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] שגיאה: {e}")
            time.sleep(300)  # המתנה 5 דקות נוספות לפני ניסיון חוזר

def show_cache_stats():
    """הצגת סטטיסטיקות המטמון"""
    validator = create_validator()
    validator.print_cache_stats()

# דוגמה לשימוש
if __name__ == "__main__":
    print("=== בדיקת URL בודד ===")
    # דוגמה לבדיקת URL בודד
    test_url = "https://sekerapp.online/survey/15?mp_phone=972532424723"
    result = validate_url(test_url)
    print(f"תוצאה: {result}")
    
    print("\n=== סטטיסטיקות מטמון ===")
    show_cache_stats()
    
    print("\n=== מידע על קבצי מטמון ===")
    cache_file = "bigquery_phones_cache.json"
    backup_file = "bigquery_phones_cache.json.backup"
    
    if os.path.exists(cache_file):
        file_size = os.path.getsize(cache_file)
        print(f"קובץ מטמון קיים: {cache_file} (גודל: {file_size} בתים)")
    else:
        print(f"קובץ מטמון לא קיים: {cache_file}")
    
    if os.path.exists(backup_file):
        file_size = os.path.getsize(backup_file)
        print(f"קובץ גיבוי קיים: {backup_file} (גודל: {file_size} בתים)")
    else:
        print(f"קובץ גיבוי לא קיים: {backup_file}")
    
    print("\n=== הפעלת מעקב בזמן אמת ===")
    # נתיבים מלאים
    input_file = "../data/responses.json"  # pseker/data/responses.json
    output_file = "responses_cleaned.json"  # pseker/clear_json/responses_cleaned.json
    
    print(f"קובץ מקורי: {input_file}")
    print(f"קובץ מנוקה: {output_file}")
    
    if not os.path.exists(input_file):
        print(f"הקובץ {input_file} לא נמצא")
        print("הנתיב צריך להיות: pseker/data/responses.json")
        print("הסקריפט צריך לרוץ מתוך: pseker/clear_json/")
        exit(1)
    
    print("מתחיל מעקב בזמן אמת - בודק עדכונים כל 5 דקות...")
    print("לעצירה לחץ Ctrl+C")
    
    # בדיקה אם להפעיל במצב שקט (ל-PM2)
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--silent":
        print("מצב שקט מופעל (ל-PM2)")
        run_silent_monitoring(input_file, output_file)
    else:
        run_realtime_monitoring(input_file, output_file)
