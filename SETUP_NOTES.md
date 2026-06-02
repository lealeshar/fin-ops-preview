# Enterprise Fin-Ops — Setup Notes

## Organization UUID (קבוע לנצח — אל תשנה!)
```
a3cb8d18-bcf7-43cb-86ef-7e6d13eeb29d
```

## שלבי Provisioning ב-Supabase (פעם אחת בלבד)

### שלב 1 — צור משתמש ב-Supabase Dashboard
1. כנסי ל: https://supabase.com/dashboard/project/rbjfqkriadjqatanzdfp
2. Authentication → Users → "Add user" → "Create new user"
3. הכנסי אימייל + סיסמה (שמרי את הפרטים!)
4. אחרי היצירה — לחצי על המשתמש, העתיקי את ה-**User UID**

### שלב 2 — הגדרי organization_id על המשתמש
1. ב-Authentication → Users → לחצי על המשתמש שיצרת
2. לחצי Edit → בשדה "Custom Claims (app_metadata)" הכניסי:
```json
{"organization_id": "a3cb8d18-bcf7-43cb-86ef-7e6d13eeb29d"}
```
3. לחצי Save

### שלב 3 — הריצי ב-SQL Editor
1. כנסי ל-SQL Editor בפרויקט
2. הריצי:
```sql
SELECT rpc_provision_organization('a3cb8d18-bcf7-43cb-86ef-7e6d13eeb29d');
```

---

## Supabase Project
- URL: https://rbjfqkriadjqatanzdfp.supabase.co
- Dashboard: https://supabase.com/dashboard/project/rbjfqkriadjqatanzdfp

## GitHub Pages
- URL: https://lealeshar.github.io/fin-ops-preview
- Repo: https://github.com/lealeshar/fin-ops-preview
