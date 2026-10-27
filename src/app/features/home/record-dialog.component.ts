import { formatNumber, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, ConfirmEventType, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../core/auth.service';
import { fromIsoDate, toIsoDate } from '../../core/dates';
import { calcImc, imcBand } from '../../core/imc';
import { WeightRecord, WeightRecordInput } from '../../core/models';
import { WeightService } from '../../core/weight.service';

/**
 * Modal de añadir/editar registro.
 *  - Escritorio: centrada (ancho definido en styles.scss con .record-dialog).
 *  - Móvil (<= 640px): PANTALLA COMPLETA (también en styles.scss).
 */
@Component({
  selector: 'app-record-dialog',
  imports: [
    ReactiveFormsModule,
    DialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
  ],
  template: `
    <p-dialog
      [header]="record() ? 'Editar registro' : 'Añadir registro'"
      [visible]="visible()"
      (visibleChange)="requestClose($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="false"
      [closeOnEscape]="true"
      styleClass="record-dialog"
    >
      <form [formGroup]="form" (ngSubmit)="save()" class="form-grid" novalidate>
        <div class="field">
          <label for="date">Fecha *</label>
          <p-datepicker
            inputId="date"
            formControlName="date"
            dateFormat="dd/mm/yy"
            [maxDate]="today"
            [showIcon]="true"
            [touchUI]="isMobile"
            appendTo="body"
            [fluid]="true"
          />
          @if (form.controls.date.touched && form.controls.date.invalid) {
            <small class="err">Indica la fecha.</small>
          }
        </div>

        <div class="field">
          <label for="weight">Peso *</label>
          <p-inputnumber
            inputId="weight"
            formControlName="weight"
            mode="decimal"
            locale="es-ES"
            suffix=" kg"
            [minFractionDigits]="0"
            [maxFractionDigits]="2"
            [fluid]="true"
          />
          @if (form.controls.weight.touched && form.controls.weight.invalid) {
            <small class="err">Introduce un peso válido (20–500 kg).</small>
          }
        </div>

        <div class="field full">
          <label for="imc">IMC (autocalculado)</label>
          <input id="imc" pInputText class="w-full" [value]="imcText()" disabled />
          @if (imc() !== null) {
            <span class="imc-badge" [style.background]="band(imc()!).color">{{
              band(imc()!).label
            }}</span>
          }
          @if (!height()) {
            <small class="err">No hay altura en tu perfil, no se puede calcular el IMC.</small>
          }
        </div>

        <div class="field">
          <label for="waist">Cintura</label>
          <p-inputnumber
            inputId="waist"
            formControlName="waist"
            mode="decimal"
            locale="es-ES"
            suffix=" cm"
            [minFractionDigits]="0"
            [maxFractionDigits]="1"
            [fluid]="true"
          />
        </div>
        <div class="field">
          <label for="thigh">Muslo</label>
          <p-inputnumber
            inputId="thigh"
            formControlName="thigh"
            mode="decimal"
            locale="es-ES"
            suffix=" cm"
            [minFractionDigits]="0"
            [maxFractionDigits]="1"
            [fluid]="true"
          />
        </div>
        <div class="field">
          <label for="chest">Pecho</label>
          <p-inputnumber
            inputId="chest"
            formControlName="chest"
            mode="decimal"
            locale="es-ES"
            suffix=" cm"
            [minFractionDigits]="0"
            [maxFractionDigits]="1"
            [fluid]="true"
          />
        </div>
        <div class="field">
          <label for="arm">Brazo</label>
          <p-inputnumber
            inputId="arm"
            formControlName="arm"
            mode="decimal"
            locale="es-ES"
            suffix=" cm"
            [minFractionDigits]="0"
            [maxFractionDigits]="1"
            [fluid]="true"
          />
        </div>
      </form>

      <ng-template #footer>
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="requestClose(false)"
        />
        <p-button label="Guardar" icon="pi pi-check" [loading]="saving()" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class RecordDialogComponent {
  readonly visible = model(false);
  readonly record = input<WeightRecord | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly weights = inject(WeightService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly today = new Date();
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly isMobile = this.isBrowser && matchMedia('(max-width: 640px)').matches;
  protected readonly saving = signal(false);
  protected readonly band = imcBand;
  protected readonly height = computed(() => this.auth.profile()?.height ?? null);

  protected readonly form = this.fb.group({
    date: this.fb.control<Date | null>(null, Validators.required),
    weight: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(20),
      Validators.max(500),
    ]),
    waist: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    thigh: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    chest: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    arm: this.fb.control<number | null>(null, [Validators.min(5), Validators.max(150)]),
  });

  private readonly weightValue = toSignal(this.form.controls.weight.valueChanges, {
    initialValue: null,
  });

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
    // Cada vez que se abre, se rellena (editar) o se vacía (añadir)
    effect(() => {
      if (!this.visible()) return;
      const r = this.record();
      untracked(() => {
        this.form.reset({
          date: r ? fromIsoDate(r.date) : new Date(),
          weight: r?.weight ?? null,
          waist: r?.waist ?? null,
          thigh: r?.thigh ?? null,
          chest: r?.chest ?? null,
          arm: r?.arm ?? null,
        });
        this.form.markAsPristine();
      });
    });
  }

  protected requestClose(open: boolean): void {
    if (open || !this.form.dirty) {
      this.visible.set(open);
      return;
    }
    this.confirm.confirm({
      header: 'Cambios sin guardar',
      message: '¿Quieres guardar los cambios antes de salir?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Descartar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.save(),
      reject: (type?: ConfirmEventType) => {
        // CANCEL (X / Esc) = seguir editando; cualquier otro caso = "Descartar"
        if (type !== ConfirmEventType.CANCEL) {
          this.form.markAsPristine();
          this.visible.set(false);
        }
      },
    });
  }

  protected async save(): Promise<void> {
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
      const rec = this.record();
      if (rec) await this.weights.update(rec.record_id, payload);
      else await this.weights.add(payload);
      this.toast.add({ severity: 'success', summary: 'Registro guardado', life: 2500 });
      this.form.markAsPristine();
      this.visible.set(false);
    } catch {
      this.toast.add({ severity: 'error', summary: 'No se pudo guardar el registro' });
    } finally {
      this.saving.set(false);
    }
  }
}
