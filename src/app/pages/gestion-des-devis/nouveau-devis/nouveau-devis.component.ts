import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { DevisService } from '../../../services/gestion-des-devis/devis.service';
import { ClientService } from '../../../services/gestion-des-clients/client.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ThousandSeparatorDirective } from '../../../helpers/thousand-separator.directive';
import { NzSelectModule } from 'ng-zorro-antd/select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nouveau-devis',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ThousandSeparatorDirective, NzSelectModule],
  templateUrl: './nouveau-devis.component.html',
  styleUrl: './nouveau-devis.component.scss'
})
export default class NouveauDevisComponent implements OnInit {
  devisForm!: FormGroup;
  produits: any[] = [];
  boutiques: any[] = [];
  clients: any[] = [];
  selectedClientId: number | null = null;
  isSubmitting = false;
  loading = false;
  currentUser: any;

  isEditMode = false;
  editDevisId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private devisService: DevisService,
    private clientService: ClientService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.initForm();
      this.loadBoutiques();
      this.loadProduits();
      this.loadClients();
      this.checkForEditData();
    });
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
    (this.devisForm.get('clientdata') as FormGroup).patchValue({
      nom: c.nom || '',
      prenoms: c.prenoms || '',
      telephone: c.telephone || '',
      email: c.email || ''
    });
  }

  initForm(): void {
    this.devisForm = this.fb.group({
      user: [{ id: this.currentUser?.id }, Validators.required],
      boutique: [{ id: this.currentUser?.boutique?.id }, Validators.required],
      montant_total: [0],
      montant_total_apres_remise: [0],
      remise: [0, [Validators.min(0)]],
      date_expiration: ['', Validators.required],
      notes: [''],
      clientdata: this.fb.group({
        nom: ['', Validators.required],
        prenoms: [''],
        telephone: [''],
        email: ['']
      }),
      detail_devis: this.fb.array([])
    });
  }

  get f() { return this.devisForm.controls; }
  get clientdata() { return this.devisForm.get('clientdata') as FormGroup; }
  get detailDevis(): FormArray { return this.devisForm.get('detail_devis') as FormArray; }

  checkForEditData(): void {
    const raw = localStorage.getItem('editDevisData');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        localStorage.removeItem('editDevisData');
        this.isEditMode = true;
        this.editDevisId = data.id;
        setTimeout(() => this.populateForm(data.devis), 800);
      } catch {
        localStorage.removeItem('editDevisData');
        this.addLigne();
      }
    } else {
      this.addLigne();
    }
  }

  populateForm(devis: any): void {
    this.devisForm.patchValue({
      remise: devis.remise || 0,
      montant_total: devis.montant_total || 0,
      montant_total_apres_remise: devis.montant_total_apres_remise || 0,
      date_expiration: devis.date_expiration?.slice(0, 10) || '',
      notes: devis.notes || '',
      clientdata: {
        nom: devis.clientdata?.nom || '',
        prenoms: devis.clientdata?.prenoms || '',
        telephone: devis.clientdata?.telephone || '',
        email: devis.clientdata?.email || ''
      }
    });

    while (this.detailDevis.length) this.detailDevis.removeAt(0);

    (devis.detail_devis || []).forEach((d: any) => {
      this.detailDevis.push(this.fb.group({
        produit: [d.produit?.id ?? d.produit, Validators.required],
        nom: [d.produit?.nom || ''],
        image: [d.produit?.imageUrl || ''],
        stock: [d.produit?.stock_disponible ?? 0],
        prix_unitaire: [d.prix_unitaire, [Validators.required, Validators.min(0)]],
        quantite: [d.quantite, [Validators.required, Validators.min(1)]]
      }));
    });

    this.calculerTotal();
  }

  createLigne(): FormGroup {
    const ligne = this.fb.group({
      produit: [null, Validators.required],
      nom: [''],
      image: [''],
      stock: [0],
      prix_unitaire: [null, [Validators.required, Validators.min(0)]],
      quantite: [null, [Validators.required, Validators.min(1)]]
    });

    ligne.get('produit')?.valueChanges.subscribe((id: any) => {
      if (!id) return;

      const doublon = this.detailDevis.controls
        .filter(c => c !== ligne)
        .some(c => c.get('produit')?.value === id);

      if (doublon) {
        Swal.fire({ icon: 'warning', title: 'Doublon', text: 'Ce produit est déjà dans la liste.' });
        ligne.get('produit')?.setValue(null, { emitEvent: false });
        return;
      }

      const produit = this.produits.find(p => p.id === id);
      if (produit) {
        ligne.patchValue({
          nom: produit.nom,
          image: produit.imageUrl,
          stock: produit.stock_disponible,
          prix_unitaire: produit.prix_vente
        });
        this.calculerTotal();
      }
    });

    return ligne;
  }

  addLigne(): void { this.detailDevis.push(this.createLigne()); }

  removeLigne(i: number): void {
    this.detailDevis.removeAt(i);
    this.calculerTotal();
  }

  calculerTotal(): void {
    let total = 0;

    for (const ligne of this.detailDevis.controls) {
      const stock = Number(ligne.get('stock')?.value || 0);
      const qte = Number(ligne.get('quantite')?.value || 0);
      const prix = Number(ligne.get('prix_unitaire')?.value || 0);

      ligne.get('quantite')?.setErrors(null);

      if (stock > 0 && qte > stock) {
        ligne.get('quantite')?.setErrors({ stockExceeded: true });
      } else {
        total += qte * prix;
      }
    }

    const remise = Number(this.devisForm.get('remise')?.value || 0);
    this.devisForm.patchValue({
      montant_total: total,
      montant_total_apres_remise: total - remise
    }, { emitEvent: false });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => { if (r.status === 'success') this.boutiques = r.data; }
      });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure.id).subscribe({
        next: (r: any) => { if (r.status === 'success') this.boutiques = r.data; }
      });
    } else {
      this.boutiques[0] = this.currentUser?.boutique;
    }
  }

  loadProduits(): void {
    const boutiqueId = this.currentUser?.boutique?.id;
    if (!boutiqueId) return;
    this.produitService.getProduits({ boutique: boutiqueId }).subscribe({
      next: (r: any) => { if (r.status === 'success') this.produits = r.data; }
    });
  }

  buildPayload(): any {
    const v = this.devisForm.value;
    return {
      montant_total: v.montant_total,
      montant_total_apres_remise: v.montant_total_apres_remise,
      remise: v.remise,
      date_expiration: new Date(v.date_expiration).toISOString(),
      notes: v.notes,
      boutique: { id: this.currentUser?.boutique?.id },
      user: { id: this.currentUser?.id },
      clientdata: v.clientdata,
      detail_devis: v.detail_devis.map((d: any) => ({
        produit: d.produit,
        quantite: d.quantite,
        prix_unitaire: d.prix_unitaire
      }))
    };
  }

  onSubmit(): void {
    this.isSubmitting = true;

    if (this.devisForm.invalid) {
      this.isSubmitting = false;
      return;
    }

    if (this.detailDevis.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Devis vide', text: 'Ajoutez au moins un produit.' });
      this.isSubmitting = false;
      return;
    }

    const hasStockError = this.detailDevis.controls.some(c => c.get('quantite')?.errors?.['stockExceeded']);
    if (hasStockError) {
      Swal.fire({ icon: 'warning', title: 'Stock insuffisant', text: 'Corrigez les quantités avant de soumettre.' });
      this.isSubmitting = false;
      return;
    }

    this.loading = true;
    const payload = this.buildPayload();

    const action = this.isEditMode && this.editDevisId
      ? this.devisService.updateDevis(this.editDevisId, payload)
      : this.devisService.saveDevis(payload);

    action.pipe(finalize(() => { this.loading = false; })).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.isEditMode ? 'Devis modifié avec succès' : 'Devis enregistré avec succès',
          timer: 2000,
          showConfirmButton: false
        });
        this.isEditMode = false;
        this.editDevisId = null;
        this.isSubmitting = false;
        this.initForm();
        this.addLigne();
      },
      error: (err: any) => {
        console.error('Erreur:', err);
        this.toastr.error('Erreur lors de l\'enregistrement du devis');
        this.isSubmitting = false;
      }
    });
  }
}
