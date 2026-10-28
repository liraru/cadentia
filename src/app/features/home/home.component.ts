import { Component, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { NotifyService } from '../../core/notify.service';
import { WeightService } from '../../core/weight.service';
import { WeightRecord } from '../../core/models';
import { LoginFormComponent } from './login-form.component';
import { WeightChartComponent } from './weight-chart.component';
import { WeightTableComponent } from './weight-table.component';
import { RecordDialogComponent, RecordDialogData } from './record-dialog.component';

@Component({
  selector: 'app-home',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    LoginFormComponent,
    WeightChartComponent,
    WeightTableComponent,
  ],
  template: `
    @if (auth.ready()) {
      @if (auth.user()) {
        <div class="dash-head">
          <h1>Hola, {{ auth.profile()?.name }}</h1>
          <button mat-flat-button type="button" class="only-desktop" (click)="openRecord(null)">
            <mat-icon>add</mat-icon>
            Añadir registro
          </button>
        </div>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Evolución</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-weight-chart [records]="weights.records()" />
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Últimos registros</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-weight-table
              [records]="weights.records()"
              (edit)="openRecord($event)"
              (remove)="askDelete($event)"
            />
          </mat-card-content>
        </mat-card>

        <!-- Botón flotante (móvil) -->
        <button
          mat-fab
          type="button"
          class="fab"
          aria-label="Añadir registro"
          (click)="openRecord(null)"
        >
          <mat-icon>add</mat-icon>
        </button>
      } @else {
        <app-login-form />
      }
    }
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly weights = inject(WeightService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);

  /** Se llama desde un clic, así que siempre estamos en el navegador (no hay SSR aquí). */
  protected openRecord(record: WeightRecord | null): void {
    const mobile = typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
    this.dialog.open<RecordDialogComponent, RecordDialogData>(RecordDialogComponent, {
      data: { record, mobile },
      disableClose: true,
      ...(mobile
        ? {
            width: '100vw',
            maxWidth: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            panelClass: 'record-dialog-fs',
          }
        : { width: '30rem', maxWidth: '95vw' }),
    });
  }

  protected async askDelete(r: WeightRecord): Promise<void> {
    const result = await this.confirm.ask({
      title: 'Eliminar registro',
      message: `¿Eliminar el registro del ${formatDate(r.date, 'dd/MM/yyyy', 'es')}?\nEsta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (result !== 'confirm') return;

    try {
      await this.weights.remove(r.record_id);
      this.notify.success('Registro eliminado');
    } catch {
      this.notify.error('No se pudo eliminar el registro');
    }
  }
}
