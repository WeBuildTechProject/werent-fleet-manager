/**
 * Interruttore provvisorio: quando true, l'intero gestionale (staff) e
 * l'area clienti restano fuori uso e ogni tentativo di raggiungerli
 * reindirizza alla home pubblica. Pensato per la fase in cui il sito
 * pubblico viene pubblicato su www.werentsrl.com prima che il progetto
 * gestionale sia definitivamente approvato.
 *
 * Per riattivare il gestionale: impostare VITE_PUBLIC_SITE_ONLY=false
 * (o rimuovere la variabile) e ripubblicare. Nessun'altra modifica è
 * necessaria: tutte le route e i dati restano intatti.
 */
export const PUBLIC_SITE_ONLY = import.meta.env["VITE_PUBLIC_SITE_ONLY"] === "true";
