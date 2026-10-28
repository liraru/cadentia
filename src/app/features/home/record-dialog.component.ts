import { formatNumber } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { filter, startWith } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { fromIsoDate, toIsoDate } from '../../core/dates';
import { calcImc, imcBand } from '../../core/imc';
import { WeightRecord, WeightRecordInput } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { WeightService } from '../../core/weight.service';

export interface RecordDialogData {
  record: WeightRecord | null;
  /** Móvil: el selector de fecha se abre en modo táctil. */
  mobile: boolean;
}

type ExtraKey = 'waist' | 'thigh' | 'chest' | 'arm';

/**
 * Modal de añadir/editar registro (MatDialog).
 *  - Escritorio: centrada, 30rem (la configura HomeComponent).
 *  - Móvil (<= 640px): PANTALLA COMPLETA (clase record-dialog-fs en styles.scss).
 */
@Component({
  selector: 'app-record-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.record ? 'Editar registro' : 'Añadir registro' }}</h2>

    <mat-dialog-content>
      <form id="record-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <mat-form-field>
          <mat-label>Fecha</mat-label>
          <input
            matInput
            readonly
            formControlName="date"
            [matDatepicker]="picker"
            [max]="today"
            (click)="picker.open()"
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker [touchUi]="data.mobile" />
          <mat-error>Indica la fecha.</mat-error>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Peso</mat-label>
          <input matInput type="number" inputmode="decimal" step="0.1" formControlName="weight" />
          <span matTextSuffix>kg&nbsp;</span>
          <mat-error>Introduce un peso válido (20–500 kg).</mat-error>
        </mat-form-field>

        <div class="full imc-row">
          <mat-form-field class="w-full">
            <mat-label>IMC (autocalculado)</mat-label>
            <input matInput disabled [value]="imcText()" />
          </mat-form-field>
          @if (imc() !== null) {
            <span class="imc-badge" [style.background]="band(imc()!).color">{{
              band(imc()!).label
            }}</span>
          }
          @if (!height()) {
            <small class="err">No hay altura en tu perfil, no se puede calcular el IMC.</small>
          }
        </div>

        @for (f of extras; track f.key) {
          <mat-form-field>
            <mat-label>{{ f.label }}</mat-label>
            <input
              matInput
              type="number"
              inputmode="decimal"
              step="0.1"
              [formControlName]="f.key"
            />
            <span matTextSuffix>cm&nbsp;</span>
            <mat-error>Valor fuera de rango.</mat-error>
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="requestClose()">Cancelar</button>
      <button mat-flat-button type="submit" form="record-form" [disabled]="saving()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
})
export class RecordDialogComponent {
  protected readonly data = inject<RecordDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RecordDialogComponent>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly weights = inject(WeightService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);

  protected readonly today = new Date();
  protected readonly saving = signal(false);
  protected readonly band = imcBand;
  protected readonly height = computed(() => this.auth.profile()?.height ?? null);

  protected readonly extras: { key: ExtraKey; label: string }[] = [
    { key: 'waist', label: 'Cintura' },
    { key: 'thigh', label: 'Muslo' },
    { key: 'chest', label: 'Pecho' },
    { key: 'arm', label: 'Brazo' },
  ];

  private readonly initial = this.data.record;

  protected readonly form = this.fb.group({
    date: this.fb.control<Date | null>(
      this.initial ? fromIsoDate(this.initial.date) : new Date(),
      Validators.required,
    ),
    weight: this.fb.control<number | null>(this.initial?.weight ?? null, [
      Validators.required,
      Validators.min(20),
      Validators.max(500),
    ]),
    waist: this.fb.control<number | null>(this.initial?.waist ?? null, [
      Validators.min(10),
      Validators.max(300),
    ]),
    thigh: this.fb.control<number | null>(this.initial?.thigh ?? null, [
      Validators.min(10),
      Validators.max(300),
    ]),
    chest: this.fb.control<number | null>(this.initial?.chest ?? null, [
      Validators.min(10),
      Validators.max(300),
    ]),
    arm: this.fb.control<number | null>(this.initial?.arm ?? null, [
      Validators.min(5),
      Validators.max(150),
    ]),
  });

  private readonly weightValue = toSignal(
    this.form.controls.weight.valueChanges.pipe(startWith(this.form.controls.weight.value)),
    { initialValue: this.form.controls.weight.value },
  );

  protected readonly imc = computed(() => {
    const w = this.weightValue();
    const h = this.height();
    return w && h && this.form.controls.weight.valid ? calcImc(w, h) : null;
  });
  protected readonly imcText = computed(() => {
    const v = this.imc();
    return v === null ? '—' : formatNumber(v, 'es', '1.1-2');
  });

  constructor() {
    // Cerrar con Esc o clic fuera pasa por requestClose() (pide confirmar si hay cambios)
    this.ref.disableClose = true;
    this.ref
      .keydownEvents()
      .pipe(
        filter((e) => e.key === 'Escape'),
        takeUntilDestroyed(),
      )
      .subscribe(() => void this.requestClose());
    this.ref
      .backdropClick()
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.requestClose());
  }

  protected async requestClose(): Promise<void> {
    if (!this.form.dirty) {
      this.ref.close();
      return;
    }
    const result = await this.confirm.ask({
      title: 'Cambios sin guardar',
      message: '¿Quieres guardar los cambios antes de salir?',
      confirmLabel: 'Guardar',
      rejectLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
    });
    if (result === 'confirm') await this.save();
    else if (result === 'reject') this.ref.close();
    // 'cancel' (Esc / Seguir editando): se queda editando
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: WeightRecordInput = {
      date: toIsoDate(v.date!),
      weight: v.weight!,
      imc: this.imc(),
      waist: v.waist ?? null,
      thigh: v.thigh ?? null,
      chest: v.chest ?? null,
      arm: v.arm ?? null,
    };

    this.saving.set(true);
    try {
      const rec = this.data.record;
      if (rec) await this.weights.update(rec.record_id, payload);
      else await this.weights.add(payload);
      this.notify.success('Registro guardado');
      this.form.markAsPristine();
      this.ref.close(true);
    } catch {
      this.notify.error('No se pudo guardar el registro');
    } finally {
      this.saving.set(false);
    }
  }
}
