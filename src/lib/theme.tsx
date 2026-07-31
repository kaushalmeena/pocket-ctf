import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { storage } from "./storage";

export type Theme = "light" | "dark";

const STORAGE_KEY = "pctf:theme";

/**
 * Inlined into <head> so the correct theme is on <html> before first paint.
 * Without this, a dark-mode user gets a white flash on every navigation.
 *
 * Absence of a stored value means "follow the OS", which is the state a first
 * visit is in. Once the toggle is used the choice is explicit and sticks.
 */
export const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

type ThemeContext = {
  /** The theme currently on screen. */
  theme: Accessor<Theme>;
  /** True while no explicit choice has been made and the OS is in charge. */
  followsSystem: Accessor<boolean>;
  toggle: () => void;
};

const Ctx = createContext<ThemeContext>();

export function ThemeProvider(props: { children: JSX.Element }) {
  const [theme, setTheme] = createSignal<Theme>("light");
  const [followsSystem, setFollowsSystem] = createSignal(true);

  const apply = (next: Theme) => {
    const root = document.documentElement;
    // Colour transitions are opt-in for one beat, so the switch fades instead
    // of snapping -- but nothing else on the page pays for it permanently.
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
  };

  onMount(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    /*
     * Sync the signal to what the bootstrap script already painted.
     *
     * This has to be a real state change rather than a smarter initial value:
     * hydration only writes an attribute when it sees the value differ from the
     * server's, so initialising to "dark" here would leave the SSR'd
     * aria-checked="false" in place forever. The switch's *appearance* does not
     * depend on this -- it is CSS, driven by the class on <html> -- so the
     * correction is invisible.
     *
     * Deliberately not via apply(): that adds .theme-transition, which would
     * make an ordinary page load cross-fade its colours as though someone had
     * hit the switch.
     */
    const stored = storage.get(STORAGE_KEY) as Theme | null;
    setFollowsSystem(stored === null);
    setTheme(stored ?? (mq.matches ? "dark" : "light"));

    // Track the OS only until the visitor states a preference.
    const onChange = () => {
      if (followsSystem()) apply(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  });

  const toggle = () => {
    const next: Theme = theme() === "dark" ? "light" : "dark";
    storage.set(STORAGE_KEY, next);
    setFollowsSystem(false);
    apply(next);
  };

  return <Ctx.Provider value={{ theme, followsSystem, toggle }}>{props.children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
