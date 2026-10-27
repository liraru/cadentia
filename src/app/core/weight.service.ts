import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { WeightRecord, WeightRecordInput } from './models';

@Injectable({ providedIn: 'root' })
export class WeightService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);

  /** Siempre ordenados de más reciente a más antiguo */
  readonly records = signal<WeightRecord[]>([]);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      const u = this.auth.user();
      untracked(() => (u ? this.load() : this.records.set([])));
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('weight_record')
      .select('*')
      .order('date', { ascending: false })
      .order('record_id', { ascending: false });
    this.loading.set(false);

    if (error) {
      this.toast.add({ severity: 'error', summary: 'No se pudieron cargar los registros' });
      return;
    }
    this.records.set((data ?? []) as WeightRecord[]);
  }

  async add(input: WeightRecordInput): Promise<void> {
    const { error } = await this.sb.from('weight_record').insert(input); // user_id = auth.uid() por defecto
    if (error) throw error;
    await this.load();
  }

  async update(recordId: number, input: WeightRecordInput): Promise<void> {
    const { error } = await this.sb.from('weight_record').update(input).eq('record_id', recordId);
    if (error) throw error;
    await this.load();
  }

  async remove(recordId: number): Promise<void> {
    const { error } = await this.sb.from('weight_record').delete().eq('record_id', recordId);
    if (error) throw error;
    await this.load();
  }
}
