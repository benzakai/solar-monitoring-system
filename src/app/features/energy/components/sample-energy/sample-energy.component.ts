import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { EnergySample } from '../../../../domain/energy';
import { MonitorItem } from '../../../../domain/monitor-item';
import {
  ClickedUpdate,
  SelectUpdate,
} from '../update-partition/update-partition-selected';

@Component({
  selector: 'app-sample-energy',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './sample-energy.component.html',
  styleUrl: './sample-energy.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleEnergyComponent {
  @Input() update: EnergySample | undefined;
  @Input() system: MonitorItem | undefined;

  element = inject(ElementRef);

  selectedUpdate = inject(SelectUpdate);
  clickedUpdate = inject(ClickedUpdate);

  get hour() {
    return new Date(this.update?.time || 0).getHours();
  }

  get opacity() {
    return Number(this.update?.valueKwh) / Number(this.system?.kwp);
  }

  @HostBinding('style.top.px') get top() {
    return this.hour * 30;
  }

  @HostListener('mouseenter') onMouseEnter() {
    if (this.update && this.system?.id) {
      this.selectedUpdate.next({
        systemId: this.system?.id,
        update: this.update,
      });
    }
  }

  @HostListener('click') onClicked() {
    if (this.update && this.system?.id) {
      this.clickedUpdate.next({
        systemId: this.system?.id,
        update: this.update,
      });
      Array.from(document.getElementsByClassName('clicked')).forEach((el) =>
        el.classList.remove('clicked')
      );

      this.element.nativeElement.classList.add('clicked');
    }
  }
}
