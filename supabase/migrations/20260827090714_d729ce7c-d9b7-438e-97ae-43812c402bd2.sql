-- La numerazione progressiva delle fatture è gestita in
-- src/lib/invoices.functions.ts (lettura+inserimento con retry sul vincolo
-- unico (anno, progressivo)): la funzione seguente non è più in uso.
DROP FUNCTION IF EXISTS public.next_invoice_progressivo(integer);