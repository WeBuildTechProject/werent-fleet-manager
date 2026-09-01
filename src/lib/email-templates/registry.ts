import type { ComponentType } from 'react'

import { template as scadenzaVeicolo } from './scadenza-veicolo'
import { template as fineNoleggioImminente } from './fine-noleggio-imminente'
import { template as documentoInScadenza } from './documento-in-scadenza'
import { template as confermaPrenotazione } from './conferma-prenotazione'
import { template as verbaleConsegna } from './verbale-consegna'
import { template as verbaleRientro } from './verbale-rientro'
import { template as ricevutaPagamento } from './ricevuta-pagamento'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'scadenza-veicolo': scadenzaVeicolo,
  'fine-noleggio-imminente': fineNoleggioImminente,
  'documento-in-scadenza': documentoInScadenza,
  'conferma-prenotazione': confermaPrenotazione,
  'verbale-consegna': verbaleConsegna,
  'verbale-rientro': verbaleRientro,
  'ricevuta-pagamento': ricevutaPagamento,
}
