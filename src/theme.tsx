import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun } from '@phosphor-icons/react';

export type Theme = 'light' | 'dark';
const storageKey = 'prompt-glossary-theme';
const backgrounds = { light: '#fcfcfc', dark: '#141414' };

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', backgrounds[theme]);
}

export function getSavedTheme(): Theme {
  try {
    return window.localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const changing = useRef(false);
  const [pending, setPending] = useState(false);
  const next = theme === 'light' ? 'dark' : 'light';
  const Icon = theme === 'light' ? Moon : Sun;

  async function toggle(button: HTMLButtonElement) {
    if (changing.current) return;
    changing.current = true;
    setPending(true);
    let applied = false;
    function commit() {
      applied = true;
      applyTheme(next);
      flushSync(() => onChange(next));
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // The selected theme still applies for this page if storage is unavailable.
      }
    }

    try {
      if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        commit();
      } else {
        const bounds = button.getBoundingClientRect();
        const x = bounds.left + bounds.width / 2;
        const y = bounds.top + bounds.height / 2;
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const root = document.documentElement;
        root.style.setProperty('--theme-ripple-origin', `${x}px ${y}px`);
        root.style.setProperty('--theme-ripple-end', `${radius + 36}px`);
        root.dataset.themeSweeping = '';
        try {
          const transition = document.startViewTransition(commit);
          await transition.finished;
        } finally {
          delete root.dataset.themeSweeping;
          root.style.removeProperty('--theme-ripple-origin');
          root.style.removeProperty('--theme-ripple-end');
        }
      }
    } catch {
      // Apply the theme below if the browser could not capture the transition.
    } finally {
      if (!applied) commit();
      changing.current = false;
      setPending(false);
    }
  }

  return (
    <button type="button" className="theme-toggle" aria-label={`Switch to ${next} mode`}
      aria-disabled={pending || undefined} onClick={event => { void toggle(event.currentTarget); }}>
      <Icon size={17} weight="regular" aria-hidden="true"/>
    </button>
  );
}
