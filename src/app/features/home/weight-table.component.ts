import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { WeightRecord } from '../../core/models';
import { imcBand } from '../../core/imc';

@Component({
  selector: 'app-weight-table',
  imports: [
    DatePipe,
    DecimalPipe,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <!-- Escritorio -->
    <div class="only-desktop">
      <table mat-table class="rec-table" [dataSource]="page()">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Fecha</th>
          <td mat-cell *matCellDef="let r">{{ r.date | date: 'dd/MM/yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="weight">
          <th mat-header-cell *matHeaderCellDef class="num">Peso (kg)</th>
          <td mat-cell *matCellDef="let r" class="num">{{ r.weight | number: '1.1-2' }}</td>
        </ng-container>

        <ng-container matColumnDef="imc">
          <th mat-header-cell *matHeaderCellDef>IMC</th>
          <td mat-cell *matCellDef="let r">
            @if (r.imc !== null) {
              <span
                class="imc-badge"
                [style.background]="band(r.imc).color"
                [title]="band(r.imc).label"
              >
                {{ r.imc | number: '1.1-2' }}
              </span>
            } @else {
              —
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="waist">
          <th mat-header-cell *matHeaderCellDef class="num">Cintura (cm)</th>
          <td mat-cell *matCellDef="let r" class="num">
            {{ r.waist !== null ? (r.waist | number: '1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="thigh">
          <th mat-header-cell *matHeaderCellDef class="num">Muslo (cm)</th>
          <td mat-cell *matCellDef="let r" class="num">
            {{ r.thigh !== null ? (r.thigh | number: '1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="chest">
          <th mat-header-cell *matHeaderCellDef class="num">Pecho (cm)</th>
          <td mat-cell *matCellDef="let r" class="num">
            {{ r.chest !== null ? (r.chest | number: '1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="arm">
          <th mat-header-cell *matHeaderCellDef class="num">Brazo (cm)</th>
          <td mat-cell *matCellDef="let r" class="num">
            {{ r.arm !== null ? (r.arm | number: '1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="actions">Acciones</th>
          <td mat-cell *matCellDef="let r" class="actions">
            <button
              mat-icon-button
              type="button"
              aria-label="Editar registro"
              (click)="edit.emit(r)"
            >
              <mat-icon>edit</mat-icon>
            </button>
            <button
              mat-icon-button
              type="button"
              aria-label="Eliminar registro"
              (click)="remove.emit(r)"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let r; columns: columns"></tr>
        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell" [attr.colspan]="columns.length">Aún no hay registros.</td>
        </tr>
      </table>
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
            <div>
              <dt>Peso</dt>
              <dd>{{ r.weight | number: '1.1-2' }} kg</dd>
            </div>
            <div>
              <dt>Cintura</dt>
              <dd>{{ r.waist !== null ? (r.waist | number: '1.0-1') + ' cm' : '—' }}</dd>
            </div>
            <div>
              <dt>Muslo</dt>
              <dd>{{ r.thigh !== null ? (r.thigh | number: '1.0-1') + ' cm' : '—' }}</dd>
            </div>
            <div>
              <dt>Pecho</dt>
              <dd>{{ r.chest !== null ? (r.chest | number: '1.0-1') + ' cm' : '—' }}</dd>
            </div>
            <div>
              <dt>Brazo</dt>
              <dd>{{ r.arm !== null ? (r.arm | number: '1.0-1') + ' cm' : '—' }}</dd>
            </div>
          </dl>
          <footer>
            <button mat-button type="button" (click)="edit.emit(r)">
              <mat-icon>edit</mat-icon>
              Editar
            </button>
            <button mat-button type="button" (click)="remove.emit(r)">
              <mat-icon>delete</mat-icon>
              Eliminar
            </button>
          </footer>
        </article>
      } @empty {
        <p>Aún no hay registros.</p>
      }
    </div>

    @if (records().length > rows) {
      <mat-paginator
        aria-label="Seleccionar página de registros"
        [length]="records().length"
        [pageSize]="rows"
        [pageIndex]="pageIndex()"
        [hidePageSize]="true"
        (page)="onPage($event)"
      />
    }
  `,
})
export class WeightTableComponent {
  readonly records = input.required<WeightRecord[]>();
  readonly edit = output<WeightRecord>();
  readonly remove = output<WeightRecord>();

  protected readonly rows = 6;
  protected readonly pageIndex = signal(0);
  protected readonly band = imcBand;
  protected readonly columns = [
    'date',
    'weight',
    'imc',
    'waist',
    'thigh',
    'chest',
    'arm',
    'actions',
  ];

  protected readonly page = computed(() => {
    const first = this.pageIndex() * this.rows;
    return this.records().slice(first, first + this.rows);
  });

  constructor() {
    // Si tras borrar quedamos en una página que ya no existe, volver a la primera
    effect(() => {
      if (this.pageIndex() > 0 && this.pageIndex() * this.rows >= this.records().length) {
        this.pageIndex.set(0);
      }
    });
  }

  protected onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
  }
}
