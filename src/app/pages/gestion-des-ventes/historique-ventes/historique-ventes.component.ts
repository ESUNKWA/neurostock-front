import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-historique-ventes',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './historique-ventes.component.html',
  styleUrl: './historique-ventes.component.scss',
  providers: [ToastrService]
})
export default class HistoriqueVentesComponent implements OnInit, OnDestroy {
  ventes: any[] = [];
  currentUser: any;
  idBoutique: number = 0;
  boutiques: any[] = [];
  isLoading: boolean = false;
  detailsVente: any;
  vente: any = {};
  facture: any = {
    vente: {},
      details: []
  };
  
  constructor(
    private ventesService: VentesService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBoutiques();
    this.loadVentes();
    
    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
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
    this.loadVentes();
    });
  }

  ngOnDestroy(): void {
    // Nettoyage pour éviter les fuites mémoire
    ($('#mySelect') as any).select2('destroy');
    this.destroyDataTable();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  loadBoutiques(): void {
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
      if (this.currentUser.profil.code.toLowerCase() === 'responsable_structure') {
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

  /* onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.idBoutique = parseInt(selectElement.value);
    this.loadVentes();
  } */

  /**
   * Recharge les données et rafraîchit le tableau
   */
  loadVentes(): void {
    this.isLoading = true;
    
    if (this.currentUser.profil.code.toLowerCase() === 'admin' || this.currentUser.profil.code.toLowerCase() === 'gerant') {
      if (!this.idBoutique) {
        this.ventes = [];
        this.isLoading = false;
        return;
      }
    } else {
      this.idBoutique = this.currentUser.boutique.id;
    }
    
    const body: any = {
      boutique: this.idBoutique
    }

    this.ventesService.getAllVentes(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.ventes = response.data;
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
          this.toastr.error('Erreur lors du chargement des ventes');
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des ventes');
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
          data: this.ventes,
          columns: [
            { 
              data: 'reference',
              render: (data: any) => `<span class="fw-semibold">${data || ''}</span>` 
            },
            { 
              data: 'montant_total_apres_remise',
              render: (data: any) => `${data.toLocaleString()} FCFA` 
            },
            {
              data: 'statut',
              render: (data: any) => {
                let badgeClass = '';
                switch(data.toLowerCase()) {
                  case 'payer':
                    badgeClass = 'bg-success';
                    break;
                  case 'non_payer':
                    badgeClass = 'bg-danger';
                    break;
                  default:
                    badgeClass = 'bg-secondary';
                }
                return `<span class="badge ${badgeClass}">${data}</span>`;
              }
            },
            { 
              data: 'created_at',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/` +
                      `${(date.getMonth() + 1).toString().padStart(2, '0')}/` +
                      `${date.getFullYear()} ` +
                      ` à ${date.getHours().toString().padStart(2, '0')}:` +
                      `${date.getMinutes().toString().padStart(2, '0')}:` +
                      `${date.getSeconds().toString().padStart(2, '0')}`;

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
            emptyTable: "Aucune donnée",
            info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
            infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
            infoFiltered: "(filtré de _MAX_ entrées au total)",
            infoThousands: ",",
            lengthMenu: "Afficher _MENU_ entrées",
            loadingRecords: "Chargement...",
            processing: "Traitement...",
            search: "Rechercher :",
            zeroRecords: "Aucun enregistrement trouvé",
            paginate: {
              first: '<i class="bi bi-chevron-double-left"></i>',
              last: '<i class="bi bi-chevron-double-right"></i>',
              next: '<i class="bi bi-chevron-right"></i>',
              previous: '<i class="bi bi-chevron-left"></i>'
            }
          },
          dom: '<"row"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>' +
               '<"row"<"col-sm-12"tr>>' +
               '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'btn btn-success btn-sm me-2',
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
          pageLength: 10,
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
              const vente = this.ventes.find((v: any) => v.id === id);
              
              if (!vente) return;
              
              switch (action) {
                case 'view':
                  this.viewDetails(vente);
                  break;
                case 'print':
                  this.printVente(vente);
                  break;
                case 'edit':
                  this.editVente(vente);
                  break;
                case 'delete':
                  this.deleteVente(vente);
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

  getDetailsVente(id: any) {
    this.ventesService.getDetailVente(id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.detailsVente = response.data.detail_vente;
           
           this.vente.detail_vente = this.detailsVente;
          this.facture = this.vente;
           
          // Mettre à jour le tableau des détails produits si le modal est déjà ouvert
          this.updateProduitsTable();
        }
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération des détails de la vente:', error);
      }
    });
  }

  /**
   * Met à jour le tableau des produits avec les détails
   */
  updateProduitsTable(): void {
    const tableBody = document.getElementById('detail-produits-body');
    const totalElement = document.getElementById('detail-total-montant');
    const totalNet = document.getElementById('detail-total-montant-net');
    const remise = document.getElementById('detail-total-remise');
    
    if (!tableBody || !this.detailsVente) return;
    
    // Vider le tableau
    tableBody.innerHTML = '';
    
    // Si aucun détail n'est disponible
    if (this.detailsVente.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-3">Aucun détail disponible</td>
        </tr>
      `;
      if (totalElement) totalElement.textContent = '0 FCFA';
      if (remise) remise.textContent = '0 FCFA';
      return;
    }
    
    // Calculer le montant total
    let montantTotal = 0;
    
    // Ajouter les détails au tableau
    this.detailsVente.forEach((detail: any, index: number) => {
      const produit = detail.produit;
      const prixUnitaire = detail.prix_unitaire_vente;
      const quantite = detail.quantite;
      const total = prixUnitaire * quantite;
      
      montantTotal = this.vente.montant_total;
      
      const row = document.createElement('tr');
      row.className = 'align-middle';
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>
          <div class="d-flex ">
            <div>
              <div class="fw-semibold">${produit.nom}</div>
              <small class="text-muted">${produit.description || ''}</small>
            </div>
          </div>
        </td>
        <td class="">${prixUnitaire.toLocaleString()} FCFA</td>
        <td class="">
          <span class="badge bg-light text-dark">${quantite}</span>
        </td>
        <td class="">${total.toLocaleString()} FCFA</td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Mettre à jour le montant total
    if (totalElement) {
      totalElement.textContent = `${montantTotal.toLocaleString()} FCFA`;
    }
    if (remise) {
      remise.textContent = `${this.vente.remise.toLocaleString()} FCFA`;
    }
    if (totalNet) {
      totalNet.textContent = `${this.vente.montant_total_apres_remise.toLocaleString()} FCFA`;
    }
  }

  /**
   * Afficher les détails d'une vente
   */
  viewDetails(vente: any): void {
    
    this.vente = vente;
    
    // Récupérer les détails de la vente (sera traité de manière asynchrone)
    this.getDetailsVente(vente.id);
    
    // Formater la date de vente
    const dateVente = vente.created_at ? new Date(vente.created_at) : null;

    const dateFormatee = dateVente ? 
      `${dateVente.getDate().toString().padStart(2, '0')}/${(dateVente.getMonth() + 1).toString().padStart(2, '0')}/${dateVente.getFullYear()}` +
                      ` à ${dateVente.getHours().toString().padStart(2, '0')}:` +
                      `${dateVente.getMinutes().toString().padStart(2, '0')}:` +
                      `${dateVente.getSeconds().toString().padStart(2, '0')}`: 
      'Non définie';
    
    // Formater le montant
    const montantFormatte = vente.montant_total ? `${vente.montant_total.toLocaleString()} FCFA` : '0 FCFA';
    
    // Déterminer la classe du badge pour le statut
    let badgeClass = '';
    switch(vente.statut?.toLowerCase()) {
      case 'payer':
        badgeClass = 'bg-success';
        break;
      case 'non_payer':
        badgeClass = 'bg-danger';
        break;
      default:
        badgeClass = 'bg-secondary';
    }
    
    // Ouvrir le modal pour afficher les détails
    const modal = document.getElementById('modal-view-details');
    if (modal) {
      // Remplir les informations générales
      document.getElementById('detail-reference')!.textContent = vente.reference || 'Non définie';
      document.getElementById('detail-libelle')!.textContent = vente.libelle || 'Non défini';
      document.getElementById('detail-date')!.textContent = dateFormatee;
      document.getElementById('detail-montant')!.textContent = montantFormatte;
      document.getElementById('detail-mode-paiement')!.textContent = vente.mode_paiement || 'Non défini';
      
      // Remplir le statut avec badge
      const statutElement = document.getElementById('detail-statut');
      if (statutElement) {
        statutElement.innerHTML = `<span class="badge ${badgeClass}">${vente.statut || 'Non défini'}</span>`;
      }
      
      // Remplir les informations du client (si disponible)
      if (vente.client) {
        document.getElementById('detail-client-nom')!.textContent = vente.client.nom || 'Non défini';
        document.getElementById('detail-client-adresse')!.textContent = vente.client.adresse || 'Non définie';
        document.getElementById('detail-client-contact')!.textContent = vente.client.telephone || 'Non défini';
        document.getElementById('detail-client-email')!.textContent = vente.client.email || 'Non défini';
      } else {
        document.getElementById('detail-client-nom')!.textContent = 'Client non défini';
        document.getElementById('detail-client-adresse')!.textContent = 'Non définie';
        document.getElementById('detail-client-contact')!.textContent = 'Non défini';
        document.getElementById('detail-client-email')!.textContent = 'Non défini';
      }
      
      // Remplir la description
      document.getElementById('detail-description')!.textContent = vente.description || 'Aucune description disponible';
      
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
      if (this.detailsVente && this.detailsVente.length > 0) {
        this.updateProduitsTable();
      }
      
      // Configurer le bouton d'impression
      const btnPrint = document.getElementById('btn-print-detail');
      if (btnPrint) {
        btnPrint.onclick = () => this.printVente(vente);
        //btnPrint.onclick = () => this.printVente(vente);
      }
      
      // Afficher le modal
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  editVente(vente: any): void {
    this.isLoading = true;
    this.ventesService.getDetailVente(vente.id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          // Stocker temporairement les données de la vente dans le localStorage
          // Cela permet de les récupérer après redirection
          localStorage.setItem('editVenteData', JSON.stringify({
            id: vente.id,
            vente: response.data
          }));
          
          // Rediriger vers la page de vente pour modification
          this.router.navigate(['/gestion-des-ventes/vente']);
        } else {
          this.toastr.error('Erreur lors de la récupération des données de la vente');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération des détails de la vente:', error);
        this.toastr.error('Erreur lors de la récupération des données de la vente');
        this.isLoading = false;
      }
    });
  }

  deleteVente(vente: any): void {
    console.log('Supprimer la vente:', vente);
    // Implémenter la suppression
  }

  /**
   * Imprimer une vente
   */
  printVente(vente: any): void {
    this.ventesService.imprimerRecu(vente.id).subscribe({
      next(facture: any) {
        
        const url = facture.path;
              
        window.open(url, '_blank');

        // nettoyage mémoire
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error(err) {
        console.log(err.error);
        
      },
    });
    
    // Création d'une fenêtre d'impression
    //const printWindow = window.open('', '_blank');

    
    
   
  }
}
