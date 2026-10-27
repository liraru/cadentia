import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { UserProfile } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService).client;

  readonly user = signal<User | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  /** true cuando ya sabemos si hay sesión (evita el parpadeo del login) */
  readonly ready = signal(false);

  constructor() {
    this.sb.auth.getSession().then(({ data }) => {
      this.user.set(data.session?.user ?? null);
      this.ready.set(true);
    });

    // Importante: callback síncrono (sin await dentro)
    this.sb.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ?? null);
    });

    effect(() => {
      const u = this.user();
      untracked(() => (u ? this.loadProfile(u.id) : this.profile.set(null)));
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.sb
      .from('users')
      .select('user_id, name, height')
      .eq('user_id', userId)
      .single();
    this.profile.set(error ? null : (data as UserProfile));
  }
}
