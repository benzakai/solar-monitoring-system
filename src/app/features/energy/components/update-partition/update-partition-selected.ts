import { EnergySample } from '../../../../domain/energy';
import { MonitorItem } from '../../../../domain/monitor-item';
import { InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SelectUpdateState = {
  systemId: string;
  update: EnergySample;
  system?: MonitorItem;
};

export const SelectUpdate = new InjectionToken<
  BehaviorSubject<SelectUpdateState | null>
>('SELECTED_UPDATE');

export const ClickedUpdate = new InjectionToken<
  BehaviorSubject<SelectUpdateState | null>
>('CLICKED_UPDATE');
