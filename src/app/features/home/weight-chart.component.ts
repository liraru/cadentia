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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { Chart, ChartData, ChartOptions } from 'chart.js';
import { WeightRecord } from '../../core/models';

type Metric = 'weight' | 'imc' | 'measures';
type LineData = ChartData<'line', (number | null)[], string>;

interface ChartView {
  data: LineData;
  options: ChartOptions<'line'>;
}

/** Medidas corporales que se dibujan juntas en la opción "Medidas". */
const MEASURES: { key: 'waist' | 'thigh' | 'chest' | 'arm'; label: string; color: string }[] = [
  { key: 'waist', label: 'Cintura', color: '#70B68A' },
  { key: 'thigh', label: 'Muslo', color: '#E3C94A' },
  { key: 'chest', label: 'Pecho', color: '#5BA8D6' },
  { key: 'arm', label: 'Brazo', color: '#E8743B' },
];

@Component({
  selector: 'app-weight-chart',
  imports: [MatFormFieldModule, MatSelectModule],
  styles: [
    `
      :host {
        display: block;
        padding-top: 1rem;
      }
    `,
  ],
  template: `
    <div class="chart-head">
      <mat-form-field>
        <mat-label>Datos</mat-label>
        <mat-select
          aria-label="Datos a mostrar"
          [value]="metric()"
          (selectionChange)="metric.set($event.value)"
        >
          @for (m of metrics; track m.value) {
            <mat-option [value]="m.value">{{ m.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (records().length === 0) {
      <p>Todavía no hay registros. Añade el primero para ver la evolución.</p>
    } @else {
      <div class="chart-wrap">
        <canvas #canvas role="img" aria-label="Gráfica de evolución"></canvas>
      </div>
    }
  `,
})
export class WeightChartComponent {
  readonly records = input.required<WeightRecord[]>();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'line', (number | null)[], string>;
  private destroyed = false;

  protected readonly metrics: { label: string; value: Metric }[] = [
    { label: 'Peso (kg)', value: 'weight' },
    { label: 'IMC', value: 'imc' },
    { label: 'Medidas (cm)', value: 'measures' },
  ];
  protected readonly metric = signal<Metric>('weight');

  private readonly view = computed<ChartView>(() => {
    const asc = [...this.records()].sort((a, b) => a.date.localeCompare(b.date));
    const m = this.metric();
    const labels = asc.map((r) => formatDate(r.date, 'dd/MM/yy', 'es'));
    const isMeasures = m === 'measures';

    const data: LineData = isMeasures
      ? {
          labels,
          datasets: MEASURES.map((ms) => ({
            label: ms.label,
            data: asc.map((r) => r[ms.key]),
            borderColor: ms.color,
            backgroundColor: ms.color,
            pointBackgroundColor: ms.color,
            pointRadius: 3,
            tension: 0.3,
            fill: false,
            spanGaps: true,
          })),
        }
      : {
          labels,
          datasets: [
            {
              label: this.metrics.find((x) => x.value === m)!.label,
              data: asc.map((r) => r[m]),
              borderColor: '#70B68A',
              backgroundColor: 'rgba(112,182,138,.18)',
              pointBackgroundColor: '#F0F3EF',
              pointRadius: 3,
              tension: 0.3,
              fill: true,
              spanGaps: true,
            },
          ],
        };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: isMeasures ? { mode: 'index', intersect: false } : undefined,
      plugins: {
        legend: {
          display: isMeasures,
          labels: { color: '#F0F3EF', usePointStyle: true, boxWidth: 8 },
        },
      },
      scales: {
        x: {
          ticks: { color: '#F0F3EF', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
          grid: { color: 'rgba(240,243,239,.08)' },
        },
        y: {
          ticks: { color: '#F0F3EF' },
          grid: { color: 'rgba(240,243,239,.08)' },
        },
      },
    };

    return { data, options };
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
      Filler,
      Legend,
      Tooltip,
    } = await import('chart.js');
    ChartJs.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Legend,
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
