import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { buildLensMap, renderLens } from './glass-optics';
import glassBackdrop from './assets/glass-light.webp';

type Point = { x: number; y: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function Glass() {
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
