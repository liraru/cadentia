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

type Metric = 'weight' | 'imc' | 'waist' | 'thigh' | 'chest' | 'arm';
type LineData = ChartData<'line', (number | null)[], string>;

@Component({
  selector: 'app-weight-chart',
  imports: [MatFormFieldModule, MatSelectModule],
  template: `
    <div class="chart-head">
      <mat-form-field>
        <mat-label>Magnitud</mat-label>
        <mat-select
          aria-label="Magnitud a mostrar"
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
    { label: 'Cintura (cm)', value: 'waist' },
    { label: 'Muslo (cm)', value: 'thigh' },
    { label: 'Pecho (cm)', value: 'chest' },
    { label: 'Brazo (cm)', value: 'arm' },
  ];
  protected readonly metric = signal<Metric>('weight');

  private readonly data = computed<LineData>(() => {
    const asc = [...this.records()].sort((a, b) => a.date.localeCompare(b.date));
    const m = this.metric();
    const label = this.metrics.find((x) => x.value === m)!.label;
    return {
      labels: asc.map((r) => formatDate(r.date, 'dd/MM/yy', 'es')),
      datasets: [
        {
          label,
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
  });

  private readonly options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.chart?.destroy();
    });

    // Chart.js solo se carga y se pinta en el navegador (evita fallos de SSR)
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const data = this.data();
      if (!this.isBrowser) return;
      if (!canvas) {
        this.chart?.destroy();
        this.chart = undefined;
        return;
      }
      untracked(() => void this.draw(canvas, data));
    });
  }

  private async draw(canvas: HTMLCanvasElement, data: LineData): Promise<void> {
    const {
      Chart: ChartJs,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Tooltip,
    } = await import('chart.js');
    ChartJs.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Tooltip,
    );

    if (this.destroyed || !canvas.isConnected) return;

    if (this.chart && this.chart.canvas !== canvas) {
      this.chart.destroy();
      this.chart = undefined;
    }
    if (this.chart) {
      this.chart.data = data;
      this.chart.update();
      return;
    }
    this.chart = new ChartJs(canvas, { type: 'line', data, options: this.options });
  }
}
