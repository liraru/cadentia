import { Component, computed, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { WeightRecord } from '../../core/models';

type Metric = 'weight' | 'imc' | 'waist' | 'thigh' | 'chest' | 'arm';

@Component({
  selector: 'app-weight-chart',
  imports: [FormsModule, ChartModule, SelectModule],
  template: `
    <div class="chart-head">
      <p-select [options]="metrics" optionLabel="label" optionValue="value"
                [ngModel]="metric()" (ngModelChange)="metric.set($event)"
                aria-label="Magnitud a mostrar" />
    </div>

    @if (records().length === 0) {
      <p>Todavía no hay registros. Añade el primero para ver la evolución.</p>
    } @else {
      <div class="chart-wrap">
        <p-chart type="line" [data]="data()" [options]="options" [responsive]="true" height="100%" />
      </div>
    }
  `,
})
export class WeightChartComponent {
  readonly records = input.required<WeightRecord[]>();

  protected readonly metrics: { label: string; value: Metric }[] = [
    { label: 'Peso (kg)', value: 'weight' },
    { label: 'IMC', value: 'imc' },
    { label: 'Cintura (cm)', value: 'waist' },
    { label: 'Muslo (cm)', value: 'thigh' },
    { label: 'Pecho (cm)', value: 'chest' },
    { label: 'Brazo (cm)', value: 'arm' },
  ];
  protected readonly metric = signal<Metric>('weight');

  protected readonly data = computed(() => {
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

  protected readonly options = {
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
}
