import { Component, computed, input } from '@angular/core';
import { IMC_LEVELS, calcImc, imcLevelIndex } from '../../core/imc';
import { WeightRecord } from '../../core/models';
import { fmtNum } from '../../core/number-format';
import { sortAsc } from '../../core/weight-stats';

/** Posición del tramo "Normal" en IMC_LEVELS: es la meta hacia la que apunta la card. */
const NORMAL = 1;

interface Row {
  label: string;
  color: string;
  /** Peso límite del tramo (el que hay que alcanzar para entrar en él). */
  weight: string;
  /** "Perder" o "Ganar" */
  verb: string;
  /** Diferencia en kg, siempre en valor absoluto. */
  diff: string;
  next: boolean;
}

interface View {
  state: 'no-height' | 'no-records' | 'normal' | 'steps';
  current: { label: string; color: string; imc: string } | null;
  rows: Row[];
  range: { from: string; to: string } | null;
}

/**
 * Peso (a 0,1 kg) con el que se entra en un tramo a partir de su límite de IMC.
 *  - fromAbove: bajando de peso. El tramo termina justo antes del límite, así que hay que quedar
 *    estrictamente por debajo (IMC < límite).
 *  - si no: subiendo de peso. Basta con llegar al límite (IMC >= límite).
 */
function boundaryWeight(imcLimit: number, heightM: number, fromAbove: boolean): number {
  const tenths = Math.ceil(imcLimit * heightM * heightM * 10 - 1e-9);
  return (fromAbove ? tenths - 1 : tenths) / 10;
}

/** Card de niveles de IMC: peso de cada nivel hasta llegar al normal y kg que faltan para cada uno. */
@Component({
  selector: 'app-imc-levels-card',
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
      .now {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.5rem 0 0;
        font-size: 0.95rem;
      }
      .now i,
      .dot {
        flex: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .now span {
        color: var(--text-2);
      }

      .rows {
        list-style: none;
        margin: 1rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.5rem;
      }
      .row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 0.85rem;
        border-radius: 14px;
        background: rgba(243, 240, 232, 0.04);
      }
      .row.next {
        background: rgba(232, 201, 152, 0.1);
        box-shadow: inset 0 0 0 1px rgba(232, 201, 152, 0.28);
      }
      .name {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.4rem;
        font-weight: 600;
      }
      .tag {
        padding: 0.05rem 0.5rem;
        border-radius: 999px;
        background: rgba(232, 201, 152, 0.16);
        color: var(--gold);
        font-size: 0.7rem;
        font-weight: 600;
      }
      .sub {
        display: block;
        margin-top: 0.1rem;
        font-size: 0.8rem;
        color: var(--text-2);
      }
      .diff {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        white-space: nowrap;
        font-size: 0.8rem;
        color: var(--text-2);
      }
      .diff b {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }

      .range {
        margin: 0.35rem 0 0;
        color: var(--text-2);
        font-size: 0.9rem;
      }
      .range b {
        color: var(--text);
        font-weight: 600;
      }
      .hint {
        margin: 0.6rem 0 0;
        color: var(--text-2);
        font-size: 0.9rem;
      }
    `,
  ],
  template: `
    <p class="label">Niveles de IMC</p>

    @switch (view().state) {
      @case ('no-height') {
        <p class="hint">
          Indica tu altura en «Mi cuenta» para ver a qué peso corresponde cada nivel de IMC.
        </p>
      }
      @case ('no-records') {
        <p class="hint">Añade tu primer registro para ver tus niveles de IMC.</p>
      }
      @case ('normal') {
        @if (view().current; as c) {
          <p class="now">
            <i [style.background]="c.color"></i>
            <strong>Estás en peso normal</strong>
            <span>· IMC {{ c.imc }}</span>
          </p>
        }
        @if (view().range; as r) {
          <p class="range">
            Para tu altura, el peso normal va de <b>{{ r.from }} kg</b> a <b>{{ r.to }} kg</b>.
          </p>
        }
      }
      @case ('steps') {
        @if (view().current; as c) {
          <p class="now">
            <i [style.background]="c.color"></i>
            <strong>{{ c.label }}</strong>
            <span>· IMC {{ c.imc }}</span>
          </p>
        }
        <ul class="rows">
          @for (r of view().rows; track r.label) {
            <li class="row" [class.next]="r.next">
              <i class="dot" [style.background]="r.color"></i>
              <div>
                <span class="name">
                  {{ r.label }}
                  @if (r.next) {
                    <span class="tag">Siguiente</span>
                  }
                </span>
                <span class="sub"
                  >{{ r.verb === 'Perder' ? 'Hasta' : 'Desde' }} {{ r.weight }} kg</span
                >
              </div>
              <div class="diff">
                <span>{{ r.verb }}</span>
                <b>{{ r.diff }} kg</b>
              </div>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class ImcLevelsCardComponent {
  readonly records = input.required<WeightRecord[]>();
  /** Altura del usuario en metros; null si aún no la ha indicado. */
  readonly height = input<number | null>(null);

  protected readonly view = computed<View>(() => {
    const empty: Omit<View, 'state'> = { current: null, rows: [], range: null };
    const h = this.height();
    if (h === null || h <= 0) return { ...empty, state: 'no-height' };

    const asc = sortAsc(this.records());
    if (asc.length === 0) return { ...empty, state: 'no-records' };

    const weight = asc[asc.length - 1].weight;
    const imc = calcImc(weight, h);
    const index = imcLevelIndex(imc);
    const level = IMC_LEVELS[index];
    const current = { label: level.label, color: level.color, imc: fmtNum(imc, 1, 2) };
    const kg = (v: number) => fmtNum(v, 1, 1);

    // Ya en peso normal: se muestra el rango de peso normal para su altura
    if (index === NORMAL) {
      return {
        state: 'normal',
        current,
        rows: [],
        range: {
          from: kg(boundaryWeight(IMC_LEVELS[NORMAL].min, h, false)),
          to: kg(boundaryWeight(IMC_LEVELS[NORMAL + 1].min, h, true)),
        },
      };
    }

    // Por debajo del normal: hay que ganar peso hasta el límite inferior del tramo normal
    if (index < NORMAL) {
      const limit = boundaryWeight(IMC_LEVELS[NORMAL].min, h, false);
      const target = IMC_LEVELS[NORMAL];
      return {
        state: 'steps',
        current,
        range: null,
        rows: [
          {
            label: target.label,
            color: target.color,
            weight: kg(limit),
            verb: 'Ganar',
            diff: kg(Math.abs(limit - weight)),
            next: true,
          },
        ],
      };
    }

    // Por encima del normal: un escalón por cada tramo inferior, del siguiente hasta el normal
    const rows: Row[] = [];
    for (let i = index - 1; i >= NORMAL; i--) {
      const limit = boundaryWeight(IMC_LEVELS[i + 1].min, h, true);
      rows.push({
        label: IMC_LEVELS[i].label,
        color: IMC_LEVELS[i].color,
        weight: kg(limit),
        verb: 'Perder',
        diff: kg(Math.abs(weight - limit)),
        next: i === index - 1,
      });
    }
    return { state: 'steps', current, rows, range: null };
  });
}
