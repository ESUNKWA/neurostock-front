import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FournisseurService } from '../../../services/gestion-des-produits/fournisseur.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';
import { ThousandSeparatorDirective } from '../../../helpers/thousand-separator.directive';
declare var $: any;

@Component({
  selector: 'app-achats',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ThousandSeparatorDirective],
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
  currentUser: any;
  boutiques: any[] = [];
  selectedBoutique: string = '';
  loading = false;
  
  // Variables pour le mode édition
  isEditMode = false;
  editAchatId: number | null = null;
  editAchatData: any = null;

  constructor(
    private fb: FormBuilder,
    private fournisseurService: FournisseurService,
    private achatsService: AchatsService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadFournisseurs();
    this.loadProduits();
    
    // Vérifier s'il y a des données d'édition dans le localStorage
    this.checkForEditData();
  }

  ngAfterViewInit() {
    // Initialisation de Select2
    ($('.mySelect') as any).select2({
      placeholder: 'Sélectionnez une boutique',
      allowClear: true,
      width: 'resolve',
    });

    // Gérer les changements
    // Événement change sur le dernier select uniquement
    // Event delegation : écoute tous les select, même futurs
    $(document).on('change', '.mySelect', (e: any) => {
      const select = $(e.target);
      const idProduit = select.val();
      const index = select.closest('.detail-vente-item').index();
      console.log(idProduit);
      
    });
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // console.log('currentUser', this.currentUser);
    });
  }

  initForm(): void {
    // Vérifier si currentUser existe avant d'accéder à ses propriétés
    const userId = this.currentUser ? this.currentUser.id : null;
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique.id : null;
    
    this.achatForm = this.fb.group({
      user: [userId, Validators.required],
      libelle: [''],
      description: [''],
      boutique: [null, Validators.required],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      date_achat: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      fournisseur: [null, Validators.required],
      statut: ['payer', Validators.required],
      detail_achat: this.fb.array([])
    });
  }

  checkForEditData(): void {
    const editDataStr = localStorage.getItem('editAchatData');
    if (editDataStr) {
      try {
        this.editAchatData = JSON.parse(editDataStr);
        this.isEditMode = true;
        this.editAchatId = this.editAchatData.id;
        
        // Supprimer les données du localStorage après les avoir récupérées
        localStorage.removeItem('editAchatData');
        
        // Charger les produits de la boutique associée à l'achat
        this.selectedBoutique = this.editAchatData.achat.boutique ? this.editAchatData.achat.boutique.id.toString() : '';
        if (this.selectedBoutique) {
          this.loadProduits();
        }
        
        // Attendre que les produits soient chargés avant de remplir le formulaire
        setTimeout(() => {
          this.populateFormWithEditData();
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de la récupération des données d\'édition:', error);
        localStorage.removeItem('editAchatData');
      }
    } else {
      // Si pas en mode édition, ajouter un détail d'achat par défaut
      this.addDetailAchat();
    }
  }

  populateFormWithEditData(): void {
    if (!this.editAchatData || !this.editAchatData.achat) return;
    
    const achat = this.editAchatData.achat;
    
    // Formater la date correctement (yyyy-MM-dd)
    let dateAchat = new Date().toISOString().slice(0, 10);
    if (achat.date_achat) {
      const date = new Date(achat.date_achat);
      dateAchat = date.toISOString().slice(0, 10);
    }

    
    // Mettre à jour les champs principaux du formulaire
    this.achatForm.patchValue({
      libelle: achat.libelle || '',
      description: achat.description || '',
      boutique: this.currentUser.boutique.id,
      montant_total: achat.montant_total || 0,
      date_achat: dateAchat,
      mode_paiement: achat.mode_paiement || 'espece',
      fournisseur: achat.fournisseur ? achat.fournisseur.id : null,
      statut: achat.statut || 'payer'
    });
    
    // Vider le FormArray des détails d'achat existants
    while (this.detailAchat.length > 0) {
      this.detailAchat.removeAt(0);
    }
    
    // Ajouter les détails d'achat
    if (achat.detail_achat && achat.detail_achat.length > 0) {
      achat.detail_achat.forEach((detail: any) => {
        const detailGroup = this.fb.group({
          produit: [detail.produit.id, Validators.required],
          prix_unitaire: [detail.prix_unitaire, [Validators.required, Validators.min(0)]],
          quantite: [detail.quantite, [Validators.required, Validators.min(1)]]
        });
        this.detailAchat.push(detailGroup);
      });
    } else {
      // Si aucun détail n'est présent, ajouter une ligne vide
      this.addDetailAchat();
    }
    
    // Calculer le montant total
    this.calculerMontantTotal();
    
    // Mettre à jour le titre du composant pour indiquer le mode édition
    setTimeout(() => {
      const cardTitle = document.querySelector('.card-title');
      if (cardTitle) {
        cardTitle.textContent = `Modification de l'approvisionnement #${achat.reference || ''}`;
      }
    }, 0);
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
      prix_unitaire: [null, [Validators.required, Validators.min(0)]],
      quantite: [null, [Validators.required, Validators.min(1)]]
    });
  }

  addDetailAchat(): void {
    this.detailAchat.push(this.createDetailAchat());
    this.calculerMontantTotal();

    // Attendre que Angular rende la nouvelle ligne
    setTimeout(() => {
      const selects = $('.mySelect');          // tous les selects
      const lastSelect = selects[selects.length - 1]; // dernier select ajouté
      $(lastSelect).select2({
        placeholder: 'Sélectionnez une boutique',
        allowClear: true,
        width: 'resolve',
      });

      
    }, 0);
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

  loadBoutiques(): void {
    
    switch(this.currentUser.profil.code.toLowerCase()){

      case 'admin':
        
        this.boutiqueService.find().subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
            }
          },
          error: (error: any) => {
            console.error('Erreur lors du chargement des boutiques:', error);
          }
        });
        break;

      case 'responsable_structure':
        this.boutiques = this.currentUser.structure[0].boutique;
      
        break;

        default:
          this.boutiques[0] = this.currentUser.boutique;
    }

  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedBoutique = selectElement.value;
    this.loadProduits();
  }

  loadFournisseurs(): void {
    this.fournisseurService.getFournisseursByBoutik(this.currentUser.boutique.id).subscribe({
      next: (response: any) => {
        this.fournisseurs = response.data;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des fournisseurs', error);
      }
    });
  }

  loadProduits(): void {
    if (this.currentUser.profil.description.toLowerCase() === 'admin' || this.currentUser.profil.description.toLowerCase() === 'responsable_structure') {
      if (!this.selectedBoutique) {
        this.produits = [];
        return;
      }
    } else {
      this.selectedBoutique = this.currentUser.boutique.id;
    }
    
    const body: any = {
      boutique: this.selectedBoutique
    }

    this.produitService.getProduits(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.produits = response.data;
        }
      },
      error: (error: any) => {
        console.log('error', error);
      }
    });
  }

  onSubmit(): void {
    this.isSubmitting = true;
      
    if (this.achatForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.achatForm);
      return;
    }

    this.loading = true;
    
    // Si on est en mode édition, appeler la méthode de mise à jour
    if (this.isEditMode && this.editAchatId) {
      this.updateAchat();
    } else {
      // Sinon, création d'un nouvel approvisionnement
      this.createAchat();
    }
  }
  
  createAchat(): void {
    this.achatsService.createAchat(this.achatForm.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.initForm(); // Réinitialiser le formulaire
          this.addDetailAchat(); // Ajouter une ligne par défaut après réinitialisation
          this.toastr.success('Approvisionnement effectué avec succès');
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Erreur lors de la création de l\'achat', error);
          this.toastr.error('Erreur lors de la création de l\'approvisionnement');
          this.isSubmitting = false;
        }
      });
  }
  
  updateAchat(): void {
    this.achatsService.updateAchat(this.editAchatId, this.achatForm.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.toastr.success('Approvisionnement modifié avec succès');
          this.isSubmitting = false;
          
          // Réinitialiser le mode édition
          this.isEditMode = false;
          this.editAchatId = null;
          this.editAchatData = null;
          
          // Réinitialiser le formulaire
          this.initForm();
          this.addDetailAchat();
          
          // Mettre à jour le titre
          setTimeout(() => {
            const cardTitle = document.querySelector('.card-title');
            if (cardTitle) {
              cardTitle.textContent = 'Enregistrement d\'un nouvel approvisionnement';
            }
          }, 0);
        },
        error: (error: any) => {
          console.error('Erreur lors de la modification de l\'achat', error);
          this.toastr.error('Erreur lors de la modification de l\'approvisionnement');
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
