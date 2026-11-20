import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';

type Point = { x: number; y: number };
const center = { x: 160, y: 88 };

function svgPoint(event: PointerEvent<SVGSVGElement>): Point {
  const matrix = event.currentTarget.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    : center;
}

export function DotField() {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useRef({ width: 0, height: 0 });
  const pointer = useRef<Point | null>(null);
  const scheduleDraw = useRef<() => void>(() => {});

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    let frame = 0;
    let dots: Point[] = [];
    let ink = getComputedStyle(element).color;

    function draw() {
      frame = 0;
      if (!context) return;
      context.clearRect(0, 0, size.current.width, size.current.height);
      context.fillStyle = ink;
      const active = pointer.current;
      for (const { x, y } of dots) {
        const dx = active ? x - active.x : 0;
        const dy = active ? y - active.y : 0;
        const distance = Math.hypot(dx, dy);
        const strength = active ? Math.max(0, 1 - distance / 84) : 0;
        const shift = reduced ? 0 : 32 * strength ** 2 / Math.max(distance, 1);
        context.globalAlpha = .24 + .76 * strength;
        context.beginPath();
        context.arc(x + dx * shift, y + dy * shift, 2 + 1.3 * strength, 0, 2 * Math.PI);
        context.fill();
      }
    }

    scheduleDraw.current = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * scale);
      element.height = Math.round(height * scale);
      size.current = { width, height };
      context.setTransform(element.width / width, 0, 0, element.height / height, 0, 0);
      const spacing = 18;
      const columns = Math.max(1, Math.floor(width / spacing));
      const rows = Math.max(1, Math.floor(height / spacing));
      const startX = (width - (columns - 1) * spacing) / 2;
      const startY = (height - (rows - 1) * spacing) / 2;
      dots = Array.from({ length: columns * rows }, (_, index) => ({
        x: startX + index % columns * spacing,
        y: startY + Math.floor(index / columns) * spacing,
      }));
      scheduleDraw.current();
    });
    observer.observe(element);
    const themeObserver = new MutationObserver(() => {
      ink = getComputedStyle(element).color;
      scheduleDraw.current();
    });
    themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      cancelAnimationFrame(frame);
      scheduleDraw.current = () => {};
    };
  }, [reduced]);

  function updatePointer(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    scheduleDraw.current();
  }
  function clearPointer() {
    pointer.current = null;
    scheduleDraw.current();
  }

  return (
    <canvas ref={canvas} className="dot-play" tabIndex={0}
      aria-label="Dot field. Move your pointer or use the arrow keys to push the dots."
      onPointerEnter={updatePointer}
      onPointerMove={updatePointer}
      onPointerLeave={clearPointer}
      onPointerCancel={clearPointer}
      onBlur={clearPointer}
      onKeyDown={event => {
        const offsets: Record<string, Point> = {
          ArrowLeft: { x: -22, y: 0 }, ArrowRight: { x: 22, y: 0 },
          ArrowUp: { x: 0, y: -18 }, ArrowDown: { x: 0, y: 18 },
        };
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        const { width, height } = size.current;
        const previous = pointer.current ?? { x: width / 2, y: height / 2 };
        pointer.current = {
          x: Math.max(10, Math.min(width - 10, previous.x + offset.x)),
          y: Math.max(10, Math.min(height - 10, previous.y + offset.y)),
        };
        scheduleDraw.current();
      }}
    />
  );
}

type DockEdge = 'top' | 'right' | 'bottom' | 'left';
const halfWidth = 16;
const halfHeight = 36;
const snapGap = 20;

function edgeDepth(edge: DockEdge) {
  return edge === 'top' || edge === 'bottom' ? halfHeight : halfWidth;
}

function nearestEdge({ x, y }: Point, { width, height }: { width: number; height: number }) {
  const edges = [
    { edge: 'top', distance: y - halfHeight },
    { edge: 'right', distance: width - x - halfWidth },
    { edge: 'bottom', distance: height - y - halfHeight },
    { edge: 'left', distance: x - halfWidth },
  ] as const;
  return edges.reduce((nearest, candidate) => candidate.distance < nearest.distance ? candidate : nearest);
}

export function GooeyDock() {
  const field = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [location, setLocation] = useState({ x: .5, y: .57 });
  const [docked, setDocked] = useState<DockEdge | null>(null);
  const drag = useRef<{ id: number; offset: Point; position: Point } | null>(null);
  const { width, height } = size;
  const raw = { x: location.x * width, y: location.y * height };

  useEffect(() => {
    if (!field.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(field.current);
    return () => observer.disconnect();
  }, []);

  function constrain(point: Point) {
    return {
      x: Math.max(halfWidth, Math.min(width - halfWidth, point.x)),
      y: Math.max(halfHeight, Math.min(height - halfHeight, point.y)),
    };
  }

  function place(point: Point) {
    setLocation({ x: point.x / width, y: point.y / height });
  }

  const edge = docked ?? nearestEdge(raw, size).edge;
  const horizontal = edge === 'top' || edge === 'bottom';
  const axisSize = horizontal ? width : height;
  const crossSize = horizontal ? height : width;
  const far = edge === 'right' || edge === 'bottom';
  const along = horizontal ? raw.x : raw.y;
  const cross = horizontal ? raw.y : raw.x;
  const distance = far ? crossSize - cross : cross;
  const edgeInset = edgeDepth(edge);
  const halfSpan = horizontal ? halfWidth : halfHeight;
  const blend = docked ? 1 : Math.max(0, Math.min(1, 1 - (distance - edgeInset) / snapGap));
  const depth = docked ? edgeInset : distance;
  // Leave room on both sides so the joined curve stays tangent to the frame near corners.
  const spread = halfSpan + 26 * blend;
  const track = Math.max(spread, Math.min(axisSize - spread, along));
  const axis = along + (track - along) * blend;
  const map = (u: number, v: number) => {
    const inward = far ? crossSize - v : v;
    return horizontal ? { x: u, y: inward } : { x: inward, y: u };
  };
  const point = (u: number, v: number) => {
    const result = map(u, v);
    return result.x + ' ' + result.y;
  };
  const center = map(axis, depth);
  const neck = halfSpan * (.35 + .65 * blend);
  const shoulder = depth * blend;
  const bridge = [
    `M ${point(axis - spread, 0)}`,
    `C ${point(axis - neck - 11 * blend, 0)} ${point(axis - neck, shoulder * .48)} ${point(axis - neck, shoulder)}`,
    `L ${point(axis + neck, shoulder)}`,
    `C ${point(axis + neck, shoulder * .48)} ${point(axis + neck + 11 * blend, 0)} ${point(axis + spread, 0)} Z`,
  ].join(' ');

  return (
    <svg ref={field} className="gooey-dock-play" tabIndex={0}
      role="button" aria-label="Gooey dock. Drag to any edge or use the arrow keys. Press Enter to attach or detach."
      aria-pressed={docked !== null}
      onKeyDown={event => {
        const directions: Partial<Record<string, Point>> = {
          ArrowLeft: { x: -18, y: 0 }, ArrowRight: { x: 18, y: 0 },
          ArrowUp: { x: 0, y: -18 }, ArrowDown: { x: 0, y: 18 },
        };
        const delta = directions[event.key];
        if ((!delta && event.key !== 'Enter' && event.key !== ' ') || !width || !height || drag.current) return;
        event.preventDefault();
        if (delta) {
          const next = constrain({ x: center.x + delta.x, y: center.y + delta.y });
          const target = nearestEdge(next, size);
          place(next);
          setDocked(target.distance <= 3 ? target.edge : null);
        } else if (!event.repeat) {
          if (docked) place({ x: width / 2, y: height * .57 });
          setDocked(docked ? null : edge);
        }
      }}
      onPointerDown={event => {
        if (drag.current || event.button !== 0 || event.target === event.currentTarget) return;
        const pointer = svgPoint(event);
        drag.current = {
          id: event.pointerId,
          offset: { x: pointer.x - center.x, y: pointer.y - center.y },
          position: center,
        };
        place(center);
        setDocked(null);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const active = drag.current;
        if (active?.id !== event.pointerId) return;
        const pointer = svgPoint(event);
        active.position = constrain({ x: pointer.x - active.offset.x, y: pointer.y - active.offset.y });
        place(active.position);
      }}
      onLostPointerCapture={event => {
        const active = drag.current;
        if (active?.id !== event.pointerId) return;
        drag.current = null;
        const target = nearestEdge(active.position, size);
        setDocked(target.distance <= snapGap ? target.edge : null);
      }}>
      {width > 0 && height > 0 && <>
        {blend > 0 && <path d={bridge} fill="currentColor" pointerEvents="none"/>}
        <rect x={center.x - halfWidth} y={center.y - halfHeight}
          width={halfWidth * 2} height={halfHeight * 2} rx={halfWidth} fill="currentColor" className="dock-blob"/>
        {blend > 0 && <path d={`M ${point(axis - spread, .75)} L ${point(axis + spread, .75)}`}
          stroke="currentColor" strokeWidth="1.5" pointerEvents="none"/>}
      </>}
    </svg>
  );
}
