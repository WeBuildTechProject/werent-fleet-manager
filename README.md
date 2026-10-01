# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Prenotazione collegata al gestionale We Rent (lotto 7b)

`/prenota` può usare tre motori, scelti alla pubblicazione (`src/lib/site-mode.ts`):

- `VITE_BOOKING_ENGINE=werent`: prenotazione nativa collegata al **WE RENT MANAGEMENT SYSTEM**
  (disponibilità, prezzi, protezioni, servizi, pagamento Stripe, pagina «la mia prenotazione»
  su `/prenotazione/<codice>?t=…` dal link nell'email);
- `VITE_PUBLIC_SITE_ONLY=true` senza la variabile sopra: iframe RentHub (fase provvisoria, oggi online);
- nessuna delle due: vecchio flusso Lovable/Supabase (non più usato).

Il sito non calcola prezzi: chiama l'API del gestionale dalle funzioni server (`src/lib/werent-booking.functions.ts`),
con la chiave che resta sul server. Prova sul Mac: vedi `.env.werent.example` (porta del sito 3000, API 8080;
nel gestionale l'impostazione «Indirizzo del sito» va messa a `http://localhost:3000` durante le prove).
