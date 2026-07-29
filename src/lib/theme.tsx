import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onMount,
  useContext,
} from "solid-js";
import { isServer } from "solid-js/web";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "pctf:theme";

/**
 * Inlined into <head> so the correct theme is on <html> before first paint.
 * Without this, a dark-mode user gets a white flash on every navigation.
 */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

type ThemeContext = {
  theme: Accessor<Theme>;
  resolved: Accessor<"light" | "dark">;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeContext>();

function systemPrefersDark() {
  return !isServer && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider(props: { children: JSX.Element }) {
  const [theme, setThemeSignal] = createSignal<Theme>("system");
  const [resolved, setResolved] = createSignal<"light" | "dark">("light");

  const apply = (next: Theme) => {
    const dark = next === "dark" || (next === "system" && systemPrefersDark());
    document.documentElement.classList.toggle("dark", dark);
    setResolved(dark ? "dark" : "light");
  };

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored ?? "system";
    setThemeSignal(initial);
    apply(initial);

    // Follow the OS while the preference is "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme() === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
  });

  const setTheme = (next: Theme) => {
    setThemeSignal(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  };

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{props.children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
