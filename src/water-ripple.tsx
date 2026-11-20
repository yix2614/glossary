import { useEffect, useRef } from 'react';
import waterBackdrop from './assets/water-diagonal-hd.webp';

const cell = 4;
const timestep = 1000 / 60;
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

function createSurface(width: number, height: number, image: HTMLImageElement) {
  const backdrop = document.createElement('canvas');
  backdrop.width = width;
  backdrop.height = height;
  const paint = backdrop.getContext('2d', { willReadFrequently: true })!;
  const scale = Math.max(width / image.naturalHeight, height / image.naturalWidth);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  paint.translate(width / 2, height / 2);
  paint.rotate(Math.PI / 2);
  paint.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
  const source = paint.getImageData(0, 0, width, height);
  const output = paint.createImageData(width, height);
  const columns = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  let current = new Float32Array(columns * rows);
  let previous = new Float32Array(current.length);
  const gx = new Float32Array(current.length);
  const gy = new Float32Array(current.length);
  let peak = 0;

  return {
    source,
    disturb(x: number, y: number, radius: number, force: number) {
      const cx = 1 + x / cell;
      const cy = 1 + y / cell;
      for (let j = Math.max(1, Math.floor(cy - radius)); j <= Math.min(rows - 2, Math.ceil(cy + radius)); j++) {
        for (let i = Math.max(1, Math.floor(cx - radius)); i <= Math.min(columns - 2, Math.ceil(cx + radius)); i++) {
          const distance = Math.hypot(i - cx, j - cy) / radius;
          if (distance < 1) {
            const index = j * columns + i;
            current[index] += force * (.5 + .5 * Math.cos(distance * Math.PI));
            peak = Math.max(peak, Math.abs(current[index]));
          }
        }
      }
    },
    step() {
      peak = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < columns - 1; x++) {
          const i = y * columns + x;
          const value = ((current[i - 1] + current[i + 1] + current[i - columns] + current[i + columns]) * .5 - previous[i]) * .985;
          peak = Math.max(peak, Math.abs(value), Math.abs(current[i]));
          previous[i] = value;
        }
      }
      [current, previous] = [previous, current];
      return peak >= .004;
    },
    render(context: CanvasRenderingContext2D) {
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < columns - 1; x++) {
          const i = y * columns + x;
          gx[i] = current[i + 1] - current[i - 1];
          gy[i] = current[i + columns] - current[i - columns];
        }
      }
      const src = source.data;
      const dst = output.data;
      for (let y = 0; y < height; y++) {
        const row = (1 + (y >> 2)) * columns;
        const ty = (y & 3) / cell;
        for (let x = 0; x < width; x++) {
          const i = row + 1 + (x >> 2);
          const tx = (x & 3) / cell;
          const a = (1 - tx) * (1 - ty);
          const b = tx * (1 - ty);
          const c = (1 - tx) * ty;
          const d = tx * ty;
          const dx = gx[i] * a + gx[i + 1] * b + gx[i + columns] * c + gx[i + columns + 1] * d;
          const dy = gy[i] * a + gy[i + 1] * b + gy[i + columns] * c + gy[i + columns + 1] * d;
          const sx = clamp(Math.round(x + dx * 5), width - 1);
          const sy = clamp(Math.round(y + dy * 5), height - 1);
          const from = (sy * width + sx) * 4;
          const to = (y * width + x) * 4;
          const light = (dx + dy) * 45;
          dst[to] = src[from] + light;
          dst[to + 1] = src[from + 1] + light;
          dst[to + 2] = src[from + 2] + light;
          dst[to + 3] = src[from + 3];
        }
      }
      context.putImageData(output, 0, 0);
    },
  };
}

export function WaterRipple() {
  const target = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const button = target.current;
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!button || !element || !context) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    let surface: ReturnType<typeof createSurface> | undefined;
    let frame = 0;
    let rain = 0;
    let last = 0;
    let elapsed = 0;
    let visible = false;
    let active = false;
    let previous: { x: number; y: number } | undefined;

    function schedule() {
      if (visible && active && !frame) frame = requestAnimationFrame(tick);
    }

    function tick(time: number) {
      frame = 0;
      elapsed += last ? Math.min(time - last, 50) : timestep;
      last = time;
      let stepped = false;
      while (active && elapsed >= timestep) {
        active = surface?.step() ?? false;
        elapsed -= timestep;
        stepped = true;
      }
      if (stepped && surface) {
        if (active) surface.render(context!);
        else context!.putImageData(surface.source, 0, 0);
      }
      schedule();
    }

    function disturb(x: number, y: number, radius: number, force: number) {
      if (!surface) return;
      surface.disturb(x, y, radius, force);
      if (!active) {
        last = 0;
        elapsed = 0;
      }
      active = true;
      schedule();
    }

    function dropRain() {
      disturb(element!.width * (.2 + Math.random() * .6), element!.height * (.2 + Math.random() * .6), 4, .85);
    }

    function scheduleRain(immediate = false) {
      clearTimeout(rain);
      if (!visible || motion.matches || !surface) return;
      if (immediate) dropRain();
      rain = window.setTimeout(() => {
        dropRain();
        scheduleRain();
      }, 1050 + Math.random() * 650);
    }

    function resizeSurface() {
      const width = Math.round(element!.clientWidth);
      const height = Math.round(element!.clientHeight);
      if (!width || !height || !image.naturalWidth) return;
      if (surface && width === element!.width && height === element!.height) return;
      element!.width = width;
      element!.height = height;
      surface = createSurface(width, height, image);
      active = false;
      previous = undefined;
      context!.putImageData(surface.source, 0, 0);
      element!.dataset.ready = "";
      scheduleRain(true);
    }
    let disposed = false;
    image.src = waterBackdrop;
    void image.decode().then(() => {
      if (!disposed) resizeSurface();
    }, () => {});
    const resize = new ResizeObserver(resizeSurface);
    resize.observe(element);

    const intersection = new IntersectionObserver(([entry]) => {
      const nextVisible = entry.isIntersecting && entry.intersectionRatio >= .25;
      if (nextVisible === visible) return;
      visible = nextVisible;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = undefined;
      }
      last = 0;
      elapsed = 0;
      schedule();
      scheduleRain(visible);
    }, { threshold: .25 });
    intersection.observe(button);

    function motionChanged() { scheduleRain(true); }

    function location(event: PointerEvent) {
      const bounds = element!.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }
    function press(event: PointerEvent) {
      if (event.button !== 0) return;
      previous = location(event);
      disturb(previous.x, previous.y, 4, .9);
      scheduleRain();
    }
    function move(event: PointerEvent) {
      const next = location(event);
      if (!previous) {
        previous = next;
        return;
      }
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 7) return;
      const samples = Math.ceil(distance / 9);
      for (let i = 1; i <= samples; i++) {
        disturb(previous.x + dx * i / samples, previous.y + dy * i / samples, 1.8, .18);
      }
      previous = next;
      scheduleRain();
    }
    function leave() { previous = undefined; }
    function activate(event: MouseEvent) {
      if (event.detail !== 0) return;
      disturb(element!.width / 2, element!.height / 2, 4, .9);
      scheduleRain();
    }

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerleave', leave);
    button.addEventListener('pointercancel', leave);
    button.addEventListener('click', activate);
    motion.addEventListener('change', motionChanged);
    return () => {
      disposed = true;
      delete element.dataset.ready;
      resize.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(rain);
      button.removeEventListener('pointerdown', press);
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerleave', leave);
      button.removeEventListener('pointercancel', leave);
      button.removeEventListener('click', activate);
      motion.removeEventListener('change', motionChanged);
    };
  }, []);

  return (
    <button ref={target} className="ripple-play" aria-label="Create a water ripple" type="button">
      <img className="ripple-backdrop" src={waterBackdrop} alt=""/>
      <canvas ref={canvas} aria-hidden="true"/>
    </button>
  );
}
