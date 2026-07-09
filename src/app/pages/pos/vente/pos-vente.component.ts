import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth/auth.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { ClientService } from '../../../services/gestion-des-clients/client.service';
import { CaisseService } from '../../../services/gestion-des-caisses/caisse.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { DashService } from '../../../services/dash/dash.service';
import { RetourVenteService } from '../../../services/gestion-des-retours/retour-vente.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface CartLine {
  produit: any;
  quantite: number;
  prix: number;
}

interface LigneRetour {
  produit_id: number;
  nom: string;
  quantite_vendue: number;
  prix_unitaire: number;
  quantite_retournee: number;
}

interface CartSession {
  id: number;
  label: string;
  cart: CartLine[];
  remise: number;
  selectedClientId: number | null;
  clientNom: string;
  clientTel: string;
}

@Component({
  selector: 'app-pos-vente',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './pos-vente.component.html',
  styleUrl: './pos-vente.component.scss',
  providers: [ToastrService],
})
export default class PosVenteComponent implements OnInit, AfterViewInit {
  @ViewChild('scannerInput') scannerInputRef!: ElementRef<HTMLInputElement>;
  currentUser: any;
  produits:  any[] = [];
  filtered:  any[] = [];
  categories: { id: number; nom: string }[] = [];
  clients:   any[] = [];

  searchQuery        = '';
  selectedCategoryId: number | null = null;

  // ── Multi-session cart ────────────────────────────────────────────────────
  sessions: CartSession[] = [];
  activeSessionIdx = 0;
  private nextSessionId = 1;

  get activeSession(): CartSession { return this.sessions[this.activeSessionIdx]; }

  get cart(): CartLine[]            { return this.activeSession.cart; }
  set cart(v: CartLine[])           { this.activeSession.cart = v; }

  get remise(): number              { return this.activeSession.remise; }
  set remise(v: number)             { this.activeSession.remise = v; }

  get selectedClientId(): number | null { return this.activeSession.selectedClientId; }
  set selectedClientId(v: number | null){ this.activeSession.selectedClientId = v; }

  get clientNom(): string           { return this.activeSession.clientNom; }
  set clientNom(v: string)          { this.activeSession.clientNom = v; }

  get clientTel(): string           { return this.activeSession.clientTel; }
  set clientTel(v: string)          { this.activeSession.clientTel = v; }

  // Payment modal
  showPayModal  = false;
  modePaiement  = 'espece';
  montantRecu   = 0;
  detailsPaiement = { espece: 0, carte: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, credit: 0 };

  // Barcode
  barcodeInput = '';

  // Caisse
  activeSessionId: number | null = null;
  caisseActivee = false;

  // Stats du jour
  totalVentesJour = 0;
  nbVentesJour    = 0;

  // Mobile tab
  mobileTab: 'catalog' | 'cart' = 'catalog';

  loading      = false;
  isSubmitting = false;

  // ── Retour modal ──────────────────────────────────────────────────────────
  showRetourModal    = false;
  retourSearchRef    = '';
  retourSearchMontant: number | null = null;
  retourSearchDebut  = '';
  retourSearchFin    = '';
  retourSearchLoading = false;
  retourVentes: any[] = [];
  retourSearchDone   = false;
  retourVente: any   = null;
  retourLignes: LigneRetour[] = [];
  retourMotif        = '';
  retourSubmitting   = false;
  retourResult: any  = null;

  readonly MODES = [
    { value: 'espece',       label: 'Espèces',       icon: 'bi-cash' },
    { value: 'orange_money', label: 'Orange Money',  icon: 'bi-phone' },
    { value: 'wave',         label: 'Wave',          icon: 'bi-phone' },
    { value: 'mtn_money',    label: 'MTN Money',     icon: 'bi-phone' },
    { value: 'moov_money',   label: 'Moov Money',    icon: 'bi-phone' },
    { value: 'dajmo',        label: 'Dajmo',         icon: 'bi-phone' },
    { value: 'carte',        label: 'Carte',         icon: 'bi-credit-card' },
    { value: 'credit',       label: 'Crédit',        icon: 'bi-hourglass-split' },
    { value: 'mixte',        label: 'Mixte',         icon: 'bi-layers' },
  ];

  constructor(
    private authService:  AuthService,
    private produitSvc:   ProduitService,
    private ventesSvc:    VentesService,
    private clientSvc:    ClientService,
    private caisseSvc:    CaisseService,
    private boutiqueSvc:  BoutiqueService,
    private dashSvc:      DashService,
    private retourSvc:    RetourVenteService,
    private toastr:       ToastrService,
  ) {}

  ngOnInit(): void {
    this.sessions = [this.createSession()];
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadProduits();
        this.loadClients();
        this.loadCaisse();
        this.loadTotalJour();
      }
    });
  }

  ngAfterViewInit(): void {
    this.focusScanner();
  }

  focusScanner(): void {
    setTimeout(() => this.scannerInputRef?.nativeElement?.focus(), 150);
  }

  // ── Session management ────────────────────────────────────────────────────

  private createSession(): CartSession {
    const n = this.nextSessionId++;
    return { id: n, label: `Vente ${n}`, cart: [], remise: 0, selectedClientId: null, clientNom: '', clientTel: '' };
  }

  addSession(): void {
    if (this.sessions.length >= 5) return;
    this.sessions.push(this.createSession());
    this.activeSessionIdx = this.sessions.length - 1;
  }

  switchSession(idx: number): void {
    this.activeSessionIdx = idx;
  }

  closeSession(idx: number): void {
    if (this.sessions.length <= 1) return;
    const session = this.sessions[idx];
    if (session.cart.length > 0) {
      Swal.fire({
        title: `Fermer "${session.label}" ?`,
        text: 'Le panier de cette vente sera perdu.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Fermer quand même',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#dc3545',
      }).then(r => { if (r.isConfirmed) this.doCloseSession(idx); });
    } else {
      this.doCloseSession(idx);
    }
  }

  private doCloseSession(idx: number): void {
    this.sessions.splice(idx, 1);
    if (this.activeSessionIdx > idx) {
      this.activeSessionIdx--;
    } else if (this.activeSessionIdx >= this.sessions.length) {
      this.activeSessionIdx = this.sessions.length - 1;
    }
  }

  get boutiqueId(): number | null {
    return this.currentUser?.boutique_id
      ?? this.currentUser?.boutique?.id
      ?? null;
  }

  // ── Products ──────────────────────────────────────────────────────────────

  loadProduits(): void {
    if (!this.boutiqueId) return;
    this.loading = true;
    this.produitSvc.getProduits({ boutique: this.boutiqueId })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          this.produits = r?.data ?? (Array.isArray(r) ? r : []);
          const catMap = new Map<number, string>();
          for (const p of this.produits) {
            if (p.categorie?.id) catMap.set(p.categorie.id, p.categorie.nom);
          }
          this.categories = Array.from(catMap, ([id, nom]) => ({ id, nom }));
          this.applyFilter();
        },
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = this.produits.filter(p => {
      const matchSearch = !q
        || p.nom?.toLowerCase().includes(q)
        || p.code_barre?.toLowerCase().includes(q);
      const matchCat = !this.selectedCategoryId
        || p.categorie?.id === this.selectedCategoryId;
      return matchSearch && matchCat;
    });
  }

  selectCategory(id: number | null): void {
    this.selectedCategoryId = id;
    this.applyFilter();
  }

  productImage(p: any): string {
    return p?.imageUrl || p?.image || '';
  }

  stockBadge(p: any): string {
    const s = p.stock_disponible ?? 0;
    if (s <= 0) return 'danger';
    if (s <= 5)  return 'warning';
    return 'success';
  }

  // ── Barcode ───────────────────────────────────────────────────────────────

  onScanBarcode(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const code = this.normalizeBarcode(this.barcodeInput.trim());
      if (code) this.doScan(code);
      return;
    }
  }

  onBarcodeInput(): void {
    const normalized = this.normalizeBarcode(this.barcodeInput.trim());
    if (/^\d{13}$/.test(normalized)) {
      this.barcodeInput = '';
      this.doScan(normalized);
    }
  }

  // Convertit les caractères AZERTY (français) en chiffres
  // pour que le scanner fonctionne sans changer le layout clavier du PC
  private normalizeBarcode(input: string): string {
    const map: Record<string, string> = {
      'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
      '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9',
    };
    return input.split('').map(c => map[c] ?? c).join('');
  }

  private doScan(code: string): void {
    if (!this.boutiqueId) return;
    this.barcodeInput = '';
    this.produitSvc.scanByCodeBarre(code, this.boutiqueId).subscribe({
      next: (res: any) => {
        const p = res?.data || res;
        if (p?.id) {
          this.addToCart(p);
          this.focusScanner();
        } else {
          this.toastr.warning('Produit non trouvé');
          this.focusScanner();
        }
      },
      error: () => {
        this.toastr.error('Produit non trouvé pour ce code-barres');
        this.focusScanner();
      },
    });
  }

  printThermique(venteId: number): void {
    const token = this.authService.getToken();
    const url = `/api/pdf/generate/facture/${venteId}/thermique/print?token=${token}`;

    console.group(`[printThermique] venteId=${venteId}`);
    console.log('URL:', url);
    console.log('token présent:', !!token, '| longueur:', token?.length ?? 0);

    // Fetch de diagnostic — vérifier ce que le serveur renvoie réellement
    fetch(url)
      .then(async res => {
        const text = await res.text();
        console.log('HTTP status:', res.status, res.statusText);
        console.log('Content-Type:', res.headers.get('content-type'));
        console.log('Taille réponse (chars):', text.length);
        console.log('Aperçu réponse (300 premiers chars):', text.slice(0, 300));
        if (text.length === 0) {
          console.error('[printThermique] La réponse du serveur est VIDE — le reçu sera blanc');
        }
      })
      .catch(err => console.error('[printThermique] Erreur fetch diagnostic:', err));

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);

    iframe.onerror = (e) => {
      console.error('[printThermique] iframe onerror:', e);
    };

    iframe.onload = () => {
      console.log('iframe chargé');
      try {
        const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
        const bodyHtml = doc?.body?.innerHTML ?? '';
        console.log('Taille HTML dans iframe (chars):', bodyHtml.length);
        console.log('Aperçu HTML iframe (300 chars):', bodyHtml.slice(0, 300));
        if (bodyHtml.length === 0) {
          console.error('[printThermique] Le body de l\'iframe est VIDE');
        }
      } catch (e) {
        console.warn('[printThermique] Impossible de lire le contenu iframe (cross-origin?):', e);
      }
      console.log('contentWindow disponible:', !!iframe.contentWindow);
      console.groupEnd();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    };

    iframe.src = url;
    console.log('iframe.src défini, en attente du chargement…');
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  addToCart(product: any): void {
    if ((product.stock_disponible ?? 0) <= 0) {
      this.toastr.warning(`${product.nom} est en rupture de stock`);
      return;
    }
    const idx = this.cart.findIndex(l => l.produit.id === product.id);
    if (idx >= 0) {
      if (this.cart[idx].quantite < product.stock_disponible) {
        this.cart[idx].quantite++;
      } else {
        this.toastr.warning(`Stock max atteint (${product.stock_disponible})`);
      }
    } else {
      this.cart.push({ produit: product, quantite: 1, prix: product.prix_vente });
    }
  }

  removeFromCart(i: number): void { this.cart.splice(i, 1); }

  increaseQty(i: number): void {
    const l = this.cart[i];
    if (l.quantite < l.produit.stock_disponible) l.quantite++;
    else this.toastr.warning(`Stock max : ${l.produit.stock_disponible}`);
  }

  decreaseQty(i: number): void {
    if (this.cart[i].quantite > 1) this.cart[i].quantite--;
    else this.removeFromCart(i);
  }

  clearCart(): void {
    if (this.cart.length === 0) return;
    Swal.fire({
      title: 'Vider le panier ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Vider',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => { if (r.isConfirmed) { this.cart = []; this.remise = 0; } });
  }

  get sousTotal(): number {
    return this.cart.reduce((s, l) => s + l.quantite * l.prix, 0);
  }

  get totalTTC(): number {
    return Math.max(0, this.sousTotal - (Number(this.remise) || 0));
  }

  get monnaie(): number {
    return (Number(this.montantRecu) || 0) - this.totalTTC;
  }

  get isMixte(): boolean  { return this.modePaiement === 'mixte'; }
  get isCredit(): boolean { return this.modePaiement === 'credit'; }

  get totalMixte(): number {
    const d = this.detailsPaiement;
    return (Number(d.espece) || 0) + (Number(d.carte) || 0)
         + (Number(d.credit) || 0)
         + (Number(d.orange_money) || 0) + (Number(d.wave) || 0)
         + (Number(d.mtn_money) || 0) + (Number(d.moov_money) || 0)
         + (Number(d.dajmo) || 0);
  }

  // ── Clients ───────────────────────────────────────────────────────────────

  loadClients(): void {
    if (!this.boutiqueId) return;
    this.clientSvc.getClientsByBoutique(this.boutiqueId).subscribe({
      next: (r: any) => {
        this.clients = r?.data?.items ?? r?.data ?? (Array.isArray(r) ? r : []);
      },
    });
  }

  onClientSelect(id: number | null): void {
    if (!id) { this.clientNom = ''; this.clientTel = ''; return; }
    const c = this.clients.find(cl => cl.id === id);
    if (c) {
      this.clientNom = `${c.prenoms || ''} ${c.nom || ''}`.trim() || c.nom || '';
      this.clientTel = c.telephone || '';
    }
  }

  // ── Stats du jour ─────────────────────────────────────────────────────────

  loadTotalJour(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? this.currentUser?.boutique?.id;
    const caissier   = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) return;
    this.dashSvc.findCaissier(boutiqueId, caissier).subscribe({
      next: (res: any) => {
        this.totalVentesJour = res?.chiffre_affaires ?? 0;
        this.nbVentesJour    = res?.nb_ventes ?? 0;
      },
    });
  }

  // ── Caisse ────────────────────────────────────────────────────────────────

  loadCaisse(): void {
    if (!this.boutiqueId) return;
    this.boutiqueSvc.findOne(this.boutiqueId).subscribe({
      next: (r: any) => {
        const b = r?.data || r;
        this.caisseActivee = !!b?.gestion_caisse_activee;
        if (this.caisseActivee) {
          this.caisseSvc.getActiveSession(this.boutiqueId!, this.currentUser?.telephone).subscribe({
            next: (res: any) => { this.activeSessionId = res?.data?.id ?? null; },
            error: () => { this.activeSessionId = null; },
          });
        }
      },
    });
  }

  // ── Payment ───────────────────────────────────────────────────────────────

  openPayModal(): void {
    if (this.cart.length === 0) { this.toastr.warning('Le panier est vide'); return; }
    if (this.caisseActivee && !this.activeSessionId) {
      Swal.fire({
        icon: 'warning',
        title: 'Caisse non ouverte',
        text: 'Ouvrez une session de caisse avant d\'encaisser.',
      });
      return;
    }
    this.modePaiement = 'espece';
    this.montantRecu  = this.totalTTC;
    this.detailsPaiement = { espece: 0, carte: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, credit: 0 };
    this.showPayModal = true;
  }

  closePayModal(): void { this.showPayModal = false; }

  onModeChange(): void {
    this.montantRecu  = this.isCredit ? 0 : this.totalTTC;
    this.detailsPaiement = { espece: 0, carte: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, credit: 0 };
  }

  submit(): void {
    if (this.isMixte) {
      if (Math.abs(this.totalMixte - this.totalTTC) > 0) {
        this.toastr.error(
          `Répartition incorrecte : ${this.totalMixte.toLocaleString('fr')} ≠ ${this.totalTTC.toLocaleString('fr')} FCFA`
        );
        return;
      }
    } else if (!this.isCredit && (Number(this.montantRecu) || 0) <= 0) {
      this.toastr.error('Saisissez le montant reçu');
      return;
    }

    const body = {
      user:     this.currentUser?.telephone,
      boutique: this.currentUser?.boutique,
      date_vente: new Date().toISOString().slice(0, 10),
      mode_paiement: this.modePaiement,
      statut: this.isCredit ? 'non_payer' : 'payer',
      montant_total: this.sousTotal,
      remise: Number(this.remise) || 0,
      montant_total_apres_remise: this.totalTTC,
      montant_recu:   this.isCredit ? 0 : Number(this.montantRecu),
      monnaie_rendu:  this.isCredit ? 0 : Math.max(0, this.monnaie),
      details_paiement: this.isMixte ? { ...this.detailsPaiement } : null,
      clientdata: (this.clientNom || this.clientTel)
        ? { nom: this.clientNom, telephone: this.clientTel } : null,
      session_caisse: this.activeSessionId,
      detail_vente: this.cart.map(l => ({
        produit:            l.produit.id,
        quantite:           l.quantite,
        prix_unitaire_vente: l.prix,
      })),
    };

    this.isSubmitting = true;
    this.ventesSvc.saveVente(body)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res: any) => {
          this.showPayModal = false;
          // Reset or close the current session after a successful sale
          if (this.sessions.length > 1) {
            this.doCloseSession(this.activeSessionIdx);
          } else {
            this.cart = [];
            this.remise = 0;
            this.selectedClientId = null;
            this.clientNom = '';
            this.clientTel = '';
          }
          this.loadProduits();   // refresh stock
          this.loadTotalJour();  // refresh total du jour

          const venteId = res?.data?.idVente;
          Swal.fire({
            icon: 'success',
            title: 'Vente enregistrée !',
            html: '<small class="text-muted">Choisissez le format d\'impression</small>',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="bi bi-printer me-1"></i> Imprimer (thermique)',
            denyButtonText: '<i class="bi bi-file-earmark-pdf me-1"></i> PDF A4',
            cancelButtonText: 'Fermer',
            confirmButtonColor: '#198754',
            denyButtonColor: '#0d6efd',
            preConfirm: () => true,
            preDeny: () =>
              firstValueFrom(this.ventesSvc.imprimerRecu(venteId))
                .catch(() => Swal.showValidationMessage('Impossible de générer le reçu A4')),
          }).then(r => {
            if (r.isConfirmed) {
              this.printThermique(venteId);
            } else if (r.isDenied && r.value?.path) {
              window.open(r.value.path, '_blank');
            }
          });
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la vente'),
      });
  }

  // ── Retour produit ────────────────────────────────────────────────────────

  get peutFaireRetour(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure') return true;
    return !!this.currentUser?.peut_faire_retour;
  }

  openRetourModal(): void {
    this.retourResult = null;
    this.retourVente = null;
    this.retourLignes = [];
    this.retourVentes = [];
    this.retourSearchDone = false;
    this.retourSearchRef = '';
    this.retourSearchMontant = null;
    this.retourSearchDebut = '';
    this.retourSearchFin = '';
    this.retourMotif = '';
    this.showRetourModal = true;
  }

  rechercherVenteRetour(): void {
    if (!this.boutiqueId) return;
    const params: any = { boutique: this.boutiqueId, page: 1, limit: 10 };
    if (this.retourSearchRef?.trim())  params['reference']  = this.retourSearchRef.trim();
    if (this.retourSearchMontant != null) params['montant'] = this.retourSearchMontant;
    if (this.retourSearchDebut)  params['date_debut'] = this.retourSearchDebut;
    if (this.retourSearchFin)    params['date_fin']   = this.retourSearchFin;

    this.retourSearchLoading = true;
    this.retourVente = null;
    this.retourLignes = [];
    this.ventesSvc.getAllVentes(params).subscribe({
      next: (r: any) => {
        this.retourVentes = r?.data?.items ?? r?.data ?? (Array.isArray(r) ? r : []);
        this.retourSearchLoading = false;
        this.retourSearchDone = true;
      },
      error: () => { this.retourSearchLoading = false; this.retourSearchDone = true; },
    });
  }

  selectionnerVenteRetour(v: any): void {
    this.retourVente = null;
    this.retourLignes = [];
    this.ventesSvc.getDetailVente(v.id).subscribe({
      next: (r: any) => {
        const data = r?.data ?? r;
        this.retourVente = data;
        const details: any[] = data.detail_vente ?? data.details ?? [];
        this.retourLignes = details.map((d: any) => ({
          produit_id: d.produit?.id ?? d.produit_id,
          nom: d.produit?.nom ?? `Produit #${d.produit_id}`,
          quantite_vendue: d.quantite,
          prix_unitaire: d.prix_unitaire_vente ?? d.prix_unitaire,
          quantite_retournee: 0,
        }));
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Impossible de charger la vente'),
    });
  }

  get retourLignesSelectionnees(): LigneRetour[] {
    return this.retourLignes.filter(l => l.quantite_retournee > 0);
  }

  get retourTotal(): number {
    return this.retourLignesSelectionnees.reduce((s, l) => s + l.quantite_retournee * l.prix_unitaire, 0);
  }

  submitRetour(): void {
    if (!this.retourVente || !this.retourLignesSelectionnees.length) return;
    this.retourSubmitting = true;
    this.retourSvc.create({
      vente_id: this.retourVente.id,
      boutique: this.boutiqueId!,
      motif: this.retourMotif.trim() || undefined,
      user: this.currentUser?.telephone ?? undefined,
      details: this.retourLignesSelectionnees.map(l => ({
        produit_id: l.produit_id,
        quantite_retournee: l.quantite_retournee,
      })),
    }).pipe(finalize(() => (this.retourSubmitting = false))).subscribe({
      next: (r: any) => {
        this.retourResult = r?.data ?? r;
        this.loadProduits(); // rafraîchir le stock
        this.toastr.success('Retour enregistré');
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors du retour'),
    });
  }
}
