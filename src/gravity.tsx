import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const pieces = [
  { shape: 'flower', color: '#7467df', width: 118, height: 118 },
  { shape: 'leaf', color: '#ed5bb9', width: 78, height: 73 },
  { shape: 'burst', color: '#ffc64e', width: 91, height: 91 },
  { shape: 'arch', color: '#ff8643', width: 108, height: 115 },
  { shape: 'seal', color: '#58a96e', width: 46, height: 46 },
  { shape: 'capsule', color: '#5bb5e8', width: 88, height: 32 },
  { shape: 'leaf', color: '#ec5367', width: 41, height: 44 },
] as const;

type Piece = typeof pieces[number];

type Point = { x: number; y: number };

function outline(piece: Piece): Point[] {
  const x = piece.width / 2;
  const y = piece.height / 2;
  if (piece.shape === 'arch' || piece.shape === 'leaf' || piece.shape === 'capsule') {
    const radius = Math.min(x, y);
    const corners = piece.shape === 'arch' ? [radius, radius, 1, 1]
      : piece.shape === 'capsule' ? [radius, radius, radius, radius] : [1, radius, 1, radius];
    return corners.flatMap((r, corner) => {
      const cx = corner === 0 || corner === 3 ? -x + r : x - r;
      const cy = corner < 2 ? -y + r : y - r;
      return Array.from({ length: 9 }, (_, step) => {
        const angle = Math.PI + corner * Math.PI / 2 + step * Math.PI / 16;
        return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
      });
    });
  }

  const lobes = piece.shape === 'flower' ? 4 : piece.shape === 'burst' ? 7 : 12;
  const depth = piece.shape === 'flower' ? .18 : piece.shape === 'burst' ? .14 : .065;
  return Array.from({ length: 96 }, (_, index) => {
    const angle = index * Math.PI / 48;
    const radius = 1 - depth * (1 - Math.cos(lobes * angle));
    return { x: Math.cos(angle) * x * radius, y: Math.sin(angle) * y * radius };
  });
}

function convexHull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  function half(vertices: Point[]) {
    const result: Point[] = [];
    for (const c of vertices) {
      while (result.length >= 2) {
        const b = result[result.length - 1];
        const a = result[result.length - 2];
        if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 1e-5) break;
        result.pop();
      }
      result.push(c);
    }
    return result.slice(0, -1);
  }
  return [...half(sorted), ...half(sorted.reverse())];
}

const geometry = pieces.map(piece => {
  const points = outline(piece);
  return { points, hull: convexHull(points) };
});

type Body = {
  piece: Piece;
  points: Point[];
  hull: Point[];
  x: number; y: number; vx: number; vy: number;
  angle: number; spin: number; delay: number;
};

function rotatedHull(body: Body) {
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  return body.hull.map(({ x, y }) => ({ x: x * cos - y * sin, y: x * sin + y * cos }));
}

function project(points: Point[], axis: Point) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function resolvePair(a: Body, b: Body, aHull: Point[], bHull: Point[]) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = (Math.hypot(a.piece.width, a.piece.height) + Math.hypot(b.piece.width, b.piece.height)) / 2;
  if (Math.abs(dx) > reach || Math.abs(dy) > reach) return;
  let penetration = Infinity;
  let normal = { x: 0, y: 0 };
  for (const vertices of [aHull, bHull]) {
    for (let index = 0; index < vertices.length; index++) {
      const start = vertices[index];
      const end = vertices[(index + 1) % vertices.length];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length < .001) continue;
      let axis = { x: (end.y - start.y) / length, y: (start.x - end.x) / length };
      let offset = dx * axis.x + dy * axis.y;
      if (offset < 0) {
        axis = { x: -axis.x, y: -axis.y };
        offset = -offset;
      }
      const first = project(aHull, axis);
      const second = project(bHull, axis);
      if (second.min + offset > first.max || second.max + offset < first.min) return;
      const overlap = first.max - second.min - offset;
      if (overlap < penetration) {
        penetration = overlap;
        normal = axis;
      }
    }
  }
  const correction = Math.max(0, penetration - .12) * .48;
  a.x -= normal.x * correction;
  a.y -= normal.y * correction;
  b.x += normal.x * correction;
  b.y += normal.y * correction;
  const closing = (a.vx - b.vx) * normal.x + (a.vy - b.vy) * normal.y;
  if (closing <= 0) return;
  const impulse = closing * (closing > 95 ? .61 : .5);
  a.vx -= impulse * normal.x;
  a.vy -= impulse * normal.y;
  b.vx += impulse * normal.x;
  b.vy += impulse * normal.y;
  a.spin *= .82;
  b.spin *= .82;
}

export function Gravity() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let age = 0;
    let visible = false;
    let bodies: Body[] = [];

    function reset() {
      age = 0;
      bodies = pieces.map((piece, index) => {
        const x = width * (.18 + Math.random() * .64);
        return {
          piece, ...geometry[index], x, y: reduced ? height * (.35 + index % 3 * .22) : -piece.height - 18,
          vx: (Math.random() - .5) * 120, vy: 0,
          angle: (Math.random() - .5) * .85,
          spin: (Math.random() - .5) * 3,
          delay: reduced ? 0 : index * .3,
        };
      });
    }

    function paint() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = reduced ? 1 : Math.min(1, (7 - age) * 2.8);
      for (const body of bodies) {
        if (body.delay > age) continue;
        const { piece } = body;
        context.save();
        context.translate(body.x, body.y);
        context.rotate(body.angle);
        context.fillStyle = piece.color;
        context.beginPath();
        body.points.forEach(({ x, y }, index) => {
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
        context.fill();
        context.restore();
      }
    }

    function update(dt: number) {
      const active = bodies.filter(body => age >= body.delay);
      for (const body of active) {
        body.vy += 1050 * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.spin * dt;
      }
      const hulls = active.map(rotatedHull);
      for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < active.length; i++) {
          const a = active[i];
          const hull = hulls[i];
          for (let j = i + 1; j < active.length; j++) {
            resolvePair(a, active[j], hull, hulls[j]);
          }
          const horizontal = project(hull, { x: 1, y: 0 });
          const floor = project(hull, { x: 0, y: 1 }).max;
          if (a.x + horizontal.min < 0 || a.x + horizontal.max > width) {
            a.x = Math.max(-horizontal.min, Math.min(width - horizontal.max, a.x));
            a.vx *= -.45;
          }
          if (a.y + floor > height) {
            a.y = height - floor;
            a.vy = Math.abs(a.vy) < 26 ? 0 : -Math.abs(a.vy) * .28;
            a.vx *= .87;
            a.spin *= .86;
          }
        }
      }
    }

    function tick(time: number) {
      frame = 0;
      const dt = last ? Math.min((time - last) / 1000, .033) : 0;
      last = time;
      age += dt;
      if (age >= 7) reset();
      const steps = Math.max(1, Math.ceil(dt * 120));
      for (let step = 0; step < steps; step++) update(dt / steps);
      paint();
      if (visible) frame = requestAnimationFrame(tick);
    }

    const resize = new ResizeObserver(([entry]) => {
      ({ width, height } = entry.contentRect);
      if (!width || !height) return;
      const pixelRatio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * pixelRatio);
      element.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      reset();
      paint();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !reduced;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (visible) frame = requestAnimationFrame(tick);
    });
    resize.observe(element);
    observer.observe(element);
    return () => {
      resize.disconnect();
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return <canvas ref={canvas} className="gravity-play" aria-hidden="true"/>;
}
