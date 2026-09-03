/**
 * Inserisce uno o più blocchi di dati strutturati JSON-LD nella pagina.
 * Funziona ovunque nel DOM (non serve necessariamente l'head): i motori di
 * ricerca leggono <script type="application/ld+json"> indipendentemente
 * dalla posizione, e qui viene renderizzato lato server (SSR) quindi è
 * presente già nell'HTML iniziale ricevuto dai crawler.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        // eslint-disable-next-line react/no-danger
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
