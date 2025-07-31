import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AngularFireAuth,
  AngularFireAuthModule,
} from '@angular/fire/compat/auth';
import { LANGUAGE } from './core/lang';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MENU_TOOGLE } from './core/header/menu';
import {
  BehaviorSubject,
  map,
  Subject,
  tap,
  combineLatest,
  filter,
} from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from './core/lang/translate.pipe';
import { env } from './env/env';
import { CurrentUserService } from './features/people/services/current-user.service';
import { HeaderComponent } from './core/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AngularFireAuthModule,
    MatSidenavModule,
    MatIconButton,
    MatIconModule,
    MatButton,
    TranslatePipe,
    HeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [
    {
      provide: MENU_TOOGLE,
      useValue: new Subject<null>(),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit {
  private lang = inject(LANGUAGE);
  private renderer = inject(Renderer2);
  @ViewChild('drawer', { static: false }) drawer?: MatDrawer;
  cdr = inject(ChangeDetectorRef);
  toggle = inject(MENU_TOOGLE);
  auth = inject(AngularFireAuth);
  currentUserService = inject(CurrentUserService);
  currentRole = this.currentUserService.user.pipe(map((user) => user?.role));
  router = inject(Router);
  feature = env.feature;

  layout = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map((event: NavigationEnd) => event.urlAfterRedirects.split('/')[1])
  );

  translatePipe = inject(TranslatePipe);

  title = new BehaviorSubject('');
  titleTranslated = combineLatest([this.title, this.lang]).pipe(
    map(([title, lang]) => this.translatePipe.transform(title))
  );

  constructor() {
    this.lang.subscribe((lang) => {
      const body = document.body;
      const classesToRemove = Array.from(body.classList).filter((cls) =>
        cls.startsWith('lang-')
      );
      classesToRemove.forEach((cls) => this.renderer.removeClass(body, cls));
      this.renderer.addClass(body, `lang-${lang}`);
    });
  }

  ngAfterViewInit() {
    this.toggle.subscribe(() => {
      this.drawer?.toggle();
      this.cdr.markForCheck();
    });
  }

  redirect(to: string) {
    this.toggle.next(null);
    this.router.navigate([to]);
  }

  creteSystem() {
    this.toggle.next(null);
    this.router.navigate(['system-settings', 'new']);
  }

  logout() {
    this.toggle.next(null);
    this.auth.signOut().then(() => {
      this.router.navigate(['login']);
    });
  }

  setTitle(cs: any) {
    const [, page] = this.router.url.split('/');
    const translationKeys: { [key in string]: string } = {
      systems: 'header.monitoring_table',
      system: 'sidenav.system_monitoring',
      malfunctions: 'sidenav.malfunctions',
      'malfunction-edit': 'sidenav.malfunctions',
      'routine-check': 'sidenav.routine_check',
      users: 'sidenav.users',
      'system-settings': 'sidenav.system_settings',
    };
    this.title.next(translationKeys[page] || '');
  }
}
