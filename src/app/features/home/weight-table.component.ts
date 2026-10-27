import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { WeightRecord } from '../../core/models';
import { imcBand } from '../../core/imc';

@Component({
  selector: 'app-weight-table',
  imports: [DatePipe, DecimalPipe, TableModule, PaginatorModule, ButtonModule],
  template: `
    <!-- Escritorio -->
    <div class="only-desktop">
      <p-table [value]="page()" dataKey="record_id" size="small" [stripedRows]="true">
        <ng-template #header>
          <tr>
            <th>Fecha</th>
            <th class="num">Peso (kg)</th>
            <th>IMC</th>
            <th class="num">Cintura (cm)</th>
            <th class="num">Muslo (cm)</th>
            <th class="num">Pecho (cm)</th>
            <th class="num">Brazo (cm)</th>
            <th class="actions">Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-r>
          <tr>
            <td>{{ r.date | date: 'dd/MM/yyyy' }}</td>
            <td class="num">{{ r.weight | number: '1.1-2' }}</td>
            <td>
              @if (r.imc !== null) {
                <span class="imc-badge" [style.background]="band(r.imc).color" [title]="band(r.imc).label">
                  {{ r.imc | number: '1.1-2' }}
                </span>
              } @else { — }
            </td>
            <td class="num">{{ r.waist !== null ? (r.waist | number: '1.0-1') : '—' }}</td>
            <td class="num">{{ r.thigh !== null ? (r.thigh | number: '1.0-1') : '—' }}</td>
            <td class="num">{{ r.chest !== null ? (r.chest | number: '1.0-1') : '—' }}</td>
            <td class="num">{{ r.arm !== null ? (r.arm | number: '1.0-1') : '—' }}</td>
            <td class="actions">
              <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary"
                        ariaLabel="Editar registro" (onClick)="edit.emit(r)" />
              <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger"
                        ariaLabel="Eliminar registro" (onClick)="remove.emit(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="8">Aún no hay registros.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Móvil -->
    <div class="only-mobile">
      @for (r of page(); track r.record_id) {
        <article class="rec-card">
          <header>
            <strong>{{ r.date | date: 'dd/MM/yyyy' }}</strong>
            @if (r.imc !== null) {
              <span class="imc-badge" [style.background]="band(r.imc).color">
                IMC {{ r.imc | number: '1.1-2' }} · {{ band(r.imc).label }}
              </span>
            }
          </header>
          <dl>
            <div><dt>Peso</dt><dd>{{ r.weight | number: '1.1-2' }} kg</dd></div>
            <div><dt>Cintura</dt><dd>{{ r.waist !== null ? (r.waist | number: '1.0-1') + ' cm' : '—' }}</dd></div>
            <div><dt>Muslo</dt><dd>{{ r.thigh !== null ? (r.thigh | number: '1.0-1') + ' cm' : '—' }}</dd></div>
            <div><dt>Pecho</dt><dd>{{ r.chest !== null ? (r.chest | number: '1.0-1') + ' cm' : '—' }}</dd></div>
            <div><dt>Brazo</dt><dd>{{ r.arm !== null ? (r.arm | number: '1.0-1') + ' cm' : '—' }}</dd></div>
          </dl>
          <footer>
            <p-button icon="pi pi-pencil" label="Editar" [text]="true" severity="secondary" (onClick)="edit.emit(r)" />
            <p-button icon="pi pi-trash" label="Eliminar" [text]="true" severity="danger" (onClick)="remove.emit(r)" />
          </footer>
        </article>
      } @empty {
        <p>Aún no hay registros.</p>
      }
    </div>

    <p-paginator [first]="first()" [rows]="rows" [totalRecords]="records().length"
                 [alwaysShow]="false" [showJumpToPageDropdown]="false"
                 (onPageChange)="onPage($event)" />
  `,
})
export class WeightTableComponent {
  readonly records = input.required<WeightRecord[]>();
  readonly edit = output<WeightRecord>();
  readonly remove = output<WeightRecord>();

  protected readonly rows = 6;
  protected readonly first = signal(0);
  protected readonly band = imcBand;

  protected readonly page = computed(() =>
    this.records().slice(this.first(), this.first() + this.rows),
  );

  constructor() {
    // Si tras borrar quedamos en una página que ya no existe, volver a la primera
    effect(() => {
      if (this.first() > 0 && this.first() >= this.records().length) this.first.set(0);
    });
  }

  protected onPage(e: PaginatorState): void {
    this.first.set(e.first ?? 0);
  }
}
