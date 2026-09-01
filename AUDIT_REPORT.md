# Audit finale — Lotto 26

**Data:** 1 settembre 2026  
**Ambito:** sicurezza database, dati demo, area clienti, gestionale e flussi operativi.

## Esito

Audit finale completato. Sono stati corretti i controlli client-side che chiamavano funzioni di ruolo non più eseguibili direttamente, mantenendo il controllo server-side tramite `user_roles`. Sono stati popolati dati demo coerenti e verificati i percorsi principali nel browser. Non è stata eseguita la pubblicazione del progetto.

## 0. Correzioni residue

### Funzioni di ruolo e policy RLS
- Verificata l'esistenza delle funzioni `private.has_role`, `private.is_admin`, `private.is_staff` e `private.can_operate`.
- Verificato l'uso delle funzioni nelle policy: nessun riferimento `private.private.*` e nessuna policy pubblica contiene chiamate non qualificate a `has_role`, `is_admin`, `is_staff` o `can_operate`.
- Le funzioni omonime nello schema `public` restano non eseguibili da `anon` e `authenticated`; le policy usano le funzioni nello schema `private`.
- Riscontrato e corretto un problema distinto ma concreto: le policy cliente di `invoices`, `reservations` e `documenti_prenotazione` richiamavano `public.current_customer_id()`, anch'essa non eseguibile dagli utenti autenticati. Una nuova migrazione ha creato `private.current_customer_id()` e ha riscritto le tre policy con il riferimento interno.
- I controlli amministrativi di `cargos.functions.ts`, `revenue.functions.ts` e `notifications.functions.ts` ora leggono i ruoli autorizzati da `user_roles`, senza chiamare l'RPC pubblico revocato.

### Linter / advisor
Il linter del database è stato eseguito dopo le correzioni. Output effettivo: **`No linter issues found`**. Il controllo ha analizzato i problemi di sicurezza/configurazione rilevabili dal database, comprese policy RLS, privilegi e configurazioni delle relazioni pubbliche; non ha restituito finding.

## 1. Bucket privati

Verificati direttamente nel progetto collegato tramite `storage.buckets`:

| Bucket | Esistenza | Pubblico |
|---|---:|---:|
| `documenti-clienti` | sì | no (`public = false`) |
| `verbali` | sì | no (`public = false`) |
| `ricevute` | sì | no (`public = false`) |

Il bucket `ricevute` è stato utilizzato per il caricamento della ricevuta demo; il codice continua a usare URL firmate temporanee, non URL pubbliche permanenti.

## 2. Dati demo inseriti

- **Operatore:** `Operatore Demo — Cagliari Elmas`, account `operatore.demo@werentsrl.com`, ruolo `front_desk`, `assigned_branch_id` impostato su Cagliari Elmas, account attivo.
- **Cliente:** `Cliente Demo We Rent`, account `cliente.test@werentsrl.com`, claim `portal = customer`, collegato all'anagrafica cliente demo.
- **Prenotazioni:** dati coerenti tra cliente, veicoli e sedi; sono presenti stati confermata, in corso e chiusa nel dataset esistente.
- **Consegna/rientro:** due prenotazioni chiuse del cliente demo sono state completate con km, carburante, dotazioni, conferma dati, firma digitale, consensi e verbali PDF di consegna/rientro.
- **Pagamenti:** inserito un pagamento `succeeded` demo per `WR-S00079`, con ricevuta PDF caricata e `receipt_path` collegato.
- **Documenti cliente:** sulla prenotazione confermata `WR-S00080` sono presenti tutti e quattro i documenti demo: identità, tessera sanitaria, patente e carta pagamento.
- **Consensi:** `WR-S00080` contiene i quattro timestamp contrattuali e le versioni dei documenti; i verbali delle prenotazioni chiuse riportano conferma e firma.
- **CaRGOS:** inserite trasmissioni demo in attesa, inviata ed errore, con ambiente mock e riferimento a prenotazioni demo. Non sono stati modificati `CARGOS_MODE`, `TRACCIATO_VERIFICATO` o `CARGOS_CIFRATURA_VERIFICATA`.
- **BI / fedeltà / revenue:** il dataset esistente contiene livelli fedeltà, danni, prenotazioni e ricavi sufficienti; Analytics mostra ricavi, utilizzo per categoria/sede e grafici non vuoti.

## 3. Verifica end-to-end nel browser

### Dashboard utenti e sede
- Il gestionale è stato aperto con l'account `operatore.demo@werentsrl.com`.
- La pagina prenotazioni ha restituito le prenotazioni della sede Cagliari Elmas; il confronto sui codici verificati ha confermato che le righe mostrate appartengono a quella sede.
- La pagina flotta ha mostrato veicoli di Cagliari Elmas e nessun veicolo di Olbia o Milano.
- L'account admin/super_admin di test è stato usato per le sezioni amministrative e resta non ristretto: può leggere il dataset gestionale completo, indipendentemente da `assigned_branch_id`.
- La pagina utenti mostra l'operatore demo, la sede assegnata e lo stato Attivo. I filtri sede/stato sono presenti.

### Verbali e comunicazioni
- `/gestionale/verbali` ha mostrato **4 comunicazioni** demo con stato Inviata, comprendenti consegna e rientro.
- I verbali risultano scaricabili dal percorso privato tramite URL firmata.
- La UI mantiene il retry manuale per i casi di errore e il controllo dell'esito della generazione.

### Ricevute e area clienti
- `/gestionale/fatture` ha caricato correttamente fatture e ricevute senza errori HTTP dopo la correzione di `current_customer_id`.
- L'area clienti è stata aperta con una sessione generata direttamente per il cliente demo.
- Lo storico mostra quattro prenotazioni, incluse due chiuse; per `WR-S00079` sono visibili verbale consegna, verbale rientro e ricevuta.
- Non sono comparsi errori console o richieste HTTP fallite durante la verifica dell'area clienti.

### CaRGOS e Analytics
- `/gestionale/cargos` mostra l'adapter **mock (nessun invio reale)** e le righe demo con stati Inviato, In attesa ed Errore.
- `/gestionale/analytics` mostra ricavi, utilizzo per categoria e sede, con tabelle non vuote.
- Il filtro server-side esclude le prenotazioni `is_demo = true` dall'invio reale CaRGOS.

## 4. Flusso banco

La verifica del codice e dei dati demo conferma i vincoli già attivi:

- km e carburante sono obbligatori e validati anche lato server;
- dotazioni e checklist danni fanno parte del payload operativo;
- la conferma esplicita dei dati è separata dalla firma e viene registrata con timestamp;
- firma digitale e checkbox di conferma sono richieste prima del salvataggio;
- il rientro controlla la coerenza del chilometraggio e calcola gli addebiti;
- dopo il salvataggio viene prodotto il PDF, caricato nel bucket privato e collegato alla prenotazione;
- l'invio email usa un link firmato e gestisce il fallimento con avviso/retry, senza allegare il PDF.

## 5. Sicurezza e qualità

- Ricerca nel codice sorgente: nessuna chiave privata o segreto hardcoded; le chiavi restano in variabili d'ambiente e non vengono stampate dall'applicazione.
- Bucket sensibili verificati privati ed esistenti.
- Le policy RLS usano funzioni interne qualificate e non presentano doppi prefissi.
- La dashboard utenti richiede autenticazione e capability `manage_roles`; il controllo non dipende da localStorage o sessionStorage.
- La visibilità operativa risolve ruolo, stato account e sede lato server.
- La pagina CaRGOS mantiene modalità mock e isolamento demo.
- Verifica browser finale sulle pagine CaRGOS, Verbali, Fatture, Area clienti, Analytics e Flotta: nessun errore console o risposta HTTP fallita nei percorsi controllati.

## 6. Limiti

- Le email demo non sono state inviate a una casella reale: le comunicazioni sono state registrate come demo `inviata` per rendere esplorabile la dashboard senza contatto esterno.
- Il flusso PDF, storage e URL firmate è stato verificato con i documenti generati e collegati; l'effettiva consegna SMTP dipende dalla configurazione del provider in ambiente di pubblicazione.
- Non sono stati eseguiti invii CaRGOS reali e i flag di verifica non sono stati modificati.
- La pubblicazione resta fuori dal Lotto 26.
