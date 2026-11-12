// Unités de mesure proposées pour un produit (formulaire produit + aperçu d'import).
// Doit rester aligné avec UNITES_MESURE côté API (src/config/produit/import-produit.helper.ts),
// qui n'accepte à l'import que ces valeurs pour un choix fait dans l'aperçu.
export interface UniteMesureOption {
  value: string;
  label: string;
}

export const UNITES_MESURE: readonly UniteMesureOption[] = [
  { value: 'pièce', label: 'Pièce' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'g', label: 'Gramme (g)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'cl', label: 'Centilitre (cl)' },
  { value: 'carton', label: 'Carton' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'boite', label: 'Boîte' },
  { value: 'paire', label: 'Paire' },
  { value: 'm', label: 'Mètre (m)' },
];

export const UNITE_MESURE_DEFAUT = 'pièce';

/** En-têtes de fichier reconnus pour l'unité (identiques à ceux lus par l'API). */
export const COLONNES_UNITE_MESURE = ['unite_mesure', 'Unité'];

/**
 * Unité présélectionnée pour une ligne importée, à partir de la valeur du fichier :
 * - unité connue (insensible à la casse) → sa valeur canonique ;
 * - valeur vide → « pièce » ;
 * - valeur inconnue → conservée telle quelle (l'API l'enregistre comme avant).
 */
export function uniteMesureDepuisFichier(valeurFichier: unknown): string {
  const brut = valeurFichier === null || valeurFichier === undefined ? '' : String(valeurFichier).trim();
  if (!brut) return UNITE_MESURE_DEFAUT;
  const connue = UNITES_MESURE.find(u => u.value.toLowerCase() === brut.toLowerCase());
  return connue ? connue.value : brut;
}

export function estUniteMesureConnue(valeur: string | null | undefined): boolean {
  return !!valeur && UNITES_MESURE.some(u => u.value === valeur);
}
