import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <div class="login-logo">
          <img src="icons/icon-192x192.png" alt="Logotipo" />
          <h1>Registro de peso</h1>
        </div>

        <form class="login-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field>
            <mat-label>Correo electrónico</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
              inputmode="email"
            />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Contraseña</mat-label>
            <input
              matInput
              formControlName="password"
              autocomplete="current-password"
              [type]="showPassword() ? 'text' : 'password'"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error()) {
            <div class="form-error" role="alert">
              <mat-icon>error</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          <button
            mat-flat-button
            type="submit"
            class="w-full"
            [disabled]="form.invalid || loading()"
          >
            @if (loading()) {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon>login</mat-icon>
            }
            Entrar
          </button>
        </form>
      </mat-card>
    </div>
  `,
})
export class LoginFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);
    } catch {
      this.error.set('Correo o contraseña incorrectos.');
    } finally {
      this.loading.set(false);
    }
  }
}
