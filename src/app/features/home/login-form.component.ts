import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="login-wrap">
      <p-card class="login-card">
        <div class="login-logo">
          <img src="icons/icon-192x192.png" alt="Logotipo" />
          <h1>Registro de peso</h1>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="email">Correo electrónico</label>
            <input id="email" pInputText type="email" formControlName="email"
                   autocomplete="username" inputmode="email" class="w-full" />
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <p-password inputId="password" formControlName="password" [feedback]="false"
                        [toggleMask]="true" [fluid]="true" autocomplete="current-password" />
          </div>

          @if (error()) {
            <p-message severity="error" styleClass="w-full">{{ error() }}</p-message>
          }

          <p-button type="submit" label="Entrar" icon="pi pi-sign-in" [fluid]="true"
                    [loading]="loading()" [disabled]="form.invalid" />
        </form>
      </p-card>
    </div>
  `,
})
export class LoginFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

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
