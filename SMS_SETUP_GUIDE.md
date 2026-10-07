# 📱 Absent SMS Alert System — Setup Guide

## How It Works

```
Student Absent → closeSessionAndMarkAbsentees() → SmsService → Supabase Edge Function → Fast2SMS API → Student's Phone
```

When a Mentor closes an attendance session, every absent student with a registered phone number **automatically receives an SMS** like:

> *"Dear Ravi Kumar, you were marked ABSENT for the Morning (9:15 AM) session on 2026-10-01. Roll No: CSE-001. Please contact your mentor if this is incorrect. - TechWing GGU"*

---

## Step 1 — Get Your Fast2SMS API Key (Free)

1. Go to **https://www.fast2sms.com**
2. Register a free account (Indian mobile number required)
3. Go to **Dev API → API Keys**
4. Copy your **API Key**

> **Free Plan**: ₹50 free credits = ~50 SMS. Recharge for bulk.

---

## Step 2 — Install Supabase CLI

```powershell
npm install -g supabase
```

---

## Step 3 — Link Your Supabase Project

```powershell
# In the project directory:
cd "c:\Users\TechWing_Dev\Pictures\techwing attenance system\techwing-attendance"

supabase login
supabase link --project-ref fhtywxdfdvplrppcfulz
```

---

## Step 4 — Set the SMS API Key as a Secret

```powershell
supabase secrets set FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

> ⚠️ **NEVER** put this key in the Angular environment.ts — it would be exposed to users!

---

## Step 5 — Deploy the Edge Function

```powershell
supabase functions deploy send-sms
```

You should see:
```
✓ Deployed send-sms
```

---

## Step 6 — Test the SMS Function

```powershell
supabase functions invoke send-sms --body '{"phone":"9876543210","message":"Test SMS from TechWing!"}'
```

---

## Step 7 — Ensure Students Have Phone Numbers

Make sure students in the **Students table** have their `phone` field filled:
- Format: `9876543210` (10 digits) or `+919876543210`
- Numbers starting with 6, 7, 8, or 9 are valid

---

## SMS Trigger Points

| When | Who Gets SMS |
|------|-------------|
| Mentor closes Morning session | All absent students with phone numbers |
| Mentor closes Afternoon session | All absent students with phone numbers |

---

## SMS Template

```
Dear {Student Name}, you were marked ABSENT for the {Session} session on {Date}.
Roll No: {Roll Number}. Please contact your mentor if this is incorrect. - TechWing GGU
```

---

## Alternative SMS Providers

If Fast2SMS doesn't work, change the Edge Function to use:

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Fast2SMS** | ₹50 free | India, cheapest |
| **MSG91** | Trial credits | DLT-registered bulk |
| **TextLocal** | 10 free SMS | Good India coverage |
| **Twilio** | $15 trial | International |

---

## Troubleshooting

- **SMS not sending**: Check Supabase → Edge Functions logs in the dashboard
- **Phone invalid**: Number must be 10 digits starting with 6-9
- **API key error**: Re-run `supabase secrets set FAST2SMS_API_KEY=...`
- **Function not found**: Re-run `supabase functions deploy send-sms`
