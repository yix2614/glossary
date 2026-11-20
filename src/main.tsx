import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { GridTransitionProvider, InterceptLinks, useRoute } from 'transitery/react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react';
import {
  Aperture, ArrowsOut, Check, Cursor, Heart,
  Lightning, Minus, Plus, Sparkle, SquaresFour, Stack, X,
} from '@phosphor-icons/react';
import { Button } from './arc/button/button';
import { ElasticSlider } from './arc/elastic-slider/elastic-slider';
import { DesignSystem } from './design-system';
import { DotField, GooeyDock } from './studies';
import { WaterRipple } from './water-ripple';
import { Gravity } from './gravity';
import { effectPrompts } from './effect-prompts';
import { applyTheme, getSavedTheme, ThemeToggle } from './theme';
import { buildLensMap, renderLens } from './glass-optics';
import glassBackdrop from './assets/glass-light.png';
import profileAvatar from './assets/yi-xiang-avatar.jpg';
import xLogo from './assets/x-logo-white.svg';
import './tokens.css';
import './style.css';

const titleImages = import.meta.glob('./assets/title-letters-v2/*.png', {
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
    <h1 className="glossary-title" aria-label="Prompt Glossary" data-direct={hoveredAsset !== null}
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
                <img src={titleImages[`./assets/title-letters-v2/${asset}.png`]} alt=""
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
type CardProps = { name: string; note?: CardNote; className: keyof typeof effectPrompts; children: ReactNode; entranceDelay?: number };

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

function Card({ name, note, className, children, entranceDelay = .48 }: CardProps) {
  const reduced = useReducedMotion();
  return (
    <motion.article className={'card ' + className}
      initial={reduced ? false : entranceStart} whileInView={entranceEnd}
      viewport={{ once: true, amount: 'some' }} transition={{ ...entranceTransition, delay: entranceDelay }}>
      <div className="stage">{children}</div>
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
    </motion.article>
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

type Point = { x: number; y: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function Glass() {
  const artwork = useRef<HTMLCanvasElement>(null);
  const refraction = useRef<HTMLCanvasElement>(null);
  const optics = useRef<{ output: ImageData; map: Float32Array; scale: number } | null>(null);
  const scenePixels = useRef<ImageData | null>(null);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0, scale: 1 });
  const [point, setPoint] = useState<Point>({ x: 53, y: 51 });
  const stage = useRef<HTMLDivElement>(null);
  const grab = useRef<Point | null>(null);
  useLayoutEffect(() => {
    const canvas = artwork.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return;
    const image = new Image();
    let width = 0;
    let height = 0;
    function paint() {
      if (!canvas || !context || !width || !height || !image.naturalWidth) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.scale(scale, scale);
      const imageScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const imageWidth = image.naturalWidth * imageScale;
      const imageHeight = image.naturalHeight * imageScale;
      context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) * .62, imageWidth, imageHeight);
      scenePixels.current = context.getImageData(0, 0, canvas.width, canvas.height);
      setSceneSize({ width, height, scale });
    }
    const observer = new ResizeObserver(([entry]) => {
      ({ width, height } = entry.contentRect);
      paint();
    });
    image.onload = paint;
    image.src = glassBackdrop;
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      image.onload = null;
    };
  }, []);

  useLayoutEffect(() => {
    const canvas = refraction.current;
    const source = scenePixels.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !source) return;
    const { width, height, scale } = sceneSize;
    const bounds = canvas.getBoundingClientRect();
    const lensWidth = Math.round(bounds.width * scale);
    const lensHeight = Math.round(bounds.height * scale);
    if (!lensWidth || !lensHeight) return;
    let lens = optics.current;
    if (!lens || lens.output.width !== lensWidth || lens.output.height !== lensHeight || lens.scale !== scale) {
      canvas.width = lensWidth;
      canvas.height = lensHeight;
      lens = {
        output: context.createImageData(lensWidth, lensHeight),
        map: buildLensMap(lensWidth, lensHeight, scale),
        scale,
      };
      optics.current = lens;
    }
    renderLens(source, lens.output, lens.map, width * point.x / 100 * scale, height * point.y / 100 * scale);
    context.putImageData(lens.output, 0, 0);
  }, [point, sceneSize]);

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!grab.current || !stage.current) return;
    const rect = stage.current.getBoundingClientRect();
    setPoint({
      x: clamp((event.clientX - rect.left - grab.current.x) / rect.width * 100, 24, 76),
      y: clamp((event.clientY - rect.top - grab.current.y) / rect.height * 100, 31, 68),
    });
  }
  function nudge(event: KeyboardEvent<HTMLButtonElement>) {
    const offsets: Record<string, Point> = {
      ArrowLeft: { x: -4, y: 0 }, ArrowRight: { x: 4, y: 0 },
      ArrowUp: { x: 0, y: -4 }, ArrowDown: { x: 0, y: 4 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    setPoint(({ x, y }) => ({ x: clamp(x + offset.x, 24, 76), y: clamp(y + offset.y, 31, 68) }));
  }
  return (
    <div className="glass-scene" ref={stage}>
      <canvas className="glass-art" ref={artwork} aria-hidden="true"/>
      <button className="glass-lens" aria-label="Glass lens, use arrow keys to move" style={{ left: point.x + '%', top: point.y + '%' }}
        onPointerDown={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          grab.current = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={move} onLostPointerCapture={() => { grab.current = null; }} onKeyDown={nudge}>
        <canvas className="glass-refraction" ref={refraction} aria-hidden="true"/>
      </button>
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

function Slider() {
  return <div className="slider-demo"><ElasticSlider label="Intensity" showText={false} showValueTooltip defaultValue={28} format={value => value + '%'}/></div>;
}

function Odometer() {
  const [count, setCount] = useState(98);
  return (
    <div className="odometer-demo">
      <div className="digits" role="status" aria-label={String(count)}>
        {String(count).padStart(3, '0').split('').map((digit, index) => (
          <span className="digit" key={index} aria-hidden="true">
            <AnimatePresence initial={false}>
              <motion.span key={digit} initial={{ y: '105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-105%', opacity: 0 }} transition={{ type: 'spring', stiffness: 310, damping: 27 }}>
                {digit}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </div>
      <div className="stepper">
        <Button variant="secondary" size="sm" aria-label="Decrease count" onClick={() => setCount(value => Math.max(0, value - 1))}><Minus size={16}/></Button>
        <Button variant="secondary" size="sm" aria-label="Increase count" onClick={() => setCount(value => (value + 1) % 1000)}><Plus size={16}/></Button>
      </div>
    </div>
  );
}

function Magnetic() {
  const [pressed, setPressed] = useState(false);
  return (
    <div className="magnet-target" onPointerMove={event => {
      if (event.pointerType === 'touch') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--mx', (event.clientX - bounds.left - bounds.width / 2) * .32 + 'px');
      event.currentTarget.style.setProperty('--my', (event.clientY - bounds.top - bounds.height / 2) * .35 + 'px');
    }} onPointerLeave={event => {
      event.currentTarget.style.removeProperty('--mx');
      event.currentTarget.style.removeProperty('--my');
    }}>
      <div className="magnet-translate">
        <Button variant="secondary" aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
          {pressed ? <Check size={16}/> : <Cursor size={16}/>}
          {pressed ? 'Connected' : 'Pull me'}
        </Button>
      </div>
    </div>
  );
}

function Shared() {
  const [expanded, setExpanded] = useState(false);
  return (
    <LayoutGroup>
      <div className="shared-demo" data-expanded={expanded}>
        <motion.button layout type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="shared-object">
          <motion.span layout className="shared-art"><Stack size={29} weight="light"/></motion.span>
          <motion.span layout="position" className="shared-title">Form & space</motion.span>
          <motion.span layout="position" className="shared-icon">{expanded ? <X size={17}/> : <ArrowsOut size={17}/>}</motion.span>
          {expanded && <motion.span className="shared-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>A study in soft edges and shifting scale.</motion.span>}
        </motion.button>
      </div>
    </LayoutGroup>
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
        {isDesignSystem ? <DesignSystem theme={theme}/> : <main>
          <header className="intro gallery-intro">
            <motion.div initial={reduced ? false : entranceStart} animate={entranceEnd} transition={entranceTransition}>
              <GlossaryTitle/>
            </motion.div>
            <motion.p initial={reduced ? false : entranceStart} animate={entranceEnd}
              transition={{ ...entranceTransition, delay: .12 }}>
              Try interactive UI effects, learn their English names, and use those terms to write more precise prompts.
            </motion.p>
          </header>
          <section className="bento" aria-label="UI effect demos">
            <Card name="3D card tilt" note={{ text: "hover", arrow: "loop" }} className="tilt" entranceDelay={.24}><Tilt/></Card>
            <Card name="Gooey effect" note={{ text: "click +", arrow: "sweep" }} className="goo" entranceDelay={.32}><Gooey/></Card>
            <Card name="Water ripple" note={{ text: "click", arrow: "sweep" }} className="water-ripple" entranceDelay={.40}><WaterRipple/></Card>
            <Card name="Liquid Glass" className="glass"><Glass/></Card>
            <Card name="Gravity simulation" className="gravity" entranceDelay={.56}><Gravity/></Card>
            <Card name="Magnetic button" className="magnetic"><Magnetic/></Card>
            <Card name="Rolling digits" className="odometer" entranceDelay={.56}><Odometer/></Card>
            <Card name="Dot grid repulsion" className="dot-field"><DotField/></Card>
            <Card name="Elastic slider" className="elastic" entranceDelay={.56}><Slider/></Card>
            {showGooeyDock && <Card name="Gooey dock" className="gooey-dock"><GooeyDock/></Card>}
            {showSharedLayout && <Card name="Shared layout" className="shared"><Shared/></Card>}
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
      <App/>
    </GridTransitionProvider>
  </StrictMode>,
);
