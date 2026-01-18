import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[thousandSeparator]',
  standalone: true
})
export class ThousandSeparatorDirective {

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private ngControl: NgControl
  ) {}

  @HostListener('input')
  onInput(): void {
    let value = this.el.nativeElement.value;

    // Nettoyage
    value = value.replace(/\D/g, '');

    if (!value) {
      this.ngControl.control?.setValue(null, { emitEvent: false });
      return;
    }

    // Mise à jour du FormControl
    this.ngControl.control?.setValue(Number(value), { emitEvent: false });

    // Affichage avec séparateur
    this.el.nativeElement.value =
      value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
}
