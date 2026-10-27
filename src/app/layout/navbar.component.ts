import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../core/auth.service';
import { InstallService } from '../core/install.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, MenubarModule, DialogModule],
  template: `
    <header class="topbar">
      @if (auth.user()) {
        <p-menubar [model]="items()">
          <ng-template #start>
            <a routerLink="/" class="brand" aria-label="Inicio">
              <img src="icons/icon-72x72.png" alt="" />
              <span>Peso</span>
            </a>
          </ng-template>
        </p-menubar>
      } @else {
        <div class="brand-bar">
          <a routerLink="/" class="brand" aria-label="Inicio">
            <img src="icons/icon-72x72.png" alt="" />
            <span>Peso</span>
          </a>
        </div>
      }
    </header>

    <p-dialog header="Instalar en iPhone / iPad" [(visible)]="iosHelp"
              [modal]="true" [draggable]="false" [style]="{ width: '90vw', maxWidth: '24rem' }">
      <ol>
        <li>Abre esta web en <strong>Safari</strong>.</li>
        <li>Pulsa el botón <strong>Compartir</strong>.</li>
        <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
      </ol>
    </p-dialog>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  private readonly install = inject(InstallService);
  protected readonly iosHelp = signal(false);

  protected readonly items = computed<MenuItem[]>(() => [
    {
      label: 'Instalar app',
      icon: 'pi pi-download',
      visible: this.install.available(),
      command: () => this.onInstall(),
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => this.auth.signOut(),
    },
  ]);

  private async onInstall(): Promise<void> {
    if ((await this.install.prompt()) === 'ios') this.iosHelp.set(true);
  }
}
