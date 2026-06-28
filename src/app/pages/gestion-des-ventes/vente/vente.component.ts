import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { ClientService } from '../../../services/gestion-des-clients/client.service';
import { CaisseService } from '../../../services/gestion-des-caisses/caisse.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ThousandSeparatorDirective } from '../../../helpers/thousand-separator.directive';
import Swal from 'sweetalert2'
import { NzSelectModule } from 'ng-zorro-antd/select';
declare var $: any;

@Component({
  selector: 'app-vente',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ThousandSeparatorDirective, NzSelectModule],
  templateUrl: './vente.component.html',
  styleUrl: './vente.component.scss'
})
export default class VenteComponent implements OnInit {

  idBoutique: any;
  venteForm!: FormGroup;
  modesPaiement: { value: string; label: string }[] = [
    { value: 'espece',       label: 'Espèces' },
    { value: 'carte',        label: 'Carte bancaire' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'credit',       label: 'Crédit (à recouvrer)' },
    { value: 'mixte',        label: 'Paiement mixte' },
  ];
  statuts: string[] = ['payer', 'non_payer', 'partiel'];
  barcodeInput = '';
  scanLoading = false;
  produits: any[] = [];
  clients: any[] = [];
  selectedClientId: number | null = null;
  isSubmitting = false;
  currentUser: any;
  boutiques: any[] = [];
  selectedBoutique: string = '';
  loading = false;
  activeSessionId: number | null = null;
  caisseActivee = false;
  caisseLoaded = false;

  
  // Variables pour le mode édition
  isEditMode = false;
  editVenteId: number | null = null;
  editVenteData: any = null;

  currentProduitSelect: any = {};

  get isMixte(): boolean {
    return this.venteForm?.get('mode_paiement')?.value === 'mixte';
  }

  get isCredit(): boolean {
    return this.venteForm?.get('mode_paiement')?.value === 'credit';
  }

  get totalDetailsPaiement(): number {
    const d = this.venteForm?.get('details_paiement')?.value || {};
    return (Number(d.espece) || 0) + (Number(d.carte) || 0)
         + (Number(d.mobile_money) || 0) + (Number(d.credit) || 0);
  }

  constructor(
    private fb: FormBuilder,
    private ventesService: VentesService,
    private clientService: ClientService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService,
    private caisseService: CaisseService
  ) {}

  ngOnInit(): void {

    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadProduits();
    this.loadClients();
    this.checkForEditData();
    this.loadActiveSession();
  }

 

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  loadActiveSession(): void {
    const boutiqueId = this.currentUser?.boutique?.id;
    if (!boutiqueId) return;

    this.boutiqueService.findOne(boutiqueId).subscribe({
      next: (r: any) => {
        const boutique = r?.data || r;
        this.caisseActivee = !!boutique?.gestion_caisse_activee;
        this.caisseLoaded = true;

        if (this.caisseActivee) {
          this.caisseService.getActiveSession(boutiqueId, this.currentUser?.id).subscribe({
            next: (res: any) => { this.activeSessionId = res?.data?.id ?? null; },
            error: () => { this.activeSessionId = null; }
          });
        }
      },
      error: () => {
        this.caisseActivee = false;
        this.caisseLoaded = true;
      }
    });
  }

  initForm(): void {
    // Vérifier si currentUser existe avant d'accéder à ses propriétés
    const userId = this.currentUser ? this.currentUser.id : null;
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique.id : null;
    
    this.venteForm = this.fb.group({
      user: [userId, Validators.required],
      libelle: [''],
      description: [''],
      boutique: [boutiqueId, Validators.required],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      montant_total_apres_remise: [0, [Validators.required, Validators.min(0)]],
      remise: [0, [Validators.required, Validators.min(0)]],
      monnaie_rendu: [0, [Validators.required, Validators.min(0)]],
      montant_recu: [0, [Validators.required, Validators.min(0)]],
      date_vente: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      statut: ['payer', Validators.required],
      detail_vente: this.fb.array([]),
      details_paiement: this.fb.group({
        espece:       [null],
        carte:        [null],
        mobile_money: [null],
        credit:       [null],
      }),
      clientdata: this.fb.group({
        nom: [],
        telephone: [],
        email: [],
      })
    });
  }

  get detail_vente(): FormArray {
    return this.venteForm.get('detail_vente') as FormArray;
  }

  checkForEditData(): void {
    const editDataStr = localStorage.getItem('editVenteData');
    if (editDataStr) {
      try {
        this.editVenteData = JSON.parse(editDataStr);
        this.isEditMode = true;
        this.editVenteId = this.editVenteData.id;
        
        // Supprimer les données du localStorage après les avoir récupérées
        localStorage.removeItem('editVenteData');

        // Charger les produits de la boutique associée à la vente
        if (this.editVenteData.vente && this.editVenteData.vente.boutique) {
          this.selectedBoutique = this.editVenteData.vente.boutique.id.toString();
          this.loadProduits();
        } else if (this.currentUser && this.currentUser.boutique) {
          // Utiliser la boutique de l'utilisateur courant comme fallback
          this.selectedBoutique = this.currentUser.boutique.id.toString();
          this.loadProduits();
        }
        
        // Attendre que les produits soient chargés avant de remplir le formulaire
        setTimeout(() => {
          this.populateFormWithEditData();
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de la récupération des données d\'édition:', error);
        localStorage.removeItem('editVenteData');
      }
    } else {
      // Si pas en mode édition, ajouter un détail de vente par défaut
      this.addDetailVente();
    }
  }

  selectProduit(ligne: FormGroup, idProduit: number) {
  const produit = this.produits.find(p => p.id === idProduit);
    
    // Vérifier si le produit existe déjà
      const existe = this.detail_vente.value.some((p: { produit: any; }) => p.produit == idProduit);

      if (!existe) {
        //this.selectProduit(idProduit, index);
      } else {
       
        Swal.fire({
          icon: "warning",
          title: "Oops...",
          text: "⚠️ Ce produit existe déjà dans la liste !"
        });
        return
      }
  if (!produit) return;

  ligne.patchValue({
    prix_unitaire_vente: produit.prix_vente,
    image: produit.imageUrl,
    stock: produit.stock_disponible,
    nom: produit.nom
  });
}
  

  populateFormWithEditData(): void {
    if (!this.editVenteData || !this.editVenteData.vente) return;
    
    const vente = this.editVenteData.vente;
    
    // Formater la date correctement (yyyy-MM-dd)
    let dateVente = new Date().toISOString().slice(0, 10);
    if (vente.created_at) {
      const date = new Date(vente.created_at);
      dateVente = date.toISOString().slice(0, 10);
    }
    
    // Vérifier que currentUser et boutique existent avant d'accéder à leurs propriétés
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique.id : null;
    const userId = this.currentUser ? this.currentUser.id : null;
    
    // Mettre à jour les champs principaux du formulaire
    this.venteForm.patchValue({
      libelle: vente.libelle || '',
      description: vente.description || '',
      boutique: boutiqueId,
      user: userId,
      montant_total: vente.montant_total || 0,
      date_vente: dateVente,
      mode_paiement: vente.mode_paiement || 'espece',
      statut: vente.statut || 'payer'
    });
    
    // Vider le FormArray des détails de vente existants
    while (this.detailVente.length > 0) {
      this.detailVente.removeAt(0);
    }
    
    // Ajouter les détails de vente
    if (vente.detail_vente && vente.detail_vente.length > 0) {
      vente.detail_vente.forEach((detail: any) => {
        const detailGroup = this.fb.group({
          produit: [detail.produit.id, Validators.required],
          prix_unitaire_vente: [detail.prix_unitaire_vente, [Validators.required, Validators.min(0)]],
          quantite: [detail.quantite, [Validators.required, Validators.min(1)]]
        });
        this.detailVente.push(detailGroup);
      });
    } else {
      // Si aucun détail n'est présent, ajouter une ligne vide
      this.addDetailVente();
    }
    
    // Calculer le montant total
    this.calculerMontantTotal();
    
    // Le titre est géré par le binding isEditMode dans le template
  }

  get f() {
    return this.venteForm.controls;
  }

  get detailVente(): FormArray {
    return this.venteForm.get('detail_vente') as FormArray;
  }

  createDetailVente(): FormGroup {
    const ligne =  this.fb.group({
      image: [''],
      nom: [''],
      stock:[],
      image_produit: [],
      produit: [null, Validators.required],
      prix_unitaire_vente: [null, [Validators.required, Validators.min(0)]],
      quantite: [null, [Validators.required, Validators.min(1)]]
    });

    // 🔥 Écoute du produit sélectionné
  ligne.get('produit')?.valueChanges.subscribe((idProduit: any) => {
    this.selectProduit(ligne, idProduit);
  });

  return ligne;
    
  }

  addDetailVente(): void {
    this.detailVente.push(this.createDetailVente());
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

  removeDetailVente(index: number): void {
    this.detailVente.removeAt(index);
    this.calculerMontantTotal();
  }

  calculerMontantTotal(): void {
    let total = 0;

    for (const detail of this.detailVente.controls) {
      const stock = Number(detail.get('stock')?.value || 0);
      const quantite = Number(detail.get('quantite')?.value || 0);
      const prix = Number(detail.get('prix_unitaire_vente')?.value || 0);

      detail.get('quantite')?.setErrors(null);

      if (quantite > stock) {
        detail.get('quantite')?.setErrors({ stockExceeded: true });
      } else {
        total += quantite * prix;
      }
    }

    this.venteForm.patchValue({ montant_total: total, montant_total_apres_remise: total });
  }


  onPrixOuQuantiteChange(): void {
    this.calculerMontantTotal();
  }

  // Calcul de la monnaie rendue
calculerMonnaieRendue(): void {
  const total = Number(this.venteForm.get('montant_total_apres_remise')?.value || 0);
  const recu = Number(this.venteForm.get('montant_recu')?.value || 0);
  const rendu = recu - total;
  
  this.venteForm.patchValue({ monnaie_rendu: rendu });
  
}

// Calcul montant total après remise
calculerMontantTotalApresRemise(): void {
  let total = 0;
  // ici, calcule à partir des lignes de vente
  total = this.detailVente.controls.reduce((acc, detail) => {
    const qte = Number(detail.get('quantite')?.value || 0);
    const prix = Number(detail.get('prix_unitaire_vente')?.value || 0);
    return acc + (qte * prix);
  }, 0);

  const remise = Number(this.venteForm.get('remise')?.value || 0);
  total = total - remise;

  this.venteForm.patchValue({ montant_total_apres_remise: total });

  // Recalcul monnaie rendue si déjà saisie
  this.calculerMonnaieRendue();
}

  loadClients(): void {
    const boutiqueId = this.currentUser?.boutique?.id;
    if (!boutiqueId) return;
    this.clientService.getClientsByBoutique(boutiqueId).subscribe({
      next: (r: any) => {
        if (Array.isArray(r)) this.clients = r;
        else if (Array.isArray(r?.data?.items)) this.clients = r.data.items;
        else if (Array.isArray(r?.data)) this.clients = r.data;
      }
    });
  }

  onClientSelect(id: number): void {
    if (!id) return;
    const c = this.clients.find(cl => cl.id === id);
    if (!c) return;
    (this.venteForm.get('clientdata') as FormGroup).patchValue({
      nom: c.nom || '',
      telephone: c.telephone || '',
      email: c.email || ''
    });
  }

  loadBoutiques(): void {
    if (!this.currentUser) {
      return;
    }
    
    if (this.currentUser.is_admin === true) {
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
    }else{
      if (this.currentUser.profil.description.toLowerCase() === 'responsable_structure') {
        this.boutiqueService.findByStructure(this.currentUser.structure.id).subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
            }
          },
          error: (error: any) => {
            console.error('Erreur lors du chargement des boutiques:', error);
          }
        });
      } else {
        this.boutiques[0] = this.currentUser.boutique;
      }
    }
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedBoutique = selectElement.value;
    this.loadProduits();
  }

  loadProduits(): void {
    if (!this.currentUser) {
      return;
    }
   
    this.selectedBoutique = this.currentUser.boutique.id.toString();
     
    if (this.currentUser.profil && (this.currentUser.profil.code.toLowerCase() === 'admin' || this.currentUser.profil.code.toLowerCase() === 'responsable_structure')) {
      if (!this.selectedBoutique) {
        this.produits = [];
        return;
      }
    } else if (this.currentUser.boutique) {
      this.selectedBoutique = this.currentUser.boutique.id.toString();
       
    } else {
      // Si aucune boutique n'est disponible
      this.produits = [];
      return;
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

    if (this.caisseActivee && !this.activeSessionId) {
      Swal.fire({
        title: 'Caisse non ouverte',
        text: 'Vous devez ouvrir une session de caisse avant de pouvoir enregistrer une vente.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      this.isSubmitting = false;
      return;
    }

    if (this.venteForm.invalid) {
      this.markFormGroupTouched(this.venteForm);
      this.isSubmitting = false;
      return;
    }

    if (this.venteForm.value.montant_recu == 0 && !this.isCredit && !this.isMixte) {
      Swal.fire({
        title: 'Erreur !',
        text: 'Veuillez saisir le montant reçu de la part du client',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      this.isSubmitting = false;
      return;
    }

    if (this.isMixte) {
      const diff = Math.abs(this.totalDetailsPaiement - (this.venteForm.get('montant_total_apres_remise')?.value || 0));
      if (diff > 0) {
        Swal.fire({
          title: 'Erreur !',
          text: `La répartition du paiement mixte (${this.totalDetailsPaiement.toLocaleString('fr')} FCFA) ne correspond pas au total dû.`,
          icon: 'error',
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
        return;
      }
    }

    this.venteForm.value.boutique = this.currentUser?.boutique;
    this.loading = true;
    
    
    // Si on est en mode édition, appeler la méthode de mise à jour
    if (this.isEditMode && this.editVenteId) {
      this.updateVente();
    } else {
      // Sinon, création d'une nouvelle vente
      this.createVente();
    }

  }
  
  createVente(): void {
    const body = { ...this.venteForm.value, session_caisse: this.activeSessionId };
    this.ventesService.saveVente(body)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          //response.data.boutique = this.currentUser?.boutique || null;
         
          this.initForm(); // Réinitialiser le formulaire
          this.addDetailVente(); // Ajouter une ligne par défaut après réinitialisation
          //this.toastr.success('Enregistrement effectué avec succès');
          

          Swal.fire({
            title: 'Vente effectuée avec succès',
            text: 'Souhaitez-vous imprimer le reçu ?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimer le reçu',
            cancelButtonText: 'Fermer',

            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading(),

            preConfirm: async () => {
              try {
                console.log(response.data);
                
                const facture = this.ventesService
                  .imprimerRecu(response.data.idVente)
                  .toPromise();
                
                return facture;
              } catch (e) {
                Swal.showValidationMessage(
                  'Impossible de générer la facture'
                );
                return false;
              }
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              console.log(result.value);
              
              const url = result.value.path;
              
              window.open(url, '_blank');

              // nettoyage mémoire
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          });

          
          this.isSubmitting = false;
          // attendre 3 secondes avant de recharger la page
          /* setTimeout(() => {
            window.location.reload();
          }, 3000); */
        },
        error: (error: any) => {
          console.error('Erreur lors de la création de la vente', error);
          this.toastr.error('Erreur lors de la création de la vente');
          this.isSubmitting = false;
        }
      });
  }
  
  updateVente(): void {
    this.ventesService.updateVente(this.editVenteId, this.venteForm.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          //this.toastr.success('Modification effectuée avec succès');
          Swal.fire({
            title: 'Vente effectuée avec succès',
            text: 'Souhaitez-vous imprimer le reçu ?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimer le reçu',
            cancelButtonText: 'Fermer',
            confirmButtonColor: '#198754', // vert Bootstrap
            cancelButtonColor: '#6c757d'
          }).then((result) => {
            if (result.isConfirmed) {
              
            }
          });
          this.isSubmitting = false;
          
          // Réinitialiser le mode édition
          this.isEditMode = false;
          this.editVenteId = null;
          this.editVenteData = null;
          
          // Réinitialiser le formulaire
          this.initForm();
          this.addDetailVente();
          
          // Le titre est géré par le binding isEditMode dans le template
        },
        error: (error: any) => {
          console.error('Erreur lors de la modification de la vente', error);
          this.toastr.error('Erreur lors de la modification de la vente');
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

  onModeChange(): void {
    const mode = this.venteForm.get('mode_paiement')?.value;
    if (mode === 'credit') {
      this.venteForm.patchValue({ statut: 'non_payer', montant_recu: 0, monnaie_rendu: 0 });
    } else {
      if (this.venteForm.get('statut')?.value === 'non_payer') {
        this.venteForm.patchValue({ statut: 'payer' });
      }
    }
  }

  onScanBarcode(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    const code = this.barcodeInput.trim();
    if (!code) return;
    this.barcodeInput = '';
    const boutique = this.currentUser?.boutique?.id;
    if (!boutique) return;
    this.scanLoading = true;
    this.produitService.scanByCodeBarre(code, boutique).subscribe({
      next: (res: any) => {
        this.scanLoading = false;
        const produit = res?.data || res;
        if (!produit?.id) {
          this.toastr.warning('Produit non trouvé pour ce code-barres');
          return;
        }
        // Check if already in list
        const existe = this.detail_vente.value.some((d: any) => d.produit === produit.id);
        if (existe) {
          // Increment quantity
          const idx = this.detail_vente.value.findIndex((d: any) => d.produit === produit.id);
          const ctrl = this.detail_vente.at(idx);
          ctrl.patchValue({ quantite: (Number(ctrl.get('quantite')?.value) || 0) + 1 });
          this.calculerMontantTotal();
          this.toastr.info(`Quantité mise à jour pour ${produit.nom}`);
        } else {
          const ligne = this.createDetailVente();
          this.detail_vente.push(ligne);
          ligne.patchValue({
            produit: produit.id,
            prix_unitaire_vente: produit.prix_vente,
            image: produit.imageUrl,
            stock: produit.stock_disponible,
            nom: produit.nom,
            quantite: 1
          });
          this.calculerMontantTotal();
          this.toastr.success(`${produit.nom} ajouté`);
        }
      },
      error: () => {
        this.scanLoading = false;
        this.toastr.error('Erreur lors de la recherche par code-barres');
      }
    });
  }

  imprimerRecu(urlRecuPdf: string) {
    const url = urlRecuPdf;
    window.open(url, '_blank');
  }

}

