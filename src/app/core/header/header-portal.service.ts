import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HeaderPortalService {
  private templateSubject = new BehaviorSubject<TemplateRef<any> | null>(null);
  
  /** Observable of the currently registered template */
  template$ = this.templateSubject.asObservable();

  /** Register a template to be displayed in the header */
  registerTemplate(template: TemplateRef<any>): void {
    this.templateSubject.next(template);
  }

  /** Unregister the current template */
  unregisterTemplate(): void {
    this.templateSubject.next(null);
  }
}

