import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';

@Component({
  selector: 'app-achats',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './achats.component.html',
  styleUrl: './achats.component.scss'
})
export default class AchatsComponent implements OnInit {
  achatForm!: FormGroup;
  modesPaiement: string[] = ['espece', 'cheque', 'virement', 'carte'];
  statuts: string[] = ['payer', 'non_payer', 'partiel'];
  fournisseurs: any[] = [];
  produits: any[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private achatsService: AchatsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFournisseurs();
    this.loadProduits();
    
    // Ajouter un détail d'achat par défaut
    this.addDetailAchat();
  }

  initForm(): void {
    this.achatForm = this.fb.group({
      libelle: ['', Validators.required],
      description: [''],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      date_achat: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      fournisseur: [null, Validators.required],
      statut: ['payer', Validators.required],
      detail_achat: this.fb.array([])
    });
  }

  get f() {
    return this.achatForm.controls;
  }

  get detailAchat(): FormArray {
    return this.achatForm.get('detail_achat') as FormArray;
  }

  createDetailAchat(): FormGroup {
    return this.fb.group({
      produit: [null, Validators.required],
      prix_unitaire: [0, [Validators.required, Validators.min(0)]],
      quantite: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addDetailAchat(): void {
    this.detailAchat.push(this.createDetailAchat());
    this.calculerMontantTotal();
  }

  removeDetailAchat(index: number): void {
    this.detailAchat.removeAt(index);
    this.calculerMontantTotal();
  }

  calculerMontantTotal(): void {
    let total = 0;
    for (const detail of this.detailAchat.controls) {
      const quantite = detail.get('quantite')?.value || 0;
      const prix = detail.get('prix_unitaire')?.value || 0;
      total += quantite * prix;
    }
    this.achatForm.patchValue({ montant_total: total });
  }

  onPrixOuQuantiteChange(): void {
    this.calculerMontantTotal();
  }

  loadFournisseurs(): void {
    // À implémenter avec le service
    this.fournisseurs = [{ id: 1, nom: 'Fournisseur 1' }];
  }

  loadProduits(): void {
    // À implémenter avec le service
    this.produits = [
      { id: 43, nom: 'Produit 43' },
      { id: 45, nom: 'Produit 45' },
      { id: 46, nom: 'Produit 46' }
    ];
  }

  onSubmit(): void {
    this.isSubmitting = true;
    if (this.achatForm.invalid) {
      // this.markFormGroupTouched(this.achatForm);
      return;
    }

    this.achatsService.createAchat(this.achatForm.value)
      .subscribe({
        next: (response: any) => {
          console.log('Achat créé avec succès', response);
          this.isSubmitting = false;
          this.initForm(); // Réinitialiser le formulaire
          this.addDetailAchat(); // Ajouter une ligne par défaut après réinitialisation
        },
        error: (error: any) => {
          console.error('Erreur lors de la création de l\'achat', error);
          this.isSubmitting = false;
        }
      });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        (control as FormArray).controls.forEach((ctrl: any) => {
          if (ctrl instanceof FormGroup) {
            this.markFormGroupTouched(ctrl);
          } else {
            ctrl.markAsTouched();
          }
        });
      }
    });
  }
}
