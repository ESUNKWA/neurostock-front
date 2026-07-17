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
import { UserService } from '../../../services/user/user.service';
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
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'wave',         label: 'Wave' },
    { value: 'mtn_money',    label: 'MTN Money' },
    { value: 'moov_money',   label: 'Moov Money' },
    { value: 'dajmo',        label: 'Dajmo' },
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
  activeTab: 'produits' | 'paiement' | 'client' | 'vendeur' = 'produits';
  currentUser: any;
  boutiques: any[] = [];
  boutiquesStructure: any[] = [];
  vendeurs: any[] = [];
  selectedVendeurBoutique: number | null = null;
  selectedBoutique: string = '';
  selectedProduitsBoutique: number | null = null;
  loading = false;
  activeSessionId: number | null = null;
  caisseActivee = false;
  caisseLoaded = false;

  
  // Variables pour le mode édition
  isEditMode = false;
  editVenteId: number | null = null;
  editVenteData: any = null;

  currentProduitSelect: any = {};

  payIcons: Record<string, string> = {
    espece:       'bi-cash-coin',
    carte:        'bi-credit-card',
    orange_money: 'bi-phone',
    wave:         'bi-wifi',
    mtn_money:    'bi-phone-fill',
    moov_money:   'bi-telephone-fill',
    dajmo:        'bi-phone-landscape',
    credit:       'bi-clock-history',
    mixte:        'bi-layers-half',
  };

  get isMixte(): boolean {
    return this.venteForm?.get('mode_paiement')?.value === 'mixte';
  }

  get isCredit(): boolean {
    return this.venteForm?.get('mode_paiement')?.value === 'credit';
  }

  setTab(tab: string): void { this.activeTab = tab as any; }

  setModePaiement(mode: string): void {
    this.venteForm.patchValue({ mode_paiement: mode });
    this.onModeChange();
  }

  incrementQty(index: number): void {
    const ctrl = this.detailVente.at(index);
    const val = Number(ctrl.get('quantite')?.value) || 0;
    const stock = ctrl.get('stock')?.value;
    if (stock != null && val >= stock) return;
    ctrl.patchValue({ quantite: val + 1 });
    this.calculerMontantTotal();
  }

  decrementQty(index: number): void {
    const ctrl = this.detailVente.at(index);
    const val = Number(ctrl.get('quantite')?.value) || 0;
    if (val > 1) { ctrl.patchValue({ quantite: val - 1 }); this.calculerMontantTotal(); }
  }

  get totalDetailsPaiement(): number {
    const d = this.venteForm?.get('details_paiement')?.value || {};
    return (Number(d.espece) || 0) + (Number(d.carte) || 0)
         + (Number(d.credit) || 0)
         + (Number(d.orange_money) || 0) + (Number(d.wave) || 0)
         + (Number(d.mtn_money) || 0) + (Number(d.moov_money) || 0)
         + (Number(d.dajmo) || 0);
  }

  get canSelectVendeur(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    return ['admin', 'responsable_structure', 'gerant'].includes(code);
  }

  get canSelectBoutique(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    return ['admin', 'responsable_structure'].includes(code);
  }

  constructor(
    private fb: FormBuilder,
    private ventesService: VentesService,
    private clientService: ClientService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService,
    private caisseService: CaisseService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {

    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadProduits();
    this.loadClients();
    if (this.canSelectVendeur) {
      this.loadBoutiquesStructure();
    }
    this.checkForEditData();
    this.loadActiveSession();
  }

 

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  loadActiveSession(): void {
    const boutiqueId = this.currentUser.boutique_id;
    if (!boutiqueId) return;

    this.boutiqueService.findOne(boutiqueId).subscribe({
      next: (r: any) => {
        const boutique = r?.data || r;
        this.caisseActivee = !!boutique?.gestion_caisse_activee;
        this.caisseLoaded = true;

        if (this.caisseActivee) {
          this.caisseService.getActiveSession(boutiqueId, this.currentUser?.telephone).subscribe({
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
    const userTelephone = this.currentUser ? this.currentUser.telephone : null;
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique_id : null;

    this.venteForm = this.fb.group({
      user: [userTelephone, Validators.required],
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
      vendeur_tel: [null],
      detail_vente: this.fb.array([]),
      details_paiement: this.fb.group({
        espece:       [null],
        carte:        [null],
        orange_money: [null],
        wave:         [null],
        mtn_money:    [null],
        moov_money:   [null],
        dajmo:        [null],
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
    if (!editDataStr) {
      this.addDetailVente();
      return;
    }
    try {
      this.editVenteData = JSON.parse(editDataStr);
      this.isEditMode    = true;
      this.editVenteId   = this.editVenteData.id;
      localStorage.removeItem('editVenteData');

      // Peupler le formulaire immédiatement avec les données du serveur
      // (nom/image/stock viennent de l'objet produit inclus dans detail_vente)
      this.populateFormWithEditData();
    } catch (error) {
      console.error('Erreur lors de la récupération des données d\'édition:', error);
      localStorage.removeItem('editVenteData');
      this.addDetailVente();
    }
  }

  selectProduit(ligne: FormGroup, idProduit: number) {
    if (!idProduit) return;

    // Vérifier le doublon en excluant la ligne courante
    const ligneIndex = this.detailVente.controls.indexOf(ligne);
    const doublon = this.detailVente.controls.some(
      (ctrl, idx) => idx !== ligneIndex && ctrl.get('produit')?.value == idProduit
    );

    if (doublon) {
      Swal.fire({
        icon: 'warning',
        title: 'Produit déjà ajouté',
        text: 'Ce produit est déjà dans la liste. Modifiez sa quantité directement.',
        confirmButtonColor: '#047857',
      });
      // Réinitialiser la ligne pour éviter le doublon
      ligne.patchValue({ produit: null, image: '', nom: '', stock: null, prix_unitaire_vente: null });
      this.calculerMontantTotal();
      return;
    }

    const produit = this.produits.find(p => p.id === idProduit);
    if (!produit) return;

    ligne.patchValue({
      prix_unitaire_vente: produit.prix_vente,
      image: produit.imageUrl,
      stock: produit.stock_disponible,
      nom: produit.nom,
    });

    setTimeout(() => this.calculerMontantTotal(), 0);
  }
  

  populateFormWithEditData(): void {
    if (!this.editVenteData || !this.editVenteData.vente) return;

    const vente = this.editVenteData.vente;

    // Date (préférer date_vente, fallback sur created_at)
    const rawDate = vente.date_vente || vente.created_at;
    const dateVente = rawDate
      ? new Date(rawDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const boutiqueId = vente.boutique?.id ?? this.currentUser?.boutique_id ?? null;
    const userTelephone = this.currentUser?.telephone ?? null;

    // Champs principaux (y compris financiers)
    this.venteForm.patchValue({
      libelle:                    vente.libelle || '',
      description:                vente.description || '',
      boutique:                   boutiqueId,
      user:                       userTelephone,
      date_vente:                 dateVente,
      mode_paiement:              vente.mode_paiement || 'espece',
      statut:                     vente.statut || 'payer',
      montant_total:              vente.montant_total || 0,
      remise:                     vente.remise || 0,
      montant_total_apres_remise: vente.montant_total_apres_remise ?? vente.montant_total ?? 0,
      montant_recu:               vente.montant_recu || 0,
      monnaie_rendu:              vente.monnaie_rendu || 0,
    });

    // Client
    const client = vente.clientdata || vente.client;
    if (client) {
      (this.venteForm.get('clientdata') as FormGroup).patchValue({
        nom:       client.nom || '',
        telephone: client.telephone || '',
        email:     client.email || '',
      });
    }

    // Vider les lignes existantes
    while (this.detailVente.length > 0) {
      this.detailVente.removeAt(0);
    }

    // Ajouter les lignes de vente
    if (vente.detail_vente?.length > 0) {
      vente.detail_vente.forEach((detail: any) => {
        const produit = detail.produit;
        // Créer le groupe directement avec toutes les données de la vente sauvegardée
        // sans passer par createDetailVente() pour éviter que valueChanges déclenche
        // la vérification de doublon / l'écrasement du prix historique.
        const detailGroup = this.fb.group({
          image:               [produit?.imageUrl || produit?.image || ''],
          nom:                 [produit?.nom || ''],
          stock:               [produit?.stock_disponible ?? null],
          image_produit:       [null],
          produit:             [produit?.id ?? null, Validators.required],
          prix_unitaire_vente: [detail.prix_unitaire_vente, [Validators.required, Validators.min(0)]],
          quantite:            [detail.quantite, [Validators.required, Validators.min(1)]],
        });
        this.detailVente.push(detailGroup);

        // Ajouter le listener APRÈS le push pour les changements ultérieurs par l'utilisateur
        detailGroup.get('produit')?.valueChanges.subscribe((idProduit: any) => {
          this.selectProduit(detailGroup, idProduit);
        });
      });
    } else {
      this.addDetailVente();
    }
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
      quantite: [1, [Validators.required, Validators.min(1)]]
    });

    // 🔥 Écoute du produit sélectionné
  ligne.get('produit')?.valueChanges.subscribe((idProduit: any) => {
    this.selectProduit(ligne, idProduit);
  });

  return ligne;
    
  }

  addDetailVente(): void {
    this.detailVente.push(this.createDetailVente());
    setTimeout(() => this.calculerMontantTotal(), 0);
  }

  removeDetailVente(index: number): void {
    this.detailVente.removeAt(index);
    setTimeout(() => this.calculerMontantTotal(), 0);
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

  loadBoutiquesStructure(): void {
    const structureId = this.currentUser?.structure_id ?? this.currentUser?.structure?.id;
    if (!structureId) {
      // Gérant sans structure explicite : utiliser sa propre boutique
      const b = this.currentUser?.boutique;
      if (b) {
        this.boutiquesStructure = [b];
        this.selectedVendeurBoutique = b.id;
        this.loadVendeurs(b.id);
      }
      return;
    }
    this.boutiqueService.findByStructure(structureId).subscribe({
      next: (r: any) => {
        this.boutiquesStructure = r?.data ?? [];
        // Pré-sélectionner la boutique du gérant si elle est dans la liste
        const boutiqueId = this.currentUser?.boutique_id;
        if (boutiqueId && this.boutiquesStructure.some((b: any) => b.id === boutiqueId)) {
          this.selectedVendeurBoutique = boutiqueId;
          this.loadVendeurs(boutiqueId);
        }
      }
    });
  }

  loadVendeurs(boutiqueId?: number): void {
    if (!this.canSelectVendeur) return;
    const id = boutiqueId ?? this.currentUser?.boutique_id;
    if (!id) return;
    this.userService.find('', String(id)).subscribe({
      next: (r: any) => {
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        this.vendeurs = list;
      }
    });
  }

  onVendeurBoutiqueChange(boutiqueId: number | null): void {
    this.selectedVendeurBoutique = boutiqueId;
    this.vendeurs = [];
    this.venteForm.patchValue({ vendeur_tel: null });
    if (boutiqueId) this.loadVendeurs(boutiqueId);
  }

  loadClients(): void {
    const boutiqueId = this.currentUser.boutique_id;
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
    if (!this.currentUser) return;

    // Initialiser avec la boutique de l'utilisateur si pas encore sélectionnée
    if (!this.selectedProduitsBoutique) {
      this.selectedProduitsBoutique = this.currentUser.boutique_id ?? null;
    }

    if (!this.selectedProduitsBoutique) {
      this.produits = [];
      return;
    }

    // Synchroniser le champ boutique du formulaire
    this.venteForm?.patchValue({ boutique: this.selectedProduitsBoutique });

    this.produitService.getProduits({ boutique: this.selectedProduitsBoutique }).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.produits = response.data;
        }
      },
      error: (error: any) => { console.log('error', error); }
    });
  }

  onProduitsBoutiqueChange(): void {
    this.produits = [];
    this.vendeurs = [];
    this.venteForm.patchValue({ vendeur_tel: null });
    // Réinitialiser les lignes de vente pour éviter des produits d'une autre boutique
    for (const ctrl of this.detailVente.controls) {
      ctrl.patchValue({ produit: null, image: '', nom: '', stock: null, prix_unitaire_vente: null });
    }
    setTimeout(() => this.calculerMontantTotal(), 0);
    this.loadProduits();
    if (this.selectedProduitsBoutique) this.loadVendeurs(this.selectedProduitsBoutique);
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

    this.venteForm.value.boutique = this.selectedProduitsBoutique ?? this.currentUser?.boutique_id;
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
    const body = {
      ...this.venteForm.value,
      boutique:      this.currentUser?.boutique_id ?? this.venteForm.value.boutique,
      session_caisse: this.activeSessionId,
    };
    this.ventesService.updateVente(this.editVenteId, body)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          this.isEditMode   = false;
          this.editVenteId  = null;
          this.editVenteData = null;
          this.initForm();
          this.addDetailVente();

          Swal.fire({
            title: 'Vente modifiée avec succès',
            text: 'Souhaitez-vous imprimer le reçu ?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimer le reçu',
            cancelButtonText: 'Fermer',
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading(),
            preConfirm: async () => {
              try {
                const venteId = response?.data?.id ?? response?.data?.idVente ?? this.editVenteId;
                return await this.ventesService.imprimerRecu(venteId).toPromise();
              } catch {
                Swal.showValidationMessage('Impossible de générer la facture');
                return false;
              }
            }
          }).then((result) => {
            if (result.isConfirmed && result.value?.path) {
              window.open(result.value.path, '_blank');
            }
          });
        },
        error: (error: any) => {
          console.error('Erreur lors de la modification de la vente', error);
          this.toastr.error(error?.error?.message || 'Erreur lors de la modification de la vente');
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
    const boutique = this.currentUser.boutique_id;
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

