import { InjectionToken } from '@angular/core';
import { Subject } from 'rxjs';

export const MENU_TOOGLE: InjectionToken<Subject<null>> = new InjectionToken<
  Subject<null>
>('MENU_TOOGLE');
