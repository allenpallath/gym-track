import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { platesPerSide } from '@core/training/plates';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';

interface PlateView {
  kg: number;
  /** Disc height as % of the largest plate. */
  height: number;
  tone: 'pink' | 'lime' | 'neutral';
}

/** Sheet showing which plates to load on each side of the bar for a target weight. */
@Component({
  selector: 'app-plate-calculator',
  imports: [BottomSheetComponent, DecimalPipe],
  template: `
    <app-bottom-sheet title="Plates" (closed)="closed.emit()">
      <p class="target">
        <span class="display-number">{{ targetKg() | number: '1.0-2' }}</span> kg
        <span class="caption">· {{ barKg() | number: '1.0-2' }} kg bar</span>
      </p>

      <div class="bar" aria-hidden="true">
        <span class="sleeve"></span>
        @for (plate of plateViews(); track $index) {
          <span class="disc" [class]="'disc disc--' + plate.tone" [style.height.%]="plate.height"></span>
        }
        <span class="collar"></span>
      </div>

      @if (load().plates.length) {
        <p class="per-side">
          Per side: <strong>{{ perSideText() }}</strong>
        </p>
      } @else {
        <p class="per-side">Just the bar.</p>
      }
      @if (load().remainder > 0) {
        <p class="warn">Can't make it exactly — {{ load().remainder | number: '1.0-2' }} kg short with your plates.</p>
      }
    </app-bottom-sheet>
  `,
  styleUrl: './plate-calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlateCalculatorComponent {
  readonly targetKg = input.required<number>();
  readonly barKg = input.required<number>();
  readonly platesKg = input.required<number[]>();
  readonly closed = output<void>();

  protected readonly load = computed(() => platesPerSide(this.targetKg(), this.barKg(), this.platesKg()));

  protected readonly plateViews = computed<PlateView[]>(() => {
    const max = Math.max(...this.platesKg(), 1);
    return this.load().plates.map((kg) => ({
      kg,
      // Smaller plates have smaller diameters, but keep them visible.
      height: Math.max(38, Math.round((kg / max) * 100)),
      tone: kg >= 20 ? 'pink' : kg >= 10 ? 'lime' : 'neutral',
    }));
  });

  protected readonly perSideText = computed(() => this.load().plates.join(' + ') + ' kg');
}
