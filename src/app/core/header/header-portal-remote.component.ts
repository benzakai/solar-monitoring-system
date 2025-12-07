import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HeaderPortalService } from './header-portal.service';

/**
 * Portal component for rendering content in the header area.
 * 
 * Usage:
 * ```html
 * <app-header-portal-remote>
 *   <span>My custom header content</span>
 * </app-header-portal-remote>
 * ```
 * 
 * The content placed between the tags will be rendered in the header 
 * instead of the default headerTitle. When this component is destroyed,
 * the portal content is automatically unregistered.
 */
@Component({
  selector: 'app-header-portal-remote',
  standalone: true,
  template: `
    <ng-template #portalContent>
      <ng-content></ng-content>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderPortalRemoteComponent implements AfterViewInit, OnDestroy {
  private portalService = inject(HeaderPortalService);

  @ViewChild('portalContent', { static: true }) portalContent!: TemplateRef<any>;

  ngAfterViewInit(): void {
    this.portalService.registerTemplate(this.portalContent);
  }

  ngOnDestroy(): void {
    this.portalService.unregisterTemplate();
  }
}

