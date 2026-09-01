# Checklist di pubblicazione — We Rent

## Stato attuale

- [ ] Pubblicare il frontend dal pannello di pubblicazione e confermare l'aggiornamento.
- [ ] Eseguire il collaudo finale su desktop e mobile.
- [ ] Verificare il dominio pubblico scelto e il dominio mittente email prima dell'invio reale.
- [ ] Configurare il dominio personalizzato da Project settings → Domains, se richiesto.
- [ ] Il progetto non ha ancora un URL pubblicato al momento della checklist.

## Variabili d'ambiente

Le variabili devono essere configurate nell'ambiente sicuro di deploy; non inserire valori sensibili nel repository o in questa checklist.

### Backend e autenticazione

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — solo lato server, mai nel browser o nei log
- `LOVABLE_CRON_SECRET`
- `LOVABLE_CRON_SECRET_PREVIOUS` — solo se serve una rotazione senza interruzione

### Email transazionali

- `LOVABLE_API_KEY`
- `LOVABLE_SEND_URL` — opzionale, solo se diverso dall'endpoint predefinito
- Verificare il dominio mittente `notify.werentsrl.com` e l'indirizzo visualizzato `werentsrl.com`.
- Confermare che i template di verbale, prenotazione e scadenza siano presenti e che gli indirizzi interni siano aggiornati.

### Pagamenti

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Configurare il webhook pubblico `/api/public/stripe/webhook` nell'account di pagamento.
- Verificare in ambiente di test caparra, saldo, stato prenotazione e generazione fattura.

### CaRGOS

- `CARGOS_MODE=mock` resta il valore predefinito e non effettua invii al portale.
- `CARGOS_BASE_URL`
- `CARGOS_USERNAME`
- `CARGOS_PASSWORD`
- `CARGOS_APIKEY` — usare esattamente questo nome
- `CARGOS_ORGANIZATION`
- `CARGOS_TRACCIATO_VERIFICATO` — lasciare vuoto finché il tracciato non è stato confrontato riga per riga con il manuale ufficiale.
- `CARGOS_CIFRATURA_VERIFICATA` — lasciare vuoto finché algoritmo, modalità, IV ed encoding non sono stati verificati sul manuale ufficiale.
- Non impostare `CARGOS_MODE=live` e non valorizzare i flag di verifica senza approvazione operativa e validazione del portale.
- Confermare che le prenotazioni con `is_demo=true` siano escluse dagli invii.

## Sicurezza e dati

- [ ] Confermare che tutte le tabelle pubbliche abbiano RLS attiva, policy coerenti e `GRANT` espliciti.
- [ ] Verificare che ruoli e capability siano letti da `user_roles`, mai da storage del browser o credenziali hardcoded.
- [ ] Verificare che i bucket `documenti-clienti` e `verbali` siano privati.
- [ ] Verificare che documenti cliente e verbali siano accessibili solo tramite URL firmate a scadenza breve.
- [ ] Verificare che l'accesso ai documenti sia limitato ai ruoli con necessità operativa.
- [ ] Verificare che le quattro accettazioni legali siano bloccate fino allo scroll completo e salvate con timestamp/versione.
- [ ] Verificare che checkout e check-in richiedano km, carburante, dotazioni, danni, conferma dati e firma digitale senza valori precompilati.
- [ ] Eseguire una scansione di sicurezza aggiornata prima della pubblicazione.
- [ ] Verificare che nessun segreto, token, password, chiave privata o URL firmato sia presente nel codice, negli asset o nei log.

## Flussi funzionali

- [ ] Ricerca disponibilità con sede, restituzione, date, orari e categoria.
- [ ] Preventivo con tariffe, extra, assicurazione, coupon e totale coerenti.
- [ ] Creazione prenotazione, pagamento e webhook.
- [ ] Upload obbligatorio dei quattro documenti cliente.
- [ ] Consegna e rientro al banco con aggiornamento veicolo e penali.
- [ ] Generazione verbali PDF, upload privato, download in area cliente e gestionale.
- [ ] Dashboard “Verbali e comunicazioni” con stato email e retry manuale degli invii falliti/in coda.
- [ ] Fattura PDF, numerazione progressiva ed export contabile.
- [ ] Notifiche programmate e cron con token valido.
- [ ] Portale cliente, magic link, consensi GDPR e storico noleggi.
- [ ] Login gestionale e matrice ruoli.

## Domini e operatività

- [ ] Scegliere l'URL pubblico definitivo e verificare HTTPS, redirect e DNS.
- [ ] Configurare il dominio email e completare i controlli SPF/DKIM/DMARC richiesti dal provider.
- [ ] Configurare il webhook di pagamento sull'URL pubblico definitivo.
- [ ] Configurare il cron notifiche sull'URL pubblico stabile `/api/public/cron/notifications` con autenticazione tramite `LOVABLE_CRON_SECRET`.
- [ ] Configurare il cron CaRGOS sull'URL pubblico stabile `/api/public/cron/cargos`, lasciando il canale mock finché non autorizzato.
- [ ] Dopo il primo deploy, eseguire un test di smoke dall'URL pubblico senza usare dati reali.
