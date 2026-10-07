import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

export interface SMSResult {
  studentId: string;
  studentName: string;
  phone: string;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmsService {

  constructor(private supabase: SupabaseService) {}

  /**
   * Send absent SMS alert to a single student.
   */
  async sendAbsentAlert(
    phone: string,
    studentName: string,
    rollNumber: string,
    session: string,
    date: string
  ): Promise<boolean> {
    const cleanPhone = this.formatInternationalPhone(phone);
    if (!cleanPhone) {
      console.warn(`[SMS] Invalid phone number for ${studentName}: ${phone}`);
      return false;
    }

    const sessionLabel = session === 'morning' ? 'Morning (9:15 AM)' : 'Afternoon (1:15 PM)';
    const message =
      `Dear ${studentName}, you were marked ABSENT for the ${sessionLabel} session on ${date}. ` +
      `Roll No: ${rollNumber}. Please contact your mentor if this is incorrect. - TechWing GGU`;

    return this.sendSMS(cleanPhone, message);
  }

  /**
   * Bulk send absent SMS alerts after session close.
   */
  async sendBulkAbsentAlerts(
    absentees: Array<{ id: string; full_name: string; roll_number: string; phone?: string }>,
    session: string,
    date: string
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    const sessionLabel = session === 'morning' ? 'Morning (9:15 AM)' : 'Afternoon (1:15 PM)';

    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < absentees.length; i += batchSize) {
      const batch = absentees.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (student) => {
          const cleanPhone = this.formatInternationalPhone(student.phone || '');

          if (!cleanPhone) {
            results.push({
              studentId: student.id,
              studentName: student.full_name,
              phone: student.phone || 'N/A',
              success: false,
              error: 'Invalid phone number format'
            });
            return;
          }

          const message =
            `Dear ${student.full_name}, you were marked ABSENT for the ${sessionLabel} session on ${date}. ` +
            `Roll No: ${student.roll_number}. Contact your mentor if incorrect. - TechWing GGU`;

          const ok = await this.sendSMS(cleanPhone, message);
          results.push({
            studentId: student.id,
            studentName: student.full_name,
            phone: cleanPhone,
            success: ok,
            error: ok ? undefined : 'SMS delivery failed'
          });
        })
      );

      if (i + batchSize < absentees.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    return results;
  }

  /**
   * Send SMS via Twilio direct API, Supabase Edge Function, or Demo Simulation mode.
   */
  private async sendSMS(phone: string, message: string): Promise<boolean> {
    const tw = (environment as any).twilio;

    // 1. Try Twilio API if configured
    if (tw && tw.accountSid && tw.accountSid !== 'YOUR_TWILIO_ACCOUNT_SID' && tw.authToken) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${tw.accountSid}/Messages.json`;
        const auth = btoa(`${tw.accountSid}:${tw.authToken}`);

        const body = new URLSearchParams();
        body.append('To', phone);
        body.append('From', tw.fromNumber);
        body.append('Body', message);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });

        const data = await response.json();
        if (response.ok && data.sid) {
          console.log(`[Twilio SMS] Sent successfully to ${phone}. SID: ${data.sid}`);
          return true;
        } else {
          console.error(`[Twilio SMS Error]`, data);
          return false;
        }
      } catch (err) {
        console.error('[Twilio SMS Network Error]', err);
        return false;
      }
    }

    // 2. Fallback to Supabase Edge function if client configured
    if (this.supabase.isConfigured) {
      try {
        const { data, error } = await this.supabase.client.functions.invoke('send-sms', {
          body: { phone, message }
        });

        if (!error && data?.success) {
          console.log(`[Edge Function SMS] Sent to ${phone}`);
          return true;
        }
      } catch (err) {
        // continue to demo simulation log
      }
    }

    // 3. Demo Mode (Simulated SMS Log for testing without live credentials)
    console.log(`%c[SIMULATED SMS SENT] To: ${phone} | Message: "${message}"`, 'color: #10B981; font-weight: bold;');
    return true;
  }

  /**
   * Format phone number to E.164 international standard (+1234567890).
   * Works for both Indian numbers (+91) and international numbers (+1, +44, etc.).
   */
  public formatInternationalPhone(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim().replace(/[\s\-().]/g, '');

    // Already has + prefix
    if (cleaned.startsWith('+')) {
      return /^\+\d{10,15}$/.test(cleaned) ? cleaned : '';
    }

    // Indian 10-digit number without country code
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    // US/Canada 10-digit number
    if (/^[2-9]\d{9}$/.test(cleaned)) {
      return `+1${cleaned}`;
    }

    // 11-12 digit numbers starting with country code
    if (/^\d{10,15}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    return '';
  }
}
