import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "it" | "en";

const STORAGE_KEY = "werent.lang";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** t(testoIT, testoEN) — traduzione inline, senza librerie i18n pesanti. */
  t: (it: string, en: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default IT lato SSR: evita mismatch di idratazione. La lingua salvata
  // viene applicata in un effect dopo l'hydration.
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "it") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage non disponibile: la lingua resta solo in memoria */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (it: string, en: string) => (lang === "en" ? en : it),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n deve essere usato dentro <I18nProvider>");
  return ctx;
}
