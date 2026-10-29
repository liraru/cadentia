import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { formatDate, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type { Chart, ChartData, ChartOptions } from 'chart.js';
import { fmtNum } from '../../core/number-format';
import { WeightRecord } from '../../core/models';
import { sortAsc } from '../../core/weight-stats';

type Metric = 'weight' | 'measures';
type LineData = ChartData<'line', (number | null)[], string>;
type LineDataset = LineData['datasets'][number];

interface ChartView {
  data: LineData;
  options: ChartOptions<'line'>;
}

interface Diff {
  text: string;
  icon: string;
  /** true: va en la dirección deseada · false: en la contraria · null: sin cambios */
  good: boolean | null;
}

interface Summary {
  label: string;
  value: string | null;
  unit: string;
  diff: Diff | null;
  chips: { label: string; color: string; text: string }[];
}

const GOLD = '#E8C98F';
const TEXT = '#F3F0E8';

/** Medidas corporales que se dibujan juntas en la opción "Medidas". */
const MEASURES: { key: 'waist' | 'thigh' | 'chest' | 'arm'; label: string; color: string }[] = [
  { key: 'waist', label: 'Cintura', color: '#E8C98F' },
  { key: 'thigh', label: 'Muslo', color: '#8FCB9F' },
  { key: 'chest', label: 'Pecho', color: '#8DB8D6' },
  { key: 'arm', label: 'Brazo', color: '#E8907E' },
];

function axisDate(iso: string, withYear: boolean): string {
  if (withYear) return formatDate(iso, 'd MMM yyyy', 'es');
  const s = formatDate(iso, 'd MMM', 'es');
  return s.endsWith('.') ? s : `${s}.`;
}

@Component({
  selector: 'app-weight-chart',
  imports: [MatIconModule],
  host: { class: 'card' },
  styles: [
    `
      :host {
        display: block;
      }

      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
      }
      .main {
        flex: 1 1 auto;
        min-width: 0;
      }

      /* Título pegado a la cifra */
      .label {
        display: block;
        color: var(--text-2);
        font-size: 1rem;
        line-height: 1.2;
      }
      .value {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
        margin-top: 0.1rem;
      }
      .value strong {
        font-family: var(--font-heading);
        font-size: 2.6rem;
        font-weight: 400;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .value span {
        color: var(--text-2);
        font-size: 1.05rem;
      }

      /* Selector de datos (segmentado) */
      .seg {
        display: inline-flex;
        gap: 2px;
        padding: 3px;
        margin-left: auto;
        border-radius: 999px;
        background: rgba(243, 240, 232, 0.06);
      }
      .seg button {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--text-2);
        font: inherit;
        font-size: 0.8rem;
        min-height: 36px;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        cursor: pointer;
      }
      .seg button.on {
        background: rgba(232, 201, 152, 0.16);
        color: var(--gold);
        font-weight: 600;
      }
      .seg button:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }

      .diff {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin: 0.6rem 0 0;
        font-size: 0.9rem;
        color: var(--text-2);
      }
      .diff mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
      }
      .diff b {
        font-weight: 600;
      }
      .diff.good mat-icon,
      .diff.good b {
        color: var(--positive);
      }
      .diff.bad mat-icon,
      .diff.bad b {
        color: var(--negative);
      }

      /* Medidas actuales (leyenda de la opción "Medidas") */
      .chips {
        list-style: none;
        margin: 0.75rem 0 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem 1rem;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.85rem;
        color: var(--text-2);
      }
      .chip i {
        flex: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .chip b {
        color: var(--text);
        font-weight: 600;
      }

      .chart-wrap {
        position: relative;
        height: clamp(170px, 26vh, 280px);
        margin-top: 1rem;
      }
      .chart-wrap canvas {
        display: block;
      }

      .dates {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: var(--text-2);
      }

      .empty {
        margin: 1.25rem 0 0.25rem;
        color: var(--text-2);
      }

      @media (min-width: 560px) {
        .chips {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `,
  ],
  template: `
    <div class="head">
      <div class="main">
        <span class="label">{{ summary().label }}</span>
        @if (summary().value !== null) {
          <div class="value">
            <strong>{{ summary().value }}</strong>
            @if (summary().unit) {
              <span>{{ summary().unit }}</span>
            }
          </div>
        }
      </div>

      <div class="seg" role="radiogroup" aria-label="Datos a mostrar">
        @for (m of metrics; track m.value) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="metric() === m.value"
            [class.on]="metric() === m.value"
            (click)="metric.set(m.value)"
          >
            {{ m.label }}
          </button>
        }
      </div>
    </div>

    @if (records().length === 0) {
      <p class="empty">Todavía no hay registros. Añade el primero para ver la evolución.</p>
    } @else {
      @if (summary().diff; as d) {
        <p class="diff" [class.good]="d.good === true" [class.bad]="d.good === false">
          <mat-icon aria-hidden="true">{{ d.icon }}</mat-icon>
          <b>{{ d.text }}</b>
          <span>respecto al pesaje anterior</span>
        </p>
      }
      @if (summary().chips.length) {
        <ul class="chips">
          @for (c of summary().chips; track c.label) {
            <li class="chip">
              <i [style.background]="c.color"></i>
              <span>{{ c.label }}</span>
              <b>{{ c.text }}</b>
            </li>
          }
        </ul>
      }

      <div class="chart-wrap">
        <canvas #canvas role="img" aria-label="Gráfica de evolución"></canvas>
      </div>

      <div class="dates" aria-hidden="true">
        @for (d of dates(); track $index) {
          <span>{{ d }}</span>
        }
      </div>
    }
  `,
})
export class WeightChartComponent {
  readonly records = input.required<WeightRecord[]>();
  /** Peso objetivo (kg); sirve para decidir si la diferencia es favorable. */
  readonly target = input<number | null>(null);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'line', (number | null)[], string>;
  private destroyed = false;

  protected readonly metrics: { label: string; value: Metric }[] = [
    { label: 'Peso', value: 'weight' },
    { label: 'Medidas', value: 'measures' },
  ];
  protected readonly metric = signal<Metric>('weight');

  private readonly asc = computed(() => sortAsc(this.records()));

  /** Fechas bajo la gráfica: primera, central y última. */
  protected readonly dates = computed<string[]>(() => {
    const asc = this.asc();
    const n = asc.length;
    if (n === 0) return [];
    const withYear = asc[0].date.slice(0, 4) !== asc[n - 1].date.slice(0, 4);
    const pick = n === 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1];
    return pick.map((i) => axisDate(asc[i].date, withYear));
  });

  /** Peso actual y diferencia respecto al pesaje anterior (o medidas actuales). */
  protected readonly summary = computed<Summary>(() => {
    const asc = this.asc();

    if (this.metric() === 'measures') {
      const chips = MEASURES.map((ms) => {
        const last = [...asc].reverse().find((r) => r[ms.key] !== null);
        return {
          label: ms.label,
          color: ms.color,
          text: last ? `${fmtNum(last[ms.key]!, 0, 1)} cm` : '—',
        };
      });
      return { label: 'Medidas actuales', value: null, unit: '', diff: null, chips };
    }

    const base = { label: 'Peso actual', unit: 'kg', chips: [] };
    if (asc.length === 0) return { ...base, value: null, diff: null };

    const current = asc[asc.length - 1].weight;

    let diff: Diff | null = null;
    if (asc.length > 1) {
      const prev = asc[asc.length - 2].weight;
      const delta = Math.round((current - prev) * 100) / 100;
      const target = this.target();

      if (delta === 0) {
        diff = { text: 'Sin cambios', icon: 'trending_flat', good: null };
      } else {
        const good =
          target !== null ? Math.abs(current - target) <= Math.abs(prev - target) : delta < 0;
        diff = {
          text: `${delta < 0 ? '−' : '+'}${fmtNum(Math.abs(delta))} kg`,
          icon: delta < 0 ? 'trending_down' : 'trending_up',
          good,
        };
      }
    }

    return { ...base, value: fmtNum(current, 1, 2), diff };
  });

  private readonly view = computed<ChartView>(() => {
    const asc = this.asc();
    const isMeasures = this.metric() === 'measures';
    const labels = asc.map((r) => formatDate(r.date, 'd MMM yyyy', 'es'));

    const dataset = (
      label: string,
      data: (number | null)[],
      color: string,
      endRadius: number,
    ): LineDataset => {
      const last = data.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
      return {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isMeasures ? 3 : 4,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        cubicInterpolationMode: 'monotone',
        fill: false,
        spanGaps: true,
        // Solo se marca el último punto
        pointRadius: data.map((_, i) => (i === last ? endRadius : 0)),
        pointHoverRadius: endRadius,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointBorderWidth: 0,
        pointHitRadius: 16,
      };
    };

    const datasets: LineDataset[] = isMeasures
      ? MEASURES.map((ms) =>
          dataset(
            ms.label,
            asc.map((r) => r[ms.key]),
            ms.color,
            5,
          ),
        )
      : [
          dataset(
            'Peso',
            asc.map((r) => r.weight),
            GOLD,
            8,
          ),
        ];

    const unit = isMeasures ? 'cm' : 'kg';

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, right: 10, bottom: 8, left: 4 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: isMeasures,
          backgroundColor: '#27302A',
          titleColor: TEXT,
          bodyColor: TEXT,
          borderColor: 'rgba(232,201,152,.35)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null) return '';
              return `${ctx.dataset.label}: ${fmtNum(v, 1, 2)} ${unit}`;
            },
          },
        },
      },
      scales: {
        x: { display: false },
        y: {
          grace: '20%',
          // Chart.js 4: el guion de las líneas de guía va en border.dash
          border: { display: false, dash: [6, 6] },
          ticks: { display: false, count: 3 },
          grid: {
            color: 'rgba(243,240,232,.14)',
            lineWidth: 1.5,
            drawTicks: false,
          },
        },
      },
    };

    return { data: { labels, datasets }, options };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.chart?.destroy();
    });

    // Chart.js solo se carga y se pinta en el navegador (evita fallos de SSR)
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const view = this.view();
      if (!this.isBrowser) return;
      if (!canvas) {
        this.chart?.destroy();
        this.chart = undefined;
        return;
      }
      untracked(() => void this.draw(canvas, view));
    });
  }

  private async draw(canvas: HTMLCanvasElement, view: ChartView): Promise<void> {
    const {
      Chart: ChartJs,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Tooltip,
    } = await import('chart.js');
    ChartJs.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Tooltip,
    );

    if (this.destroyed || !canvas.isConnected) return;

    if (this.chart && this.chart.canvas !== canvas) {
      this.chart.destroy();
      this.chart = undefined;
    }
    if (this.chart) {
      this.chart.data = view.data;
      this.chart.options = view.options;
      this.chart.update();
      return;
    }
    this.chart = new ChartJs(canvas, { type: 'line', data: view.data, options: view.options });
  }
}
