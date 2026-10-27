import { Component, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../core/auth.service';
import { WeightService } from '../../core/weight.service';
import { WeightRecord } from '../../core/models';
import { LoginFormComponent } from './login-form.component';
import { WeightChartComponent } from './weight-chart.component';
import { WeightTableComponent } from './weight-table.component';
import { RecordDialogComponent } from './record-dialog.component';

@Component({
  selector: 'app-home',
  imports: [
    ButtonModule, CardModule, LoginFormComponent,
    WeightChartComponent, WeightTableComponent, RecordDialogComponent,
  ],
  template: `
    @if (auth.ready()) {
      @if (auth.user()) {
        <div class="dash-head">
          <h1>Hola, {{ auth.profile()?.name }}</h1>
          <p-button class="only-desktop" label="Añadir registro" icon="pi pi-plus" (onClick)="openNew()" />
        </div>

        <p-card header="Evolución">
          <app-weight-chart [records]="weights.records()" />
        </p-card>

        <p-card header="Últimos registros">
          <app-weight-table [records]="weights.records()" (edit)="openEdit($event)" (remove)="askDelete($event)" />
        </p-card>

        <!-- Botón flotante (móvil) -->
        <p-button class="only-mobile fab" icon="pi pi-plus" [rounded]="true"
                  ariaLabel="Añadir registro" (onClick)="openNew()" />

        <app-record-dialog [(visible)]="dialogOpen" [record]="editing()" />
      } @else {
        <app-login-form />
      }
    }
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly weights = inject(WeightService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<WeightRecord | null>(null);

  protected openNew(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(r: WeightRecord): void {
    this.editing.set(r);
    this.dialogOpen.set(true);
  }

  protected askDelete(r: WeightRecord): void {
    this.confirm.confirm({
      header: 'Eliminar registro',
      message: `¿Eliminar el registro del ${formatDate(r.date, 'dd/MM/yyyy', 'es')}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: async () => {
        try {
          await this.weights.remove(r.record_id);
          this.toast.add({ severity: 'success', summary: 'Registro eliminado', life: 2500 });
        } catch {
          this.toast.add({ severity: 'error', summary: 'No se pudo eliminar el registro' });
        }
      },
    });
  }
}
