import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-historique-achats',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './historique-achats.component.html',
  styleUrl: './historique-achats.component.scss',
  providers: [ToastrService]
})
export default class HistoriqueAchatsComponent implements OnInit, OnDestroy {
  achats: any[] = [];
  currentUser: any;
  idBoutique: number = -1;
  boutiques: any[] = [];
  isLoading: boolean = false;

  constructor(
    private achatsService: AchatsService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBoutiques();
    this.loadAchats();
    
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
    if (this.currentUser.profil.description.toLowerCase() === 'administrateur' || this.currentUser.profil.description.toLowerCase() === 'responsable structure') {
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
    } else {
      this.boutiques[0] = this.currentUser.boutique;
    }
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.idBoutique = parseInt(selectElement.value);
    this.loadAchats();
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
      this.idBoutique = this.currentUser.boutique.id;
    }
    
    const body: any = {
      boutique: this.idBoutique
    }

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

  /**
   * Afficher les détails d'un achat
   */
  viewDetails(achat: any): void {
    console.log('Voir les détails de l\'achat:', achat);
    
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
    console.log('Modifier l\'achat:', achat);
  }

  deleteAchat(achat: any): void {
    console.log('Supprimer l\'achat:', achat);
  }

  /**
   * Imprimer un achat
   */
  printAchat(achat: any): void {
    console.log('Imprimer l\'achat:', achat);
    
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
    
    // Création du contenu HTML pour l'impression
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Achat ${achat.reference || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info-container { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-section { width: 48%; }
          .info-title { font-weight: bold; background-color: #f0f0f0; padding: 5px; }
          .info-item { margin: 10px 0; }
          .info-label { font-weight: bold; display: inline-block; width: 150px; }
          .description-section { margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; }
          @media print {
            body { margin: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>DÉTAILS DE L'ACHAT</h2>
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
        
        <div class="footer">
          <p>Document généré le ${new Date().toLocaleString()}</p>
          <button onclick="window.print();">Imprimer</button>
        </div>
      </body>
      </html>
    `;
    
    // Écriture du contenu dans la fenêtre d'impression
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Laisser le temps au navigateur de charger le contenu
    setTimeout(() => {
      printWindow.focus();
      // printWindow.print(); // Décommentez pour imprimer automatiquement
    }, 500);
  }
}
