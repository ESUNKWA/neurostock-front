import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { InscriptionService } from '../../services/inscription/inscription.service';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  const pwd = g.get('responsable_password')?.value;
  const confirm = g.get('confirmer_password')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inscription.component.html',
  styleUrl: './inscription.component.scss',
})
export default class InscriptionComponent {
  step = 1;
  isSubmitting = false;
  done = false;
  serverError = '';
  showPwd = false;
  showPwd2 = false;

  step1: FormGroup;
  step2: FormGroup;
  step3: FormGroup;

  constructor(private fb: FormBuilder, private inscriptionSvc: InscriptionService) {
    this.step1 = this.fb.group({
      structure_nom:          ['', Validators.required],
      structure_telephone:    ['', [Validators.minLength(10), Validators.maxLength(10)]],
      structure_email:        [''],
      structure_situation_geo:[''],
    });

    this.step2 = this.fb.group({
      boutique_nom:          ['', Validators.required],
      boutique_situation_geo:[''],
    });

    this.step3 = this.fb.group({
      responsable_nom:       ['', Validators.required],
      responsable_prenoms:   [''],
      responsable_telephone: ['', [Validators.minLength(10), Validators.maxLength(10)]],
      responsable_email:     [''],
      responsable_password:  ['', [Validators.required, Validators.minLength(6)]],
      confirmer_password:    ['', Validators.required],
    }, { validators: passwordMatch });
  }

  private get activeForm(): FormGroup {
    return [this.step1, this.step2, this.step3][this.step - 1];
  }

  next(): void {
    const f = this.activeForm;
    if (f.invalid) { f.markAllAsTouched(); return; }
    this.step++;
  }

  prev(): void { this.step--; }

  submit(): void {
    if (this.step3.invalid) { this.step3.markAllAsTouched(); return; }

    this.isSubmitting = true;
    this.serverError = '';

    const { confirmer_password, ...s3 } = this.step3.value;
    const payload = { ...this.step1.value, ...this.step2.value, ...s3 };

    this.inscriptionSvc.soumettre(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => { this.done = true; },
        error: (e: any) => {
          this.serverError = e?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        },
      });
  }

  f1(k: string) { return this.step1.get(k); }
  f2(k: string) { return this.step2.get(k); }
  f3(k: string) { return this.step3.get(k); }

  get pwdMismatch(): boolean {
    return !!(this.step3.errors?.['mismatch'] && this.step3.get('confirmer_password')?.touched);
  }
}
