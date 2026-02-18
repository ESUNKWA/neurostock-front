import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export default class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Rediriger vers le dashboard si déjà connecté
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/dashboard');
    }

    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.formBuilder.group({
      telephone: ['', [Validators.required]],
      mot_de_passe: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.loginForm.controls; }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    // arrêter ici si le formulaire est invalide
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/dashboard');
          setTimeout(() => {
            this.toastr.success('Vous êtes connecté! Bienvenue sur NeuroStock');
          }, 2000);
        },
        error: (error: HttpErrorResponse) => {
          this.error = error.error?.message || 'Une erreur est survenue lors de la connexion';
          // this.toastr.error(this.error);
        }
      });
  }
}
