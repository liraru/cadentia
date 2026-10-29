import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../core/auth.service';
import { NotifyService } from '../core/notify.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const repeat = group.get('repeat')?.value;
  return password && repeat && password !== repeat ? { mismatch: true } : null;
}

/**
 * Modal "Mi cuenta" (MatDialog).
 *  - Escritorio: centrada (la configura NavbarComponent).
 *  - Móvil (<= 640px): PANTALLA COMPLETA (clase record-dialog-fs en styles.scss).
 */
@Component({
  selector: 'app-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
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
      .section {
        margin: 1.5rem 0 0.75rem;
        font-size: 1rem;
      }
      .pass-actions {
        display: flex;
        justify-content: flex-end;
      }

      /* Altura y peso objetivo: siempre en la misma línea, también en móvil */
      .pair {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
      }
      .pair mat-form-field {
        min-width: 0;
      }
    `,
  ],
  template: `
    <h2 mat-dialog-title>Mi cuenta</h2>

    <mat-dialog-content>
      <form
        id="profile-form"
        class="form-grid"
        [formGroup]="profileForm"
        (ngSubmit)="saveProfile()"
        novalidate
      >
        <mat-form-field class="full">
          <mat-label>Correo electrónico</mat-label>
          <input matInput disabled [value]="auth.user()?.email ?? ''" />
        </mat-form-field>

        <mat-form-field class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" autocomplete="name" />
          <mat-error>Indica tu nombre.</mat-error>
        </mat-form-field>

        <div class="full pair">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Altura</mat-label>
            <input
              matInput
              type="number"
              inputmode="decimal"
              step="0.01"
              formControlName="height"
            />
            <span matTextSuffix>m&nbsp;</span>
            <mat-hint>Para calcular el IMC.</mat-hint>
            <mat-error>Altura válida: 0,50–2,50 m.</mat-error>
          </mat-form-field>

          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Peso objetivo</mat-label>
            <input matInput type="number" inputmode="decimal" step="0.1" formControlName="target" />
            <span matTextSuffix>kg&nbsp;</span>
            <mat-hint>Para calcular los kg que faltan.</mat-hint>
            <mat-error>Peso válido: 20–500 kg.</mat-error>
          </mat-form-field>
        </div>
      </form>

      <h3 class="section">Cambiar contraseña</h3>
      <form
        id="password-form"
        class="form-grid"
        [formGroup]="passwordForm"
        (ngSubmit)="savePassword()"
        novalidate
      >
        <mat-form-field class="full">
          <mat-label>Nueva contraseña</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-error>Mínimo 8 caracteres.</mat-error>
        </mat-form-field>

        <mat-form-field class="full">
          <mat-label>Repetir contraseña</mat-label>
          <input matInput type="password" formControlName="repeat" autocomplete="new-password" />
          @if (passwordForm.hasError('mismatch')) {
            <mat-error>Las contraseñas no coinciden.</mat-error>
          } @else {
            <mat-error>Repite la contraseña.</mat-error>
          }
        </mat-form-field>

        <div class="full pass-actions">
          <button mat-stroked-button type="submit" [disabled]="savingPassword()">
            Actualizar contraseña
          </button>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cerrar</button>
      <button mat-flat-button type="submit" form="profile-form" [disabled]="savingProfile()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
})
export class UserDialogComponent {
  protected readonly auth = inject(AuthService);
  protected readonly ref = inject<MatDialogRef<UserDialogComponent>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  private readonly profile = this.auth.profile();

  protected readonly profileForm = this.fb.group({
    name: this.fb.nonNullable.control(this.profile?.name ?? '', [
      Validators.required,
      Validators.maxLength(80),
    ]),
    height: this.fb.control<number | null>(this.profile?.height ?? null, [
      Validators.min(0.5),
      Validators.max(2.5),
    ]),
    target: this.fb.control<number | null>(this.profile?.target ?? null, [
      Validators.min(20),
      Validators.max(500),
    ]),
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      repeat: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    try {
      const { name, height, target } = this.profileForm.getRawValue();
      await this.auth.updateProfile({ name: name.trim(), height, target });
      this.notify.success('Datos guardados');
      this.ref.close();
    } catch {
      this.notify.error('No se pudieron guardar los datos');
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    try {
      await this.auth.changePassword(this.passwordForm.getRawValue().password);
      this.passwordForm.reset();
      this.notify.success('Contraseña actualizada');
    } catch {
      this.notify.error('No se pudo actualizar la contraseña');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
