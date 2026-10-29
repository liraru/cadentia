import { Component, computed, input } from '@angular/core';
import { fmtNum } from '../../core/number-format';
import { WeightRecord } from '../../core/models';
import { goalProgress, sortAsc } from '../../core/weight-stats';

/** Card "Objetivo": peso objetivo y barra de progreso (desde el primer registro hasta la meta). */
@Component({
  selector: 'app-goal-card',
  host: { class: 'card' },
  styles: [
    `
      :host {
        display: block;
      }
      .label {
        margin: 0;
        color: var(--text-2);
        font-size: 0.9rem;
      }
      .value {
        margin: 0.35rem 0 0.9rem;
        font-size: 1.6rem;
        font-weight: 700;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .value span {
        font-size: 1rem;
        font-weight: 400;
        color: var(--text-2);
      }
      .track {
        height: 6px;
        border-radius: 999px;
        background: var(--track);
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: inherit;
        background: var(--gold);
        transition: width 0.6s ease;
      }
      .caption {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        margin: 0.65rem 0 0;
        font-size: 0.85rem;
        color: var(--text-2);
      }
      .caption b {
        color: var(--text);
        font-weight: 600;
      }
      @media (prefers-reduced-motion: reduce) {
        .fill {
          transition: none;
        }
      }
    `,
  ],
  template: `
    <p class="label">Objetivo</p>

    @if (target() !== null) {
      <p class="value">{{ targetText() }} <span>kg</span></p>
      <div
        class="track"
        role="progressbar"
        aria-label="Progreso hacia tu meta"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="percent()"
      >
        <div class="fill" [style.width.%]="percent()"></div>
      </div>
      <p class="caption">
        <span>{{ percent() >= 100 ? '¡Meta alcanzada!' : 'Progreso' }}</span>
        <b>{{ percent() }} %</b>
      </p>
    } @else {
      <p class="value">—</p>
      <div class="track"><div class="fill" style="width: 0"></div></div>
      <p class="caption"><span>Indica tu peso objetivo en «Mi cuenta»</span></p>
    }
  `,
})
export class GoalCardComponent {
  readonly records = input.required<WeightRecord[]>();
  /** Peso objetivo (kg); null si aún no lo ha indicado. */
  readonly target = input<number | null>(null);

  protected readonly targetText = computed(() => fmtNum(this.target() ?? 0, 1, 2));

  protected readonly percent = computed(() => {
    const target = this.target();
    const asc = sortAsc(this.records());
    if (target === null || asc.length === 0) return 0;
    const start = asc[0].weight;
    const current = asc[asc.length - 1].weight;
    return Math.round(goalProgress(start, current, target) * 100);
  });
}
