import type { Theme } from './theme';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const groups = [
  { id: 'color', title: 'Color', tokens: [
    ['background', 'Page'], ['surface-muted', 'Bento card'], ['surface', 'Inner surface'],
    ['border', 'Hairline'], ['foreground', 'Primary text'], ['text-secondary', 'Secondary text'],
    ['text-muted', 'Muted text'], ['detail-muted', 'Decorative detail'],
  ] },
  { id: 'typography', title: 'Typography', tokens: [
    ['text-display', 'Design system title'], ['text-heading', 'Gallery and section titles'], ['text-base', 'Body'],
    ['text-sm', 'Controls'], ['text-xs', 'Intro, card titles and token labels'],
  ] },
  { id: 'spacing', title: 'Spacing & gap', tokens: [
    ['space-1', '4 px base unit'], ['gap-inline', 'Inline controls'], ['gap-bento', 'Bento gutters'],
    ['space-4', 'Compact inset'], ['inset-card', 'Card inset'], ['space-6', 'Panel inset'],
    ['space-8', 'Group spacing'], ['gap-section', 'Between sections'], ['page-gutter', 'Page gutter'],
    ['measure-gallery', 'Content width'],
  ] },
  { id: 'shape', title: 'Shape', tokens: [
    ['radius-control', 'Control'], ['radius-card', 'Card'], ['radius-pill', 'Pill'],
    ['border-width', 'Hairline width'],
  ] },
  { id: 'motion', title: 'Motion', tokens: [
    ['duration-instant', 'Press'], ['duration-fast', 'Hover'], ['duration-standard', 'Transition'],
    ['ease-standard', 'Standard easing'],
  ] },
] as const;

export function DesignSystem({ theme }: { theme: Theme }) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    document.title = 'Design system — Prompt Glossary';
    const styles = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(groups.flatMap(({ tokens }) =>
      tokens.map(([name]) => [name, styles.getPropertyValue('--' + name).trim()]),
    )));
  }, [theme]);

  return (
    <main>
      <div className="intro">
        <h1>Design system</h1>
      </div>
      <nav className="token-nav" aria-label="Token groups">
        {groups.map(({ id, title }) => <a key={id} href={'#' + id} data-grid-skip>{title}</a>)}
      </nav>
      {groups.map(({ id, title, tokens }) => (
        <section key={id} id={id} className="token-section" aria-labelledby={id + '-title'}>
          <h2 id={id + '-title'}>{title}</h2>
          {id === 'typography' && <p className="token-note">Geist · 400 regular / 500 medium / 600 semibold</p>}
          <dl className={'token-list token-' + id}>
            {tokens.map(([name, label]) => {
              const preview = { '--preview': 'var(--' + name + ')' } as CSSProperties;
              return (
                <div className="token-entry" key={name}>
                  {id === 'color' && <div className="token-swatch" style={preview} aria-hidden="true"/>}
                  {id === 'typography' && <div className="token-type" style={preview} aria-hidden="true">Ag</div>}
                  <dt>{label}<code>--{name}</code></dt>
                  <dd>{id === 'spacing' && <span className="token-space" style={preview} aria-hidden="true"/>}<code>{values[name]}</code></dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </main>
  );
}
