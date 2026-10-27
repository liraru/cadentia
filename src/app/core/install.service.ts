import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(
    this.isBrowser &&
      (matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true),
  );
  private readonly isIos = this.isBrowser && /iphone|ipad|ipod/i.test(navigator.userAgent);

  readonly available = computed(
    () => !this.installed() && (this.deferred() !== null || this.isIos),
  );

  constructor() {
    if (!this.isBrowser) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred.set(e as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferred.set(null);
    });
  }

  async prompt(): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> {
    const ev = this.deferred();
    if (ev) {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      this.deferred.set(null);
      return outcome;
    }
    return this.isIos ? 'ios' : 'unavailable';
  }
}
