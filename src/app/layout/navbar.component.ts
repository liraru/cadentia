import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth.service';
import { InstallService } from '../core/install.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
  ],
  template: `
    <header class="topbar">
      <mat-toolbar>
        <a routerLink="/" class="brand" aria-label="Inicio">
          <img src="icons/icon-72x72.png" alt="" />
          <span>Cadentia</span>
        </a>

        <span class="spacer"></span>

        @if (auth.user()) {
          <!-- Escritorio: acciones en la barra -->
          <nav class="only-desktop nav-actions">
            @if (install.available()) {
              <button mat-button type="button" (click)="onInstall()">
                <mat-icon>download</mat-icon>
                Instalar app
              </button>
            }
            <button mat-button type="button" (click)="auth.signOut()">
              <mat-icon>logout</mat-icon>
              Cerrar sesión
            </button>
          </nav>

          <!-- Móvil: hamburguesa con menú desplegable -->
          <div class="only-mobile">
            <button mat-icon-button type="button" [matMenuTriggerFor]="menu" aria-label="Menú">
              <mat-icon>menu</mat-icon>
            </button>
            <mat-menu #menu="matMenu" xPosition="before">
              @if (install.available()) {
                <button mat-menu-item type="button" (click)="onInstall()">
                  <mat-icon>download</mat-icon>
                  <span>Instalar app</span>
                </button>
              }
              <button mat-menu-item type="button" (click)="auth.signOut()">
                <mat-icon>logout</mat-icon>
                <span>Cerrar sesión</span>
              </button>
            </mat-menu>
          </div>
        }
      </mat-toolbar>
    </header>

    <ng-template #iosHelp>
      <h2 mat-dialog-title>Instalar en iPhone / iPad</h2>
      <mat-dialog-content>
        <ol>
          <li>Abre esta web en <strong>Safari</strong>.</li>
          <li>Pulsa el botón <strong>Compartir</strong>.</li>
          <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
        </ol>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Entendido</button>
      </mat-dialog-actions>
    </ng-template>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly install = inject(InstallService);
  private readonly dialog = inject(MatDialog);
  private readonly iosHelp = viewChild.required<TemplateRef<unknown>>('iosHelp');

  protected async onInstall(): Promise<void> {
    if ((await this.install.prompt()) === 'ios') {
      this.dialog.open(this.iosHelp(), { width: '90vw', maxWidth: '24rem' });
    }
  }
}
