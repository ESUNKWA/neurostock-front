import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-historique-achats',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './historique-achats.component.html',
  styleUrl: './historique-achats.component.scss',
  providers: [ToastrService]
})
export default class HistoriqueAchatsComponent implements OnInit, OnDestroy {
  achats: any[] = [];
  currentUser: any;
  idBoutique: number = 0;
  boutiques: any[] = [];
  isLoading: boolean = false;
  detailsAchat: any;
  mobileDetailItem: any = null;
  dateDebut: string = '';
  dateFin: string = '';
  
  constructor(
    private achatsService: AchatsService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.initDateRange();
    this.getCurrentUser();
    this.loadBoutiques();
    //this.loadAchats();
    
    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser.profil.code.toLowerCase();
    if (code === 'admin') {
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
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
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

  private initDateRange(): void {
    const today = new Date();
    const debut = new Date();
    debut.setDate(today.getDate() - 30);
    this.dateFin   = today.toISOString().split('T')[0];
    this.dateDebut = debut.toISOString().split('T')[0];
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.idBoutique = parseInt(selectElement.value);
    this.loadAchats();
  }

  onDateChange(): void {
    this.loadAchats();
  }

  ngAfterViewInit() {
    // Initialisation de Select2
    ($('#mySelect') as any).select2({
      placeholder: 'Sélectionnez une boutique',
      allowClear: true,
      width: 'resolve',
    });

    // Gérer les changements
    ($('#mySelect') as any).on('change', (e: any) => {
      const idBoutique = ($('#mySelect') as any).val();
      this.idBoutique = parseInt(idBoutique);
    this.loadAchats();
    });
  }

  /**
   * Recharge les données et rafraîchit le tableau
   */
  loadAchats(): void {
    this.isLoading = true;

    if (this.currentUser.profil.description.toLowerCase() === 'administrateur' || this.currentUser.profil.description.toLowerCase() === 'responsable structure') {
      if (!this.idBoutique) {
        this.achats = [];
        this.isLoading = false;
        return;
      }
    } else {
      this.idBoutique = this.currentUser.boutique_id
    }
    
    const body: any = {
      boutique: this.idBoutique,
      ...(this.dateDebut && { date_debut: this.dateDebut }),
      ...(this.dateFin   && { date_fin:   this.dateFin }),
    };

    this.achatsService.getAllAchats(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.achats = response.data;
          this.destroyDataTable();

          // Donner le temps au DOM de se mettre à jour
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              try {
                // Réinitialiser le tableau avec les nouvelles données
                this.initDataTable();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation de DataTable:', error);
              }
              this.isLoading = false;
            }
          }, 50); // Temps d'attente réduit pour une mise à jour plus rapide
        } else {
          this.isLoading = false;
          this.toastr.error('Erreur lors du chargement des achats');
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des achats');
        console.error(error);
      }
    });
  }

  /**
   * Détruit l'instance DataTable existante
   */
  private destroyDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const table = $('.js-dataTable-buttons');
        if ($.fn.DataTable.isDataTable(table)) {
          table.DataTable().destroy();
          // Ne pas vider la table pour conserver les en-têtes
        }
      } catch (error) {
        console.error('Erreur lors de la destruction de DataTable:', error);
      }
    }
  }

  /**
   * Initialise une instance DataTable
   */
  private initDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        $('.js-dataTable-buttons').DataTable({
          data: this.achats,
          columns: [
            { 
              data: 'reference',
              render: (data: any) => `<span class="fw-semibold">${data || ''}</span>` 
            },
            { 
              data: 'libelle',
              render: (data: any) => data || 'Non défini' 
            },
            { 
              data: 'montant_total',
              render: (data: any) => `${data.toLocaleString()} FCFA` 
            },
            { 
              data: 'fournisseur',
              render: (data: any) => data?.nom || 'Non défini'
            },
            {
              data: 'statut',
              render: (data: any) => {
                let badgeClass = '';
                switch(data.toLowerCase()) {
                  case 'payer':
                    badgeClass = 'bg-success';
                    break;
                  case 'non payer':
                    badgeClass = 'bg-danger';
                    break;
                  default:
                    badgeClass = 'bg-secondary';
                }
                return `<span class="badge ${badgeClass}">${data}</span>`;
              }
            },
            { 
              data: 'date_achat',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              }
            },
            { 
              data: null,
              className: 'text-center',
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                return `
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-info me-2" data-bs-toggle="tooltip" title="Visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-warning me-2" data-bs-toggle="tooltip" title="Imprimer" data-action="print" data-id="${row.id}">
                      <i class="bi bi-printer"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-2" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" data-bs-toggle="tooltip" title="Supprimer" data-action="delete" data-id="${row.id}">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                `;
              }
            }
          ],
          language: {
            emptyTable: 'Aucun achat trouvé',
            search: 'Rechercher :',
            info: 'Affichage de _START_ à _END_ sur _TOTAL_ résultat(s)',
            infoEmpty: 'Aucun résultat',
            zeroRecords: 'Aucun résultat',
            lengthMenu: 'Afficher _MENU_ éléments',
            paginate: { first: '«', last: '»', next: '›', previous: '‹' },
          },
          dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'btn btn-success btn-sm me-1',
              exportOptions: {
                columns: [0, 1, 2, 3, 4, 5] // Exporter toutes les colonnes sauf Actions
              }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'btn btn-danger btn-sm',
              exportOptions: {
                columns: [0, 1, 2, 3, 4, 5] // Exporter toutes les colonnes sauf Actions
              }
            }
          ],
          pageLength: 20,
          searching: true,
          info: true,
          responsive: true,
          ordering: true,
          pagingType: 'full_numbers',
          stateSave: false,
          retrieve: false,
          autoWidth: false,
          drawCallback: () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
          },
          createdRow: (row: any, data: any, dataIndex: any) => {
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const achat = this.achats.find((a: any) => a.id === id);
              
              if (!achat) return;
              
              switch (action) {
                case 'view':
                  this.viewDetails(achat);
                  break;
                case 'print':
                  this.printAchat(achat);
                  break;
                case 'edit':
                  this.editAchat(achat);
                  break;
                case 'delete':
                  this.deleteAchat(achat);
                  break;
              }
            });
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de DataTable:', error);
      }
    }
  }

  getDetailsAchat(id: any) {
    this.achatsService.getDetailsAchat(id).subscribe({
      next: (response: any) => {
        this.detailsAchat = response.data.detail_achat;
        
        // Mettre à jour le tableau des détails produits si le modal est déjà ouvert
        this.updateProduitsTable();
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération des détails de l\'achat:', error);
      }
    });
  }

  /**
   * Met à jour le tableau des produits avec les détails
   */
  updateProduitsTable(): void {
    const tableBody = document.getElementById('detail-produits-body');
    const totalElement = document.getElementById('detail-total-montant');
    
    if (!tableBody || !this.detailsAchat) return;
    
    // Vider le tableau
    tableBody.innerHTML = '';
    
    // Si aucun détail n'est disponible
    if (this.detailsAchat.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-3">Aucun détail disponible</td>
        </tr>
      `;
      if (totalElement) totalElement.textContent = '0 FCFA';
      return;
    }
    
    // Calculer le montant total
    let montantTotal = 0;
    
    // Ajouter les détails au tableau
    this.detailsAchat.forEach((detail: any, index: number) => {
      const produit = detail.produit;
      const prixUnitaire = detail.prix_unitaire;
      const quantite = detail.quantite;
      const total = prixUnitaire * quantite;
      
      montantTotal += total;
      
      const row = document.createElement('tr');
      row.className = 'align-middle';
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>
          <div class="d-flex align-items-center">
            <!-- ${produit.image ? 
              `<img src="${produit.image}" alt="${produit.nom}" class="me-2 rounded product-thumbnail" width="40">` : 
              '<div class="product-icon me-2"><i class="bi bi-box-seam fs-4"></i></div>'
            } -->
            <div>
              <div class="fw-semibold">${produit.nom}</div>
              <small class="text-muted">${produit.description || ''}</small>
            </div>
          </div>
        </td>
        <td class="text-end">${prixUnitaire.toLocaleString()} FCFA</td>
        <td class="text-center">
          <span class="badge bg-light text-dark">${quantite}</span>
        </td>
        <td class="text-end">${total.toLocaleString()} FCFA</td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Mettre à jour le montant total
    if (totalElement) {
      totalElement.textContent = `${montantTotal.toLocaleString()} FCFA`;
    }
  }

  /**
   * Afficher les détails d'un achat
   */
  viewDetails(achat: any): void {
    // Récupérer les détails de l'achat (sera traité de manière asynchrone)
    this.getDetailsAchat(achat.id);
    
    // Formater la date d'achat
    const dateAchat = achat.date_achat ? new Date(achat.date_achat) : null;
    const dateFormatee = dateAchat ? 
      `${dateAchat.getDate().toString().padStart(2, '0')}/${(dateAchat.getMonth() + 1).toString().padStart(2, '0')}/${dateAchat.getFullYear()}` : 
      'Non définie';
    
    // Formater le montant
    const montantFormatte = achat.montant_total ? `${achat.montant_total.toLocaleString()} FCFA` : '0 FCFA';
    
    // Déterminer la classe du badge pour le statut
    let badgeClass = '';
    switch(achat.statut?.toLowerCase()) {
      case 'payer':
        badgeClass = 'bg-success';
        break;
      case 'non payer':
        badgeClass = 'bg-danger';
        break;
      default:
        badgeClass = 'bg-secondary';
    }
    
    // Ouvrir le modal pour afficher les détails
    const modal = document.getElementById('modal-view-details');
    if (modal) {
      // Remplir les informations générales
      document.getElementById('detail-reference')!.textContent = achat.reference || 'Non définie';
      document.getElementById('detail-libelle')!.textContent = achat.libelle || 'Non défini';
      document.getElementById('detail-date')!.textContent = dateFormatee;
      document.getElementById('detail-montant')!.textContent = montantFormatte;
      document.getElementById('detail-mode-paiement')!.textContent = achat.mode_paiement || 'Non défini';
      
      // Remplir le statut avec badge
      const statutElement = document.getElementById('detail-statut');
      if (statutElement) {
        statutElement.innerHTML = `<span class="badge ${badgeClass}">${achat.statut || 'Non défini'}</span>`;
      }
      
      // Remplir les informations du fournisseur
      if (achat.fournisseur) {
        document.getElementById('detail-fournisseur-nom')!.textContent = achat.fournisseur.nom || 'Non défini';
        document.getElementById('detail-fournisseur-adresse')!.textContent = achat.fournisseur.addresse_geo || 'Non définie';
        document.getElementById('detail-fournisseur-contact')!.textContent = achat.fournisseur.contact || 'Non défini';
        document.getElementById('detail-fournisseur-email')!.textContent = achat.fournisseur.email || 'Non défini';
        document.getElementById('detail-fournisseur-interlocuteur')!.textContent = 
          achat.fournisseur.interlocuteur ? 
          `${achat.fournisseur.interlocuteur} (${achat.fournisseur.contact_interlocuteur || 'Pas de contact'})` : 
          'Non défini';
      } else {
        document.getElementById('detail-fournisseur-nom')!.textContent = 'Non défini';
        document.getElementById('detail-fournisseur-adresse')!.textContent = 'Non définie';
        document.getElementById('detail-fournisseur-contact')!.textContent = 'Non défini';
        document.getElementById('detail-fournisseur-email')!.textContent = 'Non défini';
        document.getElementById('detail-fournisseur-interlocuteur')!.textContent = 'Non défini';
      }
      
      // Remplir la description
      document.getElementById('detail-description')!.textContent = achat.description || 'Aucune description disponible';
      
      // Initialiser le tableau des produits (sera mis à jour par la méthode updateProduitsTable)
      const tableBody = document.getElementById('detail-produits-body');
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-3">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              Chargement des détails...
            </td>
          </tr>
        `;
      }
      
      // Mettre à jour le tableau si les détails sont déjà disponibles
      if (this.detailsAchat && this.detailsAchat.length > 0) {
        this.updateProduitsTable();
      }
      
      // Configurer le bouton d'impression
      const btnPrint = document.getElementById('btn-print-detail');
      if (btnPrint) {
        btnPrint.onclick = () => this.printAchat(achat);
      }
      
      // Afficher le modal
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  editAchat(achat: any): void {
    this.isLoading = true;
    this.achatsService.getDetailsAchat(achat.id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          // Stocker temporairement les données de l'approvisionnement dans le localStorage
          // Cela permet de les récupérer après redirection
          localStorage.setItem('editAchatData', JSON.stringify({
            id: achat.id,
            achat: response.data
          }));
          
          // Rediriger vers la page d'approvisionnement pour modification
          this.router.navigate(['/gestion-des-approvisionnements/approvisionnement']);
        } else {
          this.toastr.error('Erreur lors de la récupération des données de l\'approvisionnement');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération des détails de l\'achat:', error);
        this.toastr.error('Erreur lors de la récupération des données de l\'approvisionnement');
        this.isLoading = false;
      }
    });
  }

  deleteAchat(achat: any): void {
    console.log('Supprimer l\'achat:', achat);
  }

  /**
   * Imprimer un achat
   */
  printAchat(achat: any): void {
    
    // Création d'une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastr.error('Veuillez autoriser les popups pour cette fonctionnalité');
      return;
    }
    
    // Formatage de la date
    const dateAchat = achat.date_achat ? new Date(achat.date_achat) : null;
    const dateFormatee = dateAchat ? 
      `${dateAchat.getDate().toString().padStart(2, '0')}/${(dateAchat.getMonth() + 1).toString().padStart(2, '0')}/${dateAchat.getFullYear()}` : 
      'Non définie';
    
    // Générer le HTML pour les détails des produits
    let produitsHTML = '';
    let totalGeneral = 0;
    
    if (this.detailsAchat && this.detailsAchat.length > 0) {
      produitsHTML = `
        <div class="products-section">
          <div class="info-title">Détails des produits</div>
          <table class="products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produit</th>
                <th>Prix unitaire</th>
                <th>Quantité</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      this.detailsAchat.forEach((detail: any, index: number) => {
        const produit = detail.produit;
        const prixUnitaire = detail.prix_unitaire;
        const quantite = detail.quantite;
        const total = prixUnitaire * quantite;
        
        totalGeneral += total;
        
        produitsHTML += `
          <tr>
            <td>${index + 1}</td>
            <td>${produit.nom}</td>
            <td>${prixUnitaire.toLocaleString()} FCFA</td>
            <td>${quantite}</td>
            <td>${total.toLocaleString()} FCFA</td>
          </tr>
        `;
      });
      
      produitsHTML += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="text-right">Montant Total :</td>
                <td>${totalGeneral.toLocaleString()} FCFA</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else {
      produitsHTML = `
        <div class="products-section">
          <div class="info-title">Détails des produits</div>
          <p class="no-data">Aucun détail de produit disponible</p>
        </div>
      `;
    }
    
    // Création du contenu HTML pour l'impression
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Achat ${achat.reference || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info-container { display: flex; justify-content: space-between; margin: 20px; }
          .info-section { width: 48%; }
          .info-title { font-weight: bold; background-color: #f0f0f0; padding: 5px; margin-bottom: 10px; }
          .info-item { margin: 10px 0; }
          .info-label { font-weight: bold; display: inline-block; width: 150px; }
          .description-section { margin-top: 20px; margin: 20px; }
          .products-section { margin: 20px; }
          .products-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .products-table th, .products-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .products-table th { background-color: #f0f0f0; }
          .products-table tfoot { font-weight: bold; }
          .text-right { text-align: right; }
          .no-data { text-align: center; color: #777; padding: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; }
          @media print {
            body { margin: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>DÉTAILS DE L'APPROVISIONNEMENT</h2>
          <h3>${achat.reference || ''}</h3>
        </div>
        
        <div class="info-container">
          <div class="info-section">
            <div class="info-title">Informations générales</div>
            <div class="info-item">
              <span class="info-label">Référence:</span> ${achat.reference || 'Non définie'}
            </div>
            <div class="info-item">
              <span class="info-label">Libellé:</span> ${achat.libelle || 'Non défini'}
            </div>
            <div class="info-item">
              <span class="info-label">Date d'achat:</span> ${dateFormatee}
            </div>
            <div class="info-item">
              <span class="info-label">Montant total:</span> ${achat.montant_total ? achat.montant_total.toLocaleString() + ' FCFA' : '0 FCFA'}
            </div>
            <div class="info-item">
              <span class="info-label">Mode de paiement:</span> ${achat.mode_paiement || 'Non défini'}
            </div>
            <div class="info-item">
              <span class="info-label">Statut:</span> ${achat.statut || 'Non défini'}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-title">Informations du fournisseur</div>
            <div class="info-item">
              <span class="info-label">Nom:</span> ${achat.fournisseur?.nom || 'Non défini'}
            </div>
            <div class="info-item">
              <span class="info-label">Adresse:</span> ${achat.fournisseur?.addresse_geo || 'Non définie'}
            </div>
            <div class="info-item">
              <span class="info-label">Contact:</span> ${achat.fournisseur?.contact || 'Non défini'}
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span> ${achat.fournisseur?.email || 'Non défini'}
            </div>
            <div class="info-item">
              <span class="info-label">Interlocuteur:</span> ${achat.fournisseur?.interlocuteur || 'Non défini'} 
              ${achat.fournisseur?.contact_interlocuteur ? '(' + achat.fournisseur.contact_interlocuteur + ')' : ''}
            </div>
          </div>
        </div>
        
        <div class="description-section">
          <div class="info-title">Description</div>
          <p>${achat.description || 'Aucune description disponible'}</p>
        </div>
        
        ${produitsHTML}
        
        <div class="footer">
          <p>Document généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;
    
    // Écrire le contenu dans la fenêtre d'impression
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = function() {
      printWindow.print();
      // printWindow.close(); // Commenter cette ligne pour permettre à l'utilisateur de fermer la fenêtre lui-même
    };
  }
}
