import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _client!: SupabaseClient;
  public isConfigured = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    try {
      const url = environment.supabaseUrl;
      const key = environment.supabaseAnonKey;

      if (url && key && url.startsWith('http') && !url.includes('YOUR_SUPABASE')) {
        this._client = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        this.isConfigured = true;
      } else {
        // Fallback dummy client for UI preview without credentials
        this._client = createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        this.isConfigured = false;
        console.warn('TechWing Attendance: Supabase credentials not set yet. Running in UI preview mode.');
      }
    } catch (err) {
      console.error('Supabase initialization error:', err);
    }
  }

  get client(): SupabaseClient {
    return this._client;
  }

  get auth() {
    return this._client.auth;
  }

  get storage() {
    return this._client.storage;
  }

  from(table: string) {
    return this._client.from(table);
  }

  rpc(fn: string, params?: object) {
    return this._client.rpc(fn, params);
  }
}
