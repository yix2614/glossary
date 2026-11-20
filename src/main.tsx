import { lazy, StrictMode, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { GridTransitionProvider, InterceptLinks, useRoute } from 'transitery/react';
import { domAnimation, LazyMotion, MotionConfig, useInView, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { ApertureIcon as Aperture } from '@phosphor-icons/react/dist/icons/Aperture';
import { CheckIcon as Check } from '@phosphor-icons/react/dist/icons/Check';
import { HeartIcon as Heart } from '@phosphor-icons/react/dist/icons/Heart';
import { LightningIcon as Lightning } from '@phosphor-icons/react/dist/icons/Lightning';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/icons/Plus';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/dist/icons/Sparkle';
import { SquaresFourIcon as SquaresFour } from '@phosphor-icons/react/dist/icons/SquaresFour';
import { effectPrompts } from './effect-prompts';
import { applyTheme, getSavedTheme, ThemeToggle } from './theme';
import profileAvatar from './assets/yi-xiang-avatar.jpg';
import xLogo from './assets/x-logo-white.svg';
import './tokens.css';
import './style.css';

const DesignSystem = lazy(() => import('./design-system').then(module => ({ default: module.DesignSystem })));
const DotField = lazy(() => import('./studies').then(module => ({ default: module.DotField })));
const GooeyDock = lazy(() => import('./studies').then(module => ({ default: module.GooeyDock })));
const WaterRipple = lazy(() => import('./water-ripple').then(module => ({ default: module.WaterRipple })));
const Gravity = lazy(() => import('./gravity').then(module => ({ default: module.Gravity })));
const Glass = lazy(() => import('./liquid-glass'));
const Magnetic = lazy(() => import('./control-demos').then(module => ({ default: module.Magnetic })));
const Odometer = lazy(() => import('./control-demos').then(module => ({ default: module.Odometer })));
const Slider = lazy(() => import('./control-demos').then(module => ({ default: module.Slider })));
const Shared = lazy(() => import('./control-demos').then(module => ({ default: module.Shared })));

const titleImages = import.meta.glob('./assets/title-letters-v2/*.webp', {
  eager: true, import: 'default', query: '?url',
}) as Record<string, string>;

const titleWords = [
  ['capital-p', 'r', 'o', 'm', 'p', 't'],
  ['capital-g', 'l', 'o-2', 's', 's-2', 'a', 'r-2', 'y'],
];

const titleAssets = titleWords.flat();

function GlossaryTitle() {
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [pictured, setPictured] = useState<string | null>('capital-p');
  const lastPictured = useRef('capital-p');
  const reduced = useReducedMotion();

  useEffect(() => {
    if (hoveredAsset || reduced) return;
    let timer: number;
    const chooseNext = () => {
      setPictured(null);
      timer = window.setTimeout(() => {
        const available = titleAssets.filter(asset => asset !== lastPictured.current);
        const next = available[Math.floor(Math.random() * available.length)];
        lastPictured.current = next;
        setPictured(next);
        timer = window.setTimeout(chooseNext, 1350 + Math.random() * 550);
      }, 190);
    };
    timer = window.setTimeout(chooseNext, 1350 + Math.random() * 550);
    return () => window.clearTimeout(timer);
  }, [hoveredAsset, reduced]);

  const activeAsset = hoveredAsset ?? (reduced ? null : pictured);

  return (
    <h1 className="glossary-title" aria-label="Prompt Glossary"
      onPointerLeave={() => setHoveredAsset(null)}>
      {titleWords.map(assets => (
        <span className="glossary-word" key={assets[0]} aria-hidden="true">
          {assets.map(asset => {
            const photo = ['r', 's', 's-2', 't'].includes(asset);
            const tall = asset.startsWith('capital-') || asset === 'l' || asset === 't';
            const descender = asset === 'p' || asset === 'y';
            const letter = asset.startsWith('capital-') ? asset.at(-1)!.toUpperCase() : asset[0];
            return (
              <span className="glossary-glyph" key={asset} data-art={activeAsset === asset}
                onPointerEnter={event => {
                  if (event.pointerType === 'touch') return;
                  setPictured(null);
                  setHoveredAsset(asset);
                }}>
                <span>{letter}</span>
                <img src={titleImages[`./assets/title-letters-v2/${asset}.webp`]} alt=""
                  fetchPriority={asset === 'capital-p' ? 'high' : 'low'}
                  data-photo={photo ? asset : undefined}
                  data-glyph={descender ? 'descender' : tall ? 'tall' : 'short'}/>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

type CardNote = { text: string; arrow: keyof typeof noteArrows };
type CardProps = { name: string; note?: CardNote; className: keyof typeof effectPrompts; children: ReactNode; deferDemo?: boolean; entranceDelay?: number };

const noteArrows = {
  sweep: 'M21 7C8 4 -5 6 -18 12m0 0 5-6m-5 6 8 1',
  loop: 'M21 7C11 15 0 11 3 5C6 -1 14 3 8 9C2 15 -8 8 -18 12m0 0 5-6m-5 6 8 2',
};

function CopyPrompt({ name, prompt }: { name: string; prompt: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
    timer.current = window.setTimeout(() => setStatus(''), 1800);
  }

  return (
    <div className="prompt-copy" data-feedback={Boolean(status)}>
      <button type="button" aria-label={`Copy prompt for ${name}`} onClick={copy}>
        {status === 'Copied' ? <Check size={16} aria-hidden="true"/> : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.75" y="6.25" width="9" height="9" rx="2.5"/>
              <path d="M6.25 6.25V5.25A2.5 2.5 0 0 1 8.75 2.75h4a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-1"/>
            </g>
          </svg>
        )}
      </button>
      <span className="prompt-tooltip" aria-hidden="true">{status || 'Copy prompt'}</span>
      <span className="prompt-copy-status" role="status">{status}</span>
    </div>
  );
}

const entranceStart = { opacity: 0, y: 14 };
const entranceEnd = { opacity: 1, y: 0 };
const entranceTransition = { duration: .48, ease: [.23, 1, .32, 1] as const };

function Card({ name, note, className, children, deferDemo = false, entranceDelay = .48 }: CardProps) {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const nearViewport = useInView(stage, { once: true, margin: '160px' });
  return (
    <m.article className={'card ' + className}
      initial={reduced ? false : entranceStart} whileInView={entranceEnd}
      viewport={{ once: true, amount: 'some' }} transition={{ ...entranceTransition, delay: entranceDelay }}>
      <div className="stage" ref={deferDemo ? stage : undefined}>
        <Suspense fallback={null}>{(!deferDemo || nearViewport) && children}</Suspense>
      </div>
      <header className="card-label"><h2>{name}</h2></header>
      <CopyPrompt name={name} prompt={effectPrompts[className]}/>
      {note && (
        <span className="card-note">
          <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden="true">
            <path d={noteArrows[note.arrow]} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {note.text}
        </span>
      )}
    </m.article>
  );
}

const actions = [
  { name: 'Like', Icon: Heart, x: -63, y: -38 },
  { name: 'Sparkle', Icon: Sparkle, x: 0, y: -68 },
  { name: 'Flash', Icon: Lightning, x: 63, y: -38 },
];

function Gooey() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [visible, setVisible] = useState(false);
  const demo = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!demo.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(demo.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || hovered || keyboardFocus || reduced) return;
    const timer = window.setTimeout(() => setOpen(!open), open ? 1550 : 1150);
    return () => window.clearTimeout(timer);
  }, [visible, hovered, keyboardFocus, reduced, open]);

  const position = (x: number, y: number) => ({ '--x': x + 'px', '--y': y + 'px' }) as CSSProperties;
  return (
    <div ref={demo} className="goo-demo" data-open={open}
      onPointerEnter={event => {
        if (event.pointerType === 'touch') return;
        setHovered(true);
        if (!keyboardFocus) setOpen(false);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={event => setKeyboardFocus(event.target.matches(':focus-visible'))}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false);
      }}>
      <svg className="filter-defs" aria-hidden="true">
        <filter id="goo-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -11" result="mask"/>
          <feFlood className="goo-ink" result="ink"/>
          <feComposite in="ink" in2="mask" operator="in"/>
        </filter>
      </svg>
      <div className="goo-layer" aria-hidden="true">
        {actions.map(({ name, x, y }) => <i key={name} className="goo-satellite" style={position(x, y)}/>)}
        <i className="goo-center"/>
      </div>
      <button type="button" className="goo-trigger goo-center" aria-label="Gooey menu"
        aria-expanded={open} onClick={() => setOpen(value => !value)}><Plus size={22} weight="bold"/></button>
      {actions.map(({ name, Icon, x, y }) => (
        <button type="button" key={name} className="goo-action goo-satellite" style={position(x, y)}
          aria-label={name} aria-pressed={selected === name} disabled={!open}
          onClick={() => setSelected(selected === name ? '' : name)}>
          <Icon size={17} weight={selected === name ? 'fill' : 'bold'}/>
        </button>
      ))}

    </div>
  );
}

function Tilt() {
  const [active, setActive] = useState(false);
  function follow(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty('--rx', -y * 29 + 'deg');
    event.currentTarget.style.setProperty('--ry', x * 34 + 'deg');
    event.currentTarget.style.setProperty('--shine', (x + .5) * 100 + '%');
  }
  return (
    <button className="tilt-target" aria-label="Tilt the depth card" aria-pressed={active}
      onPointerMove={follow} onPointerLeave={event => {
        for (const property of ['--rx', '--ry', '--shine']) event.currentTarget.style.removeProperty(property);
      }} onClick={() => setActive(!active)}>
      <span className="tilt-object">
        <span className="tilt-grid"/>
        <span className="tilt-orbit"><Aperture size={57} weight="thin"/></span>

        <span className="tilt-mark"><Plus size={13}/></span>
      </span>
    </button>
  );
}

const profileUrl = 'https://x.com/yixiang6688';

function FollowToast() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <aside className="follow-toast" aria-label="Follow Yi Xiang" data-shown={shown} inert={!shown}>
      <img className="follow-avatar" src={profileAvatar} width="36" height="36" alt=""/>
      <div className="follow-profile">
        <strong>Yi Xiang</strong>
        <span>@yixiang6688</span>
      </div>
      <a className="follow-action" href={profileUrl} target="_blank" rel="noopener noreferrer"
        aria-label="Follow Yi Xiang on X">
        <img className="follow-logo" src={xLogo} alt=""/>
        <span>Follow</span>
      </a>
    </aside>
  );
}

const showSharedLayout = false;
const showGooeyDock = false;

function App() {
  const route = useRoute();
  const reduced = useReducedMotion();
  const isDesignSystem = route.split(/[?#]/, 1)[0].replace(/\/$/, '') === '/design-system';
  const [theme, setTheme] = useState(getSavedTheme);
  useEffect(() => {
    if (!isDesignSystem) document.title = 'Prompt Glossary';
  }, [isDesignSystem]);
  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <header className="site-header" hidden>
          <a className="brand" href="/"><span className="brand-mark"><SquaresFour size={17} weight="fill"/></span>Prompt Glossary</a>
          <nav aria-label="Main"><a className="nav-link" href="/design-system" aria-current={isDesignSystem ? 'page' : undefined}>Design system</a></nav>
        </header>
        {isDesignSystem ? <Suspense fallback={null}><DesignSystem theme={theme}/></Suspense> : <main>
          <header className="intro gallery-intro">
            <m.div initial={reduced ? false : entranceStart} animate={entranceEnd} transition={entranceTransition}>
              <GlossaryTitle/>
            </m.div>
            <m.p initial={reduced ? false : entranceStart} animate={entranceEnd}
              transition={{ ...entranceTransition, delay: .12 }}>
              Try interactive UI effects, learn their English names, and use those terms to write more precise prompts.
            </m.p>
          </header>
          <section className="bento" aria-label="UI effect demos">
            <Card name="3D card tilt" note={{ text: "hover", arrow: "loop" }} className="tilt" entranceDelay={.24}><Tilt/></Card>
            <Card name="Gooey effect" note={{ text: "click +", arrow: "sweep" }} className="goo" entranceDelay={.32}><Gooey/></Card>
            <Card name="Water ripple" note={{ text: "click", arrow: "sweep" }} className="water-ripple" entranceDelay={.40} deferDemo><WaterRipple/></Card>
            <Card name="Liquid Glass" className="glass" deferDemo><Glass/></Card>
            <Card name="Gravity simulation" className="gravity" deferDemo entranceDelay={.56}><Gravity/></Card>
            <Card name="Magnetic button" className="magnetic" deferDemo><Magnetic/></Card>
            <Card name="Rolling digits" className="odometer" deferDemo entranceDelay={.56}><Odometer/></Card>
            <Card name="Dot grid repulsion" className="dot-field" deferDemo><DotField/></Card>
            <Card name="Elastic slider" className="elastic" deferDemo entranceDelay={.56}><Slider/></Card>
            {showGooeyDock && <Card name="Gooey dock" className="gooey-dock" deferDemo><GooeyDock/></Card>}
            {showSharedLayout && <Card name="Shared layout" className="shared" deferDemo><Shared/></Card>}
          </section>
        </main>}
        <footer>
          <a href={profileUrl} target="_blank" rel="noopener noreferrer">© 2026 Yi Xiang</a>
        </footer>
        {!isDesignSystem && <FollowToast/>}
        <ThemeToggle theme={theme} onChange={setTheme}/>
      </div>
    </MotionConfig>
  );
}

applyTheme(getSavedTheme());
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GridTransitionProvider effect="Flux Ring Ripple">
      <InterceptLinks/>
      <LazyMotion features={domAnimation}><App/></LazyMotion>
      <Analytics/>
    </GridTransitionProvider>
  </StrictMode>,
);
