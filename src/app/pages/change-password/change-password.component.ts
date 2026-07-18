import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpClientService } from '../../services/http-client/http-client.service';
import { AuthService } from '../../services/auth/auth.service';
import { environnement } from '../../environnement/environnement';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nouveau = group.get('nouveau_mot_de_passe')?.value;
  const confirm = group.get('confirmation')?.value;
  return nouveau && confirm && nouveau !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export default class ChangePasswordComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  saving = false;
  showAncien = false;
  showNouveau = false;
  showConfirm = false;

  currentUser: any = null;

  private readonly API = environnement.API_URL;

  constructor(
    private fb: FormBuilder,
    private http: HttpClientService,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    this.form = this.fb.group(
      {
        ancien_mot_de_passe: ['', Validators.required],
        nouveau_mot_de_passe: ['', [Validators.required, Validators.minLength(6)]],
        confirmation: ['', Validators.required],
      },
      { validators: passwordsMatch },
    );
  }

  get f() { return this.form.controls; }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    this.saving = true;
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = this.form.value;

    this.http
      .patch(`${this.API}/authentication/change-password`, { ancien_mot_de_passe, nouveau_mot_de_passe })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          const stored = this.auth.getUser();
          if (stored) {
            stored.must_change_password = false;
            localStorage.setItem('user', JSON.stringify(stored));
          }
          this.toastr.success('Mot de passe modifié avec succès');
          this.router.navigateByUrl('/dashboard');
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Une erreur est survenue');
        },
      });
  }
}
