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
  styles: [
    `
      /* Separación entre el título "Últimos registros" y la primera tarjeta */
      .only-mobile {
        padding-top: 1rem;
      }

      /* ---------- Tarjeta de registro (móvil) ---------- */
      .rec-card {
        background: var(--surface);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 16px;
        padding: 0; /* anula el padding heredado de styles.scss */
        margin-bottom: 1rem;
        overflow: hidden; /* la cabecera respeta el radio de la tarjeta */
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
      }

      /* Cabecera: franja más oscura, separada del contenido por una línea */
      .rec-card header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin: 0; /* anula el margin-bottom heredado de styles.scss */
        padding: 0.9rem 1rem;
        background: rgba(32, 41, 35, 0.55);
        border-bottom: 1px solid rgba(112, 182, 138, 0.22);
        border-radius: 15px 15px 0 0; /* 16px de la tarjeta - 1px del borde */
      }
      .rec-card header strong {
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.02em;
        font-variant-numeric: tabular-nums;
      }
      .rec-card header .imc-badge {
        display: inline-flex;
        align-items: center;
        line-height: 1;
        padding: 0.4rem 0.7rem;
      }

      /* Contenido */
      .rec-card dl {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.1rem 1.25rem;
        margin: 0;
        padding: 1.25rem 1rem 1.1rem;
      }
      .rec-card dt {
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.6;
        margin-bottom: 0.2rem;
      }
      .rec-card dd {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      /* El peso es el dato principal: más grande y con el verde de acento */
      .rec-card dl > div:first-child dd {
        font-size: 1.4rem;
        font-weight: 700;
        color: #70b68a;
      }

      /* Acciones */
      .rec-card footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-top: 1px solid rgba(240, 243, 239, 0.08);
      }
    `,
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
