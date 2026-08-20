/* 数学库：列主序 4x4 矩阵与向量运算 */
(function (root) {
  'use strict';

  const V3 = {
    set: (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; },
    copy: (o, a) => V3.set(o, a[0], a[1], a[2]),
    add: (o, a, b) => V3.set(o, a[0] + b[0], a[1] + b[1], a[2] + b[2]),
    sub: (o, a, b) => V3.set(o, a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    scale: (o, a, s) => V3.set(o, a[0] * s, a[1] * s, a[2] * s),
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    cross: (o, a, b) => V3.set(o,
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]),
    norm: (o, a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return V3.set(o, a[0] / l, a[1] / l, a[2] / l);
    },
    lerp: (o, a, b, t) => V3.set(o,
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t),
  };

  const M4 = {
    create() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity(o) {
      o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
    },
    copy(o, a) { o.set(a); return o; },
    /** o = a * b （先应用 b 的变换，再应用 a） */
    mul(o, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (let i = 0; i < 4; i++) {
        const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return o;
    },
    /** 平移-旋转(Z*Y*X)-缩放 组合 */
    fromTRS(o, p, r, s) {
      const sx = Math.sin(r[0]), cx = Math.cos(r[0]);
      const sy = Math.sin(r[1]), cy = Math.cos(r[1]);
      const sz = Math.sin(r[2]), cz = Math.cos(r[2]);
      const scx = s ? s[0] : 1, scy = s ? s[1] : 1, scz = s ? s[2] : 1;
      // R = Ry * Rx * Rz
      const m00 = cy * cz + sy * sx * sz;
      const m01 = cx * sz;
      const m02 = -sy * cz + cy * sx * sz;
      const m10 = -cy * sz + sy * sx * cz;
      const m11 = cx * cz;
      const m12 = sy * sz + cy * sx * cz;
      const m20 = sy * cx;
      const m21 = -sx;
      const m22 = cy * cx;
      o[0] = m00 * scx; o[1] = m01 * scx; o[2] = m02 * scx; o[3] = 0;
      o[4] = m10 * scy; o[5] = m11 * scy; o[6] = m12 * scy; o[7] = 0;
      o[8] = m20 * scz; o[9] = m21 * scz; o[10] = m22 * scz; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
      return o;
    },
    perspective(o, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o.fill(0);
      o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf;
      o[11] = -1; o[14] = 2 * far * near * nf;
      return o;
    },
    ortho(o, l, r, b, t, n, f) {
      o.fill(0);
      o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
      o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b);
      o[14] = -(f + n) / (f - n); o[15] = 1;
      return o;
    },
    lookAt(o, eye, center, up) {
      const z = V3.norm([0, 0, 0], V3.sub([0, 0, 0], eye, center));
      const x = V3.norm([0, 0, 0], V3.cross([0, 0, 0], up, z));
      const y = V3.cross([0, 0, 0], z, x);
      o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0;
      o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
      o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0;
      o[12] = -V3.dot(x, eye); o[13] = -V3.dot(y, eye); o[14] = -V3.dot(z, eye); o[15] = 1;
      return o;
    },
    invert(o, a) {
      const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4];
      const b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5];
      const b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
      const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12];
      const b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13];
      const b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M4.identity(o);
      det = 1 / det;
      const r = [
        (a[5] * b11 - a[6] * b10 + a[7] * b09) * det,
        (a[2] * b10 - a[1] * b11 - a[3] * b09) * det,
        (a[13] * b05 - a[14] * b04 + a[15] * b03) * det,
        (a[10] * b04 - a[9] * b05 - a[11] * b03) * det,
        (a[6] * b08 - a[4] * b11 - a[7] * b07) * det,
        (a[0] * b11 - a[2] * b08 + a[3] * b07) * det,
        (a[14] * b02 - a[12] * b05 - a[15] * b01) * det,
        (a[8] * b05 - a[10] * b02 + a[11] * b01) * det,
        (a[4] * b10 - a[5] * b08 + a[7] * b06) * det,
        (a[1] * b08 - a[0] * b10 - a[3] * b06) * det,
        (a[12] * b04 - a[13] * b02 + a[15] * b00) * det,
        (a[9] * b02 - a[8] * b04 - a[11] * b00) * det,
        (a[5] * b07 - a[4] * b09 - a[6] * b06) * det,
        (a[0] * b09 - a[1] * b07 + a[2] * b06) * det,
        (a[13] * b01 - a[12] * b03 - a[14] * b00) * det,
        (a[8] * b03 - a[9] * b01 + a[10] * b00) * det,
      ];
      o.set(r);
      return o;
    },
    /** 取左上 3x3 的逆转置，用于法线变换 */
    normalMat(o3, m) {
      const inv = M4.invert(M4.create(), m);
      o3[0] = inv[0]; o3[1] = inv[4]; o3[2] = inv[8];
      o3[3] = inv[1]; o3[4] = inv[5]; o3[5] = inv[9];
      o3[6] = inv[2]; o3[7] = inv[6]; o3[8] = inv[10];
      return o3;
    },
    xformPoint(o, m, p) {
      const x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      return V3.set(o,
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w);
    },
    xformDir(o, m, p) {
      const x = p[0], y = p[1], z = p[2];
      return V3.set(o,
        m[0] * x + m[4] * y + m[8] * z,
        m[1] * x + m[5] * y + m[9] * z,
        m[2] * x + m[6] * y + m[10] * z);
    },
  };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

  root.MATH3D = { V3, M4, clamp, lerp, smooth, damp };
})(window);
