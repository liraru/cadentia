import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NavbarComponent } from './layout/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ToastModule, ConfirmDialogModule],
  template: `
    <app-navbar />
    <main class="page">
      <router-outlet />
    </main>
    <p-toast position="top-center" />
    <p-confirmdialog [style]="{ width: '90vw', maxWidth: '26rem' }" />
  `,
})
export class App {}
