import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Component({
  selector: 'app-sma-auth-callback',
  standalone: true,
  template: `<p>Processing SMA authorization...</p>`,
})
export class SmaAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private functions = inject(Functions);

  private static readonly SMA_TEMP_KEY = 'SMA_temp_key';
  private static readonly LEGACY_REDIRECT_URI = 'https://solar-golan.web.app/';

  async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code') || '';
    const state = this.route.snapshot.queryParamMap.get('state') || '';
    const expectedState = localStorage.getItem(
      SmaAuthCallbackComponent.SMA_TEMP_KEY
    );

    if (code && state && expectedState && state === expectedState) {
      try {
        const setSmaToken = httpsCallable<
          { smaUser: string; code?: string; redirectUri?: string },
          string
        >(this.functions, 'smaAuth-setSmaToken');
        const result = await setSmaToken({
          smaUser: state,
          code,
          redirectUri: SmaAuthCallbackComponent.LEGACY_REDIRECT_URI,
        });
        localStorage.setItem(SmaAuthCallbackComponent.SMA_TEMP_KEY, result.data);
      } catch {
        localStorage.removeItem(SmaAuthCallbackComponent.SMA_TEMP_KEY);
      }
    }

    window.close();
    if (!window.closed) {
      this.router.navigate(['/systems']);
    }
  }
}
