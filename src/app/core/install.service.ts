import { Injectable, computed, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(
    matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
  );
  private readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  /** Mostrar el botón: no instalada y (hay prompt nativo o es iOS) */
  readonly available = computed(
    () => !this.installed() && (this.deferred() !== null || this.isIos),
  );

  constructor() {
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
