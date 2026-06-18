import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeClass = "" | "theme-dark";

interface ThemeCtx {
  theme: ThemeClass;
  toggle: () => void;
  icon: string;
  label: string;
}

const ThemeContext = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "melodia-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeClass>(() =>
    localStorage.getItem(STORAGE_KEY) === "theme-dark" ? "theme-dark" : "",
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t ? "" : "theme-dark")),
      icon: theme ? "☀" : "☾",
      label: theme ? "светлая" : "тёмная",
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
