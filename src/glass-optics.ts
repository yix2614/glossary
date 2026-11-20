const indices = [1.47, 1.49, 1.52];
const stride = 8;

export function buildLensMap(width: number, height: number, scale: number) {
  const map = new Float32Array(width * height * stride);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const straight = Math.max(0, halfWidth - halfHeight);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + .5 - halfWidth;
      const dy = y + .5 - halfHeight;
      const nx = dx - Math.max(-straight, Math.min(straight, dx));
      const length = Math.hypot(nx, dy);
      const normalX = nx / Math.max(length, 1);
      const normalY = dy / Math.max(length, 1);
      const depth = Math.max(0, (halfHeight - length) / scale);
      const rim = Math.max(0, 1 - depth / 14);
      const incidence = Math.PI / 3 * rim * rim * (3 - 2 * rim);
      const position = (y * width + x) * stride;

      for (let channel = 0; channel < 3; channel++) {
        const transmitted = Math.asin(Math.sin(incidence) / indices[channel]);
        const shift = 30 * scale * Math.tan(incidence - transmitted);
        map[position + channel * 2] = dx * .9 + normalX * shift;
        map[position + channel * 2 + 1] = dy * .9 + normalY * shift;
      }

      // Narrow directional rim reflections, with a dimmer opposing highlight.
      const light = -.46 * normalX - .89 * normalY;
      const glint = Math.exp(-((depth - .9) ** 2) / 1.8);
      map[position + 6] = glint * (.08 + .58 * Math.max(0, light) ** 4 + .19 * Math.max(0, -light) ** 5);
      map[position + 7] = Math.exp(-((depth - 3.1) ** 2) / 2.9) * Math.max(0, -light) * .16;
    }
  }
  return map;
}

export function renderLens(source: ImageData, target: ImageData, map: Float32Array, cx: number, cy: number) {
  const { data, width, height } = source;
  for (let pixel = 0, index = 0; pixel < target.data.length; pixel += 4, index += stride) {
    const light = map[index + 6];
    const shade = map[index + 7];
    for (let channel = 0; channel < 3; channel++) {
      const x = Math.max(0, Math.min(width - 1, cx + map[index + channel * 2]));
      const y = Math.max(0, Math.min(height - 1, cy + map[index + channel * 2 + 1]));
      const left = Math.floor(x);
      const top = Math.floor(y);
      const fx = x - left;
      const fy = y - top;
      const topLeft = (top * width + left) * 4 + channel;
      const rightOffset = left < width - 1 ? 4 : 0;
      const bottomOffset = top < height - 1 ? width * 4 : 0;
      const upper = data[topLeft] * (1 - fx) + data[topLeft + rightOffset] * fx;
      const lower = data[topLeft + bottomOffset] * (1 - fx) + data[topLeft + bottomOffset + rightOffset] * fx;
      const value = (upper * (1 - fy) + lower * fy) * (1 - shade);
      target.data[pixel + channel] = value + (255 - value) * light;
    }
    target.data[pixel + 3] = 255;
  }
}
