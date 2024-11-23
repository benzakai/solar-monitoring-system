import {inject, Injectable} from '@angular/core';
import {FormControl} from '@angular/forms';
import {debounceTime, distinctUntilChanged, first, startWith} from 'rxjs';
import {DirectMonitorService} from './direct-monitor.service';

@Injectable()
export class FiltersControlService {

  directMonitorService = inject(DirectMonitorService);

  kwpControl = new FormControl();
  kwpControlState = this.kwpControl.valueChanges.pipe(
    startWith(this.kwpControl.value),
    distinctUntilChanged(),
    debounceTime(100),
  );

  portalControl = new FormControl();
  portalControlState = this.portalControl.valueChanges.pipe(
    startWith(this.portalControl.value),
  );

  constructor() {
    this.directMonitorService.portals
      .pipe(first())
      .subscribe((portals) => {
        this.portalControl.setValue(portals);
      });
  }

}
