/* 程序化纹理：噪声基底 + Canvas 绘制细节 + 由高度图生成法线贴图 */
(function (root) {
  'use strict';

  const { clamp } = root.MATH3D;

  function hash2(ix, iy, seed, period) {
    let x = ((ix % period) + period) % period;
    let y = ((iy % period) + period) % period;
    let n = (x * 1619 + y * 31337 + seed * 6971) | 0;
    n = (n << 13) ^ n;
    return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
  }

  function vnoise(x, y, seed, period) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, seed, period);
    const b = hash2(ix + 1, iy, seed, period);
    const c = hash2(ix, iy + 1, seed, period);
    const d = hash2(ix + 1, iy + 1, seed, period);
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
  }

  /** 可平铺的分形噪声，返回 0..1 */
  function fbm(u, v, baseFreq, octaves, seed) {
    let sum = 0, amp = 0.5, norm = 0, f = baseFreq;
    for (let o = 0; o < octaves; o++) {
      sum += amp * vnoise(u * f, v * f, seed + o * 17, f);
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return clamp(0.5 + 0.5 * (sum / norm), 0, 1);
  }

  function newCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  /**
   * pixelFn(u, v) -> [r, g, b, height]，分量为 0..1
   * ctxFn(ctx, size) 可在像素基底之上叠加矢量细节
   */
  function build(size, pixelFn, ctxFn) {
    const canvas = newCanvas(size);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const o = pixelFn(x / size, y / size, x, y);
        const i = (y * size + x) * 4;
        img.data[i] = clamp(o[0], 0, 1) * 255;
        img.data[i + 1] = clamp(o[1], 0, 1) * 255;
        img.data[i + 2] = clamp(o[2], 0, 1) * 255;
        img.data[i + 3] = 255;
        height[y * size + x] = o.length > 3 ? o[3] : 0.5;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (ctxFn) ctxFn(ctx, size);
    return { canvas, height, size };
  }

  function normalMap(height, size, strength) {
    const canvas = newCanvas(size);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        let nx = -dx, ny = -dy, nz = 1;
        const l = Math.hypot(nx, ny, nz);
        nx /= l; ny /= l; nz /= l;
        const i = (y * size + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  const GEN = {
    concrete: () => build(256, (u, v) => {
      const n = fbm(u, v, 8, 5, 3);
      const spots = fbm(u, v, 3, 3, 91);
      const g = 0.30 + n * 0.20 - (spots < 0.34 ? 0.07 : 0);
      return [g * 1.0, g * 0.99, g * 0.95, n];
    }, (ctx, s) => {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#000';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, 0);
        ctx.bezierCurveTo(Math.random() * s, s * 0.4, Math.random() * s, s * 0.7, Math.random() * s, s);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }),

    wall: () => build(256, (u, v) => {
      const n = fbm(u, v, 10, 4, 12);
      const g = 0.52 + n * 0.10;
      return [g, g * 1.01, g * 1.03, n];
    }),

    wood: () => build(256, (u, v) => {
      const warp = fbm(u, v, 4, 3, 7) * 0.6;
      const rings = 0.5 + 0.5 * Math.sin((v * 7 + warp * 3) * Math.PI * 2);
      const grain = fbm(u * 0.4, v * 6, 14, 4, 21);
      const t = rings * 0.22 + grain * 0.78;
      return [0.34 + t * 0.20, 0.22 + t * 0.14, 0.13 + t * 0.08, t];
    }),

    fabric: () => build(128, (u, v, x, y) => {
      const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.88 : 1.0;
      const n = fbm(u, v, 16, 3, 44);
      const g = (0.40 + n * 0.12) * weave;
      return [g, g * 1.01, g * 1.04, weave * 0.5 + n * 0.5];
    }),

    /** 中性浅色漆面：颜色完全由顶点色决定 */
    paint: () => build(256, (u, v) => {
      const n = fbm(u, v, 26, 3, 66);
      const g = 0.58 + n * 0.10;
      return [g, g, g, n];
    }),

    pcb: () => build(512, (u, v) => {
      const n = fbm(u, v, 24, 3, 5);
      const g = 0.020 + n * 0.020;
      return [g, g * 1.15, g * 1.05, n];
    }, (ctx, s) => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 190; i++) {
        const gold = Math.random() < 0.35;
        ctx.strokeStyle = gold ? 'rgba(150,120,45,0.55)' : 'rgba(70,95,80,0.5)';
        ctx.lineWidth = 0.8 + Math.random() * 1.6;
        let x = Math.random() * s, y = Math.random() * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          const horiz = Math.random() < 0.5;
          const d = (Math.random() - 0.5) * s * 0.5;
          if (horiz) x += d; else y += d;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 130; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const r = 1.4 + Math.random() * 2.2;
        ctx.fillStyle = 'rgba(165,140,60,0.75)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(6,10,8,0.9)';
        ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, 7); ctx.fill();
      }
      // 贴片元件
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const w = 3 + Math.random() * 8, h = 2 + Math.random() * 4;
        ctx.fillStyle = Math.random() < 0.5 ? '#171a18' : '#3a2b12';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(200,200,190,0.5)';
        ctx.fillRect(x, y, 1.2, h);
        ctx.fillRect(x + w - 1.2, y, 1.2, h);
      }
      ctx.fillStyle = 'rgba(225,230,225,0.35)';
      ctx.font = '9px monospace';
      for (let i = 0; i < 26; i++) {
        ctx.fillText(['CPU_FAN', 'JUSB3', 'F_PANEL', 'DIMM', 'M.2_1', 'SATA', 'PWR', 'C412', 'R77', 'Q3'][i % 10],
          Math.random() * s * 0.9, Math.random() * s);
      }
    }),

    steel: () => build(256, (u, v) => {
      const brush = fbm(u * 30, v * 0.5, 20, 3, 61);
      const g = 0.42 + brush * 0.16;
      return [g, g * 1.005, g * 1.02, brush];
    }),

    alu: () => build(256, (u, v, x) => {
      const line = 0.85 + 0.15 * Math.sin(x * 1.6);
      const n = fbm(u, v, 26, 2, 71);
      const g = (0.60 + n * 0.10) * line;
      return [g, g, g * 1.03, line];
    }),

    /** 通用塑料底纹（中性灰，实际颜色由顶点色决定） */
    plasticDark: () => build(256, (u, v) => {
      const n = fbm(u, v, 40, 3, 33);
      const g = 0.46 + n * 0.10;
      return [g, g, g * 1.02, n];
    }),

    plasticMesh: () => build(256, (u, v, x, y) => {
      const hole = ((x % 8 < 4) === (y % 8 < 4));
      const n = fbm(u, v, 30, 2, 15);
      const g = (hole ? 0.020 : 0.075) + n * 0.02;
      return [g, g, g * 1.05, hole ? 0.15 : 0.85];
    }),

    rubber: () => build(128, (u, v, x) => {
      const rib = 0.88 + 0.12 * Math.sin(x * 0.8);
      const n = fbm(u, v, 20, 2, 88);
      const g = (0.045 + n * 0.02) * rib;
      return [g, g, g * 1.02, rib];
    }),

    copper: () => build(128, (u, v) => {
      const n = fbm(u * 12, v, 14, 3, 55);
      const t = 0.55 + n * 0.35;
      return [t * 0.92, t * 0.48, t * 0.24, n];
    }),

    gold: () => build(64, (u, v) => {
      const n = fbm(u, v, 10, 2, 24);
      const t = 0.72 + n * 0.22;
      return [t, t * 0.78, t * 0.30, n];
    }),

    paper: () => build(256, (u, v) => {
      const n = fbm(u, v, 20, 3, 99);
      const g = 0.80 + n * 0.16;
      return [g, g * 0.99, g * 0.94, n];
    }),

    white: () => build(32, () => [0.93, 0.94, 0.95, 0.5]),

    tile: () => build(256, (u, v, x, y) => {
      const gx = x % 64, gy = y % 64;
      const grout = gx < 2 || gy < 2;
      const n = fbm(u, v, 14, 3, 41);
      const g = grout ? 0.28 : 0.74 + n * 0.10;
      return [g, g, g * 1.01, grout ? 0.1 : 0.8];
    }),
  };

  const store = new Map();
  let GL = null;

  function ensure(name) {
    if (store.has(name)) return store.get(name);
    const gen = GEN[name];
    if (!gen) throw new Error('未知纹理: ' + name);
    const t = gen();
    const entry = {
      albedo: root.GLU.texFromCanvas(GL, t.canvas, {}),
      normal: null,
    };
    const nmStrength = { concrete: 26, wall: 14, wood: 18, fabric: 30, pcb: 10, plasticMesh: 30, rubber: 16, tile: 20, alu: 14, steel: 8 }[name];
    if (nmStrength) {
      entry.normal = root.GLU.texFromCanvas(GL, normalMap(t.height, t.size, nmStrength), { srgb: false });
    }
    store.set(name, entry);
    return entry;
  }

  /** 由绘制函数生成的贴纸/标签纹理（含中文文字） */
  function label(key, w, h, drawFn) {
    if (store.has('label:' + key)) return store.get('label:' + key);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const entry = { albedo: root.GLU.texFromCanvas(GL, c, { clamp: true }), normal: null };
    store.set('label:' + key, entry);
    return entry;
  }

  root.TEX = {
    init(gl) { GL = gl; },
    get: ensure,
    /** 注册外部纹理（如动态屏幕内容） */
    register(name, entry) { store.set(name, entry); return entry; },
    label,
    fbm,
    names: Object.keys(GEN),
  };
})(window);
