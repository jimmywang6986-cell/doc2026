/* 几何构建器：把长方体/圆柱/管线/球体累积成按材质分组的网格 */
(function (root) {
  'use strict';

  const { M4, V3 } = root.MATH3D;

  const FACES = {
    px: { n: [1, 0, 0], u: 'z', v: 'y', sign: 1 },
    nx: { n: [-1, 0, 0], u: 'z', v: 'y', sign: -1 },
    py: { n: [0, 1, 0], u: 'x', v: 'z', sign: 1 },
    ny: { n: [0, -1, 0], u: 'x', v: 'z', sign: -1 },
    pz: { n: [0, 0, 1], u: 'x', v: 'y', sign: 1 },
    nz: { n: [0, 0, -1], u: 'x', v: 'y', sign: -1 },
  };

  class MB {
    constructor() {
      this.groups = new Map();
      this.stack = [M4.identity(M4.create())];
      this.min = [1e9, 1e9, 1e9];
      this.max = [-1e9, -1e9, -1e9];
    }

    get mat() { return this.stack[this.stack.length - 1]; }

    push(m) {
      this.stack.push(M4.mul(M4.create(), this.mat, m));
      return this;
    }

    pushTRS(pos, rot, scale) {
      return this.push(M4.fromTRS(M4.create(), pos || [0, 0, 0], rot || [0, 0, 0], scale || [1, 1, 1]));
    }

    pop() { this.stack.pop(); return this; }

    group(o) {
      const tex = o.tex || 'white';
      const key = tex + (o.transparent ? '|T' : '') + (o.noShadow ? '|N' : '');
      let g = this.groups.get(key);
      if (!g) {
        g = {
          tex, transparent: !!o.transparent, noShadow: !!o.noShadow,
          alpha: o.alpha != null ? o.alpha : 1,
          verts: [], idx: [], n: 0,
        };
        this.groups.set(key, g);
      }
      if (o.alpha != null) g.alpha = o.alpha;
      return g;
    }

    vert(g, p, n, uv, o) {
      const wp = M4.xformPoint([0, 0, 0], this.mat, p);
      const wn = V3.norm([0, 0, 0], M4.xformDir([0, 0, 0], this.mat, n));
      const c = o.color || [1, 1, 1];
      g.verts.push(
        wp[0], wp[1], wp[2],
        wn[0], wn[1], wn[2],
        uv[0], uv[1],
        c[0], c[1], c[2],
        o.rough != null ? o.rough : 0.6,
        o.metal != null ? o.metal : 0,
        o.emis != null ? o.emis : 0,
      );
      for (let i = 0; i < 3; i++) {
        if (wp[i] < this.min[i]) this.min[i] = wp[i];
        if (wp[i] > this.max[i]) this.max[i] = wp[i];
      }
      return g.n++;
    }

    quadRaw(g, p0, p1, p2, p3, n, uvs, o) {
      const a = this.vert(g, p0, n, uvs[0], o);
      const b = this.vert(g, p1, n, uvs[1], o);
      const c = this.vert(g, p2, n, uvs[2], o);
      const d = this.vert(g, p3, n, uvs[3], o);
      g.idx.push(a, b, c, a, c, d);
      if (o.doubleSided) g.idx.push(a, c, b, a, d, c);
    }

    /** 任意四点面片（按 p0→p1→p2→p3 顺序） */
    quad(o) {
      const g = this.group(o);
      const [p0, p1, p2, p3] = o.points;
      let n = o.normal;
      if (!n) {
        const e1 = V3.sub([0, 0, 0], p1, p0);
        const e2 = V3.sub([0, 0, 0], p3, p0);
        n = V3.norm([0, 0, 0], V3.cross([0, 0, 0], e1, e2));
      }
      const uv = o.uvRect || [0, 0, 1, 1];
      const uvs = [
        [uv[0], uv[3]], [uv[2], uv[3]], [uv[2], uv[1]], [uv[0], uv[1]],
      ];
      this.quadRaw(g, p0, p1, p2, p3, n, uvs, o);
      return this;
    }

    /** 长方体：at 为中心，size 为整体尺寸 */
    box(o) {
      const g = this.group(o);
      const [cx, cy, cz] = o.at;
      const [sx, sy, sz] = o.size;
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const uvs = o.uv != null ? o.uv : 1;
      const skip = o.skip || [];
      const axis = { x: [cx - hx, sx], y: [cy - hy, sy], z: [cz - hz, sz] };

      const corner = (fx, fy, fz) => [cx + fx * hx, cy + fy * hy, cz + fz * hz];
      const face = (name, quadPts) => {
        if (skip.indexOf(name) >= 0) return;
        const f = FACES[name];
        let uvArr;
        if (o.uvFit) {
          uvArr = [[0, 1], [1, 1], [1, 0], [0, 0]];
        } else {
          const uSpan = axis[f.u][1] * uvs, vSpan = axis[f.v][1] * uvs;
          const u0 = axis[f.u][0] * uvs, v0 = axis[f.v][0] * uvs;
          uvArr = [
            [u0, v0 + vSpan], [u0 + uSpan, v0 + vSpan], [u0 + uSpan, v0], [u0, v0],
          ];
        }
        this.quadRaw(g, quadPts[0], quadPts[1], quadPts[2], quadPts[3], f.n, uvArr, o);
      };

      face('px', [corner(1, -1, 1), corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1)]);
      face('nx', [corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1)]);
      face('py', [corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1), corner(-1, 1, -1)]);
      face('ny', [corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1)]);
      face('pz', [corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)]);
      face('nz', [corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1)]);
      return this;
    }

    /** 圆柱 / 圆盘，axis: 'x' | 'y' | 'z' */
    cyl(o) {
      const g = this.group(o);
      const segs = o.segs || 16;
      const r0 = o.r, r1 = o.r1 != null ? o.r1 : o.r;
      const h = o.h, [cx, cy, cz] = o.at;
      const axis = o.axis || 'y';
      const map = (rad, t, ang) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        if (axis === 'y') return [cx + c * rad, cy + t, cz + s * rad];
        if (axis === 'x') return [cx + t, cy + c * rad, cz + s * rad];
        return [cx + c * rad, cy + s * rad, cz + t];
      };
      const nrm = (ang, rad) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        if (axis === 'y') return [c, 0, s];
        if (axis === 'x') return [0, c, s];
        return [c, s, 0];
      };
      const half = h / 2;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const p0 = map(r0, -half, a0), p1 = map(r0, -half, a1);
        const p2 = map(r1, half, a1), p3 = map(r1, half, a0);
        const uvs = [[i / segs * (o.uv || 1), 0], [(i + 1) / segs * (o.uv || 1), 0],
          [(i + 1) / segs * (o.uv || 1), h * (o.uv || 1)], [i / segs * (o.uv || 1), h * (o.uv || 1)]];
        const va = this.vert(g, p0, nrm(a0), uvs[0], o);
        const vb = this.vert(g, p1, nrm(a1), uvs[1], o);
        const vc = this.vert(g, p2, nrm(a1), uvs[2], o);
        const vd = this.vert(g, p3, nrm(a0), uvs[3], o);
        g.idx.push(va, vb, vc, va, vc, vd);
      }
      if (o.caps !== false) {
        for (const [t, rad, dir] of [[-half, r0, -1], [half, r1, 1]]) {
          const nv = axis === 'y' ? [0, dir, 0] : axis === 'x' ? [dir, 0, 0] : [0, 0, dir];
          const center = this.vert(g, map(0, t, 0), nv, [0.5, 0.5], o);
          const ring = [];
          for (let i = 0; i <= segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            ring.push(this.vert(g, map(rad, t, a), nv, [0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5], o));
          }
          for (let i = 0; i < segs; i++) {
            if (dir > 0) g.idx.push(center, ring[i], ring[i + 1]);
            else g.idx.push(center, ring[i + 1], ring[i]);
          }
        }
      }
      return this;
    }

    sphere(o) {
      const g = this.group(o);
      const rings = o.rings || 10, segs = o.segs || 16;
      const [cx, cy, cz] = o.at;
      const rx = o.r, ry = o.ry != null ? o.ry : o.r, rz = o.rz != null ? o.rz : o.r;
      const grid = [];
      for (let i = 0; i <= rings; i++) {
        const phi = (i / rings) * Math.PI;
        const row = [];
        for (let j = 0; j <= segs; j++) {
          const th = (j / segs) * Math.PI * 2;
          const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
          row.push(this.vert(g, [cx + nx * rx, cy + ny * ry, cz + nz * rz], [nx, ny, nz],
            [j / segs, i / rings], o));
        }
        grid.push(row);
      }
      for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segs; j++) {
          g.idx.push(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1]);
          g.idx.push(grid[i][j], grid[i + 1][j + 1], grid[i][j + 1]);
        }
      }
      return this;
    }

    /** 沿折线生成管道（线材） */
    tube(o) {
      const g = this.group(o);
      const pts = o.points, r = o.r, sides = o.sides || 8;
      const rings = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
        const dir = V3.norm([0, 0, 0], V3.sub([0, 0, 0], next, prev));
        let up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const side = V3.norm([0, 0, 0], V3.cross([0, 0, 0], dir, up));
        const up2 = V3.norm([0, 0, 0], V3.cross([0, 0, 0], side, dir));
        const ring = [];
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * Math.PI * 2;
          const nx = side[0] * Math.cos(a) + up2[0] * Math.sin(a);
          const ny = side[1] * Math.cos(a) + up2[1] * Math.sin(a);
          const nz = side[2] * Math.cos(a) + up2[2] * Math.sin(a);
          ring.push(this.vert(g, [p[0] + nx * r, p[1] + ny * r, p[2] + nz * r], [nx, ny, nz],
            [j / sides * 2, i * 0.5], o));
        }
        rings.push(ring);
      }
      for (let i = 0; i < rings.length - 1; i++) {
        for (let j = 0; j < sides; j++) {
          g.idx.push(rings[i][j], rings[i + 1][j], rings[i + 1][j + 1]);
          g.idx.push(rings[i][j], rings[i + 1][j + 1], rings[i][j + 1]);
        }
      }
      return this;
    }

    /** 复制另一个构建器的内容（在当前变换下） */
    build(gl) {
      const subs = [];
      for (const g of this.groups.values()) {
        if (!g.idx.length) continue;
        const mesh = root.GLU.makeVAO(gl, new Float32Array(g.verts), new Uint32Array(g.idx));
        subs.push({
          tex: g.tex, transparent: g.transparent, noShadow: g.noShadow,
          alpha: g.alpha, vao: mesh.vao, count: mesh.count,
        });
      }
      subs.sort((a, b) => (a.transparent ? 1 : 0) - (b.transparent ? 1 : 0));
      return {
        subs,
        bbox: { min: this.min.slice(), max: this.max.slice() },
        size: [this.max[0] - this.min[0], this.max[1] - this.min[1], this.max[2] - this.min[2]],
      };
    }
  }

  /** 三次贝塞尔采样，用于线材走线 */
  function bezier(p0, p1, p2, p3, steps) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, mt = 1 - t;
      const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
      out.push([
        a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
        a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
        a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2],
      ]);
    }
    return out;
  }

  root.GEOM = { MB, bezier };
})(window);
