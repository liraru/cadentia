import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Cerrar sin hacer nada (también Esc). */
  cancelLabel: string;
  /** Tercera opción opcional (p. ej. "Descartar"). */
  rejectLabel?: string;
  danger?: boolean;
}

export type ConfirmResult = 'confirm' | 'reject' | 'cancel';

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="confirm-msg">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="'cancel'">{{ data.cancelLabel }}</button>
      @if (data.rejectLabel) {
        <button mat-button type="button" [mat-dialog-close]="'reject'">{{ data.rejectLabel }}</button>
      }
      <button
        mat-flat-button
        type="button"
        cdkFocusInitial
        [class.danger]="data.danger"
        [mat-dialog-close]="'confirm'"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}

/** Sustituye a ConfirmationService/p-confirmdialog de PrimeNG. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  async ask(options: ConfirmOptions): Promise<ConfirmResult> {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmOptions, ConfirmResult>(
      ConfirmDialogComponent,
      { data: options, width: '90vw', maxWidth: '26rem' },
    );
    return (await firstValueFrom(ref.afterClosed())) ?? 'cancel';
  }
}
