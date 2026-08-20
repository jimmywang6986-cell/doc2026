/* 硬件模型：机箱、主板、CPU、散热器、内存、显卡、电源、存储、风扇、线材 */
(function (root) {
  'use strict';

  const { MAT, m, fanFrame, fanRotor } = root.MODELS_ROOM;
  const { bezier } = root.GEOM;

  /** 主板局部布局（原点为 PCB 中心，PCB 位于 XY 平面，元件朝 +Z） */
  const MB_L = {
    size: [0.305, 0.244, 0.0018],
    cpu: [-0.045, 0.055],
    dimm: { xs: [0.052, 0.064, 0.076, 0.088], y: 0.045, len: 0.133 },
    pcie16: { x: -0.100, y: -0.032, len: 0.089 },
    pcie1: { x: -0.126, y: -0.072, len: 0.026 },
    m2: [-0.082, 0.004],
    m2b: [-0.082, -0.086],
    chipset: [0.022, -0.078],
    atx24: [0.144, 0.062],
    eps8: [-0.082, 0.113],
    sata: [0.146, -0.048],
    fpanel: [0.112, -0.116],
    usb3: [0.140, -0.088],
    cpuFan: [-0.012, 0.116],
    sysFan: [0.062, -0.116],
    battery: [0.030, -0.104],
    postLed: [0.128, 0.108],
  };

  const label = (key, w, h, fn) => root.TEX.label(key, w, h, fn);

  function labelTex(key, w, h, bg, lines, opts) {
    opts = opts || {};
    return label(key, w, h, (ctx) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (opts.border) {
        ctx.strokeStyle = opts.border;
        ctx.lineWidth = Math.max(2, h * 0.03);
        ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
      }
      ctx.textAlign = opts.align || 'center';
      let y = opts.top != null ? opts.top : h * 0.3;
      for (const l of lines) {
        ctx.fillStyle = l.color || '#e8eef5';
        ctx.font = (l.bold === false ? '' : 'bold ') + (l.size || Math.round(h * 0.22))
          + 'px "WenQuanYi Micro Hei", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(l.t, opts.align === 'left' ? w * 0.06 : w / 2, y);
        y += (l.gap || (l.size || h * 0.22) * 1.35);
      }
    });
  }

  const HW = {
    /* ============ 机箱 ============ */
    pcCase(mb) {
      const X = 0.23, Y = 0.48, Z = 0.108; // 半深 / 高 / 半宽
      const panel = m(MAT.steelDark, { color: [0.10, 0.105, 0.115], rough: 0.45 });
      // 底板 / 顶板
      mb.box(m(panel, { at: [0, 0.006, 0], size: [X * 2, 0.012, Z * 2], uv: 2 }));
      mb.box(m(panel, { at: [0, Y - 0.006, 0], size: [X * 2, 0.012, Z * 2], uv: 2, skip: ['py'] }));
      // 顶部开孔（走线/上排风）
      mb.box(m(MAT.mesh, { at: [0.02, Y - 0.001, 0], size: [0.3, 0.004, 0.14], uv: 6 }));
      // 主板背板（含走线孔与橡胶垫圈）
      mb.box(m(panel, { at: [0, Y / 2, -Z + 0.004], size: [X * 2, Y, 0.008], uv: 2 }));
      for (const hole of [[0.11, 0.30], [0.11, 0.14], [-0.19, 0.13]]) {
        mb.box(m(MAT.rubber, { at: [hole[0], hole[1], -Z + 0.009], size: [0.05, 0.10, 0.004], color: [0.06, 0.06, 0.07] }));
      }
      // 后面板：I/O 开口 + PCIe 挡板 + 电源开孔
      mb.box(m(panel, { at: [-X + 0.004, 0.34, 0], size: [0.008, 0.28, Z * 2], uv: 2, skip: ['px'] }));
      mb.box(m(panel, { at: [-X + 0.004, 0.145, 0.07], size: [0.008, 0.11, 0.075], uv: 2 }));
      mb.box(m(panel, { at: [-X + 0.004, 0.05, -0.02], size: [0.008, 0.09, 0.16], uv: 2 }));
      // I/O 挡板开口边框
      mb.box(m(MAT.steel, { at: [-X + 0.008, 0.325, -0.055], size: [0.002, 0.045, 0.10], color: [0.3, 0.3, 0.32] }));
      // PCIe 挡板槽位
      for (let i = 0; i < 7; i++) {
        mb.box(m(MAT.steel, {
          at: [-X + 0.008, 0.205 - i * 0.021, -0.028], size: [0.003, 0.019, 0.11],
          color: i < 2 ? [0.16, 0.16, 0.17] : [0.30, 0.31, 0.33], rough: 0.4,
        }));
      }
      // 前面板骨架 + 网孔 + 防尘网
      mb.box(m(panel, { at: [X - 0.008, Y / 2, 0], size: [0.016, Y, Z * 2], uv: 2, skip: ['nx'] }));
      mb.box(m(MAT.mesh, { at: [X - 0.001, Y / 2, 0], size: [0.004, Y - 0.06, Z * 2 - 0.03], uv: 7 }));
      mb.box(m(MAT.plastic, { at: [X + 0.004, Y / 2, 0], size: [0.006, Y, Z * 2], color: [0.09, 0.09, 0.10], skip: ['nx'], uv: 3 }));
      mb.box(m(MAT.mesh, { at: [X + 0.008, Y / 2, 0], size: [0.003, Y - 0.08, Z * 2 - 0.04], uv: 8 }));
      // 前面板电源键 / 指示灯 / USB / 音频
      mb.cyl(m(MAT.alu, { at: [X + 0.011, Y - 0.05, 0.04], axis: 'x', r: 0.011, h: 0.006, segs: 18, color: [0.55, 0.56, 0.6] }));
      mb.cyl(m(MAT.plastic, { at: [X + 0.014, Y - 0.05, 0.04], axis: 'x', r: 0.004, h: 0.002, segs: 12, color: [0.5, 0.8, 1.0], emis: 0 }));
      mb.box(m(MAT.plastic, { at: [X + 0.011, Y - 0.085, 0.04], size: [0.004, 0.012, 0.026], color: [0.05, 0.05, 0.06] }));
      mb.box(m(MAT.plastic, { at: [X + 0.011, Y - 0.105, 0.04], size: [0.004, 0.012, 0.026], color: [0.05, 0.05, 0.06] }));
      mb.cyl(m(MAT.plastic, { at: [X + 0.011, Y - 0.125, 0.04], axis: 'x', r: 0.006, h: 0.004, segs: 12, color: [0.1, 0.6, 0.3] }));
      // 侧板导轨与顶部提手
      for (const sy of [0.02, Y - 0.02]) {
        mb.box(m(panel, { at: [0, sy, Z - 0.002], size: [X * 2 - 0.02, 0.014, 0.004] }));
      }
      // 脚垫
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mb.cyl(m(MAT.rubber, { at: [sx * (X - 0.03), -0.008, sz * (Z - 0.025)], axis: 'y', r: 0.016, h: 0.016, segs: 14 }));
        }
      }
      // 底部防尘网 + 硬盘笼
      mb.box(m(MAT.mesh, { at: [-0.09, 0.001, 0], size: [0.17, 0.003, Z * 1.7], uv: 6 }));
      const cage = m(MAT.steel, { color: [0.22, 0.23, 0.25], rough: 0.5 });
      mb.box(m(cage, { at: [0.155, 0.012, 0], size: [0.12, 0.004, 0.2], uv: 3 }));
      mb.box(m(cage, { at: [0.155, 0.058, -0.095], size: [0.12, 0.09, 0.006], uv: 3 }));
      mb.box(m(cage, { at: [0.155, 0.058, 0.095], size: [0.12, 0.09, 0.006], uv: 3 }));
      mb.box(m(cage, { at: [0.155, 0.104, 0], size: [0.12, 0.005, 0.2], uv: 3 }));
      // 2.5 寸 SSD 托架
      mb.box(m(cage, { at: [0.16, 0.15, -0.04], size: [0.085, 0.004, 0.11], uv: 3 }));
      for (const sz of [-0.09, 0.01]) {
        mb.box(m(cage, { at: [0.16, 0.135, sz], size: [0.085, 0.03, 0.005], uv: 3 }));
      }
      // 品牌铭牌
      mb.quad({
        tex: 'label:caseLogo',
        points: [[X + 0.0155, 0.09, 0.03], [X + 0.0155, 0.09, -0.03], [X + 0.0155, 0.105, -0.03], [X + 0.0155, 0.105, 0.03]],
        normal: [1, 0, 0], color: [1, 1, 1], rough: 0.4, emis: 0.25,
      });
    },

    /** 侧透玻璃侧板 */
    sidePanel(mb) {
      mb.box(m(MAT.glass, { at: [0, 0, 0], size: [0.44, 0.46, 0.004], alpha: 0.20 }));
      mb.box(m(MAT.steelDark, { at: [0, 0, -0.004], size: [0.446, 0.466, 0.004], color: [0.10, 0.105, 0.115], skip: ['pz'] }));
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          mb.cyl(m(MAT.alu, { at: [sx * 0.205, sy * 0.215, 0.006], axis: 'z', r: 0.008, h: 0.008, segs: 12, color: [0.5, 0.5, 0.55] }));
        }
      }
    },

    /* ============ 主板 ============ */
    motherboard(mb) {
      const L = MB_L;
      const [W, H, T] = L.size;
      mb.box(m(MAT.pcb, { at: [0, 0, 0], size: [W, H, T], uv: 3.2, color: [1.1, 1.1, 1.1] }));
      // 螺丝孔
      for (const p of [[-0.135, 0.108], [0.03, 0.108], [0.135, 0.108], [-0.135, 0.0], [0.03, 0.0],
        [0.135, 0.0], [-0.135, -0.108], [0.03, -0.108], [0.135, -0.108]]) {
        mb.cyl(m(MAT.steel, { at: [p[0], p[1], -0.0005], axis: 'z', r: 0.0042, h: T + 0.001, segs: 10, color: [0.55, 0.56, 0.6] }));
        mb.cyl(m(MAT.pcb, { at: [p[0], p[1], 0.0006], axis: 'z', r: 0.0022, h: 0.001, segs: 8, color: [0.05, 0.05, 0.05] }));
      }
      // CPU 插座（LGA）
      const c = L.cpu;
      mb.box(m(MAT.plastic, { at: [c[0], c[1], 0.0022], size: [0.062, 0.062, 0.0035], color: [0.06, 0.06, 0.07], rough: 0.5 }));
      mb.box(m(MAT.gold, { at: [c[0], c[1], 0.0036], size: [0.045, 0.037, 0.0008], color: [1.0, 0.85, 0.45], uv: 40, rough: 0.35 }));
      // 插座压杆与固定框
      mb.box(m(MAT.steel, { at: [c[0], c[1] + 0.036, 0.004], size: [0.07, 0.008, 0.003], color: [0.6, 0.6, 0.64] }));
      mb.box(m(MAT.steel, { at: [c[0] - 0.038, c[1], 0.004], size: [0.007, 0.07, 0.003], color: [0.6, 0.6, 0.64] }));
      mb.cyl(m(MAT.steel, { at: [c[0] + 0.036, c[1] - 0.03, 0.006], axis: 'y', r: 0.0022, h: 0.05, segs: 8, color: [0.7, 0.7, 0.75] }));
      // 散热器四孔
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          mb.cyl(m(MAT.steel, { at: [c[0] + sx * 0.0385, c[1] + sy * 0.0385, 0], axis: 'z', r: 0.0025, h: 0.004, segs: 8, color: [0.4, 0.4, 0.44] }));
        }
      }
      // VRM 散热片（带齿）
      const vrm = m(MAT.aluDark, { color: [0.30, 0.31, 0.34], rough: 0.32, metal: 1 });
      for (const box of [[c[0], 0.108, 0.075, 0.026], [-0.128, 0.055, 0.022, 0.085]]) {
        mb.box(m(vrm, { at: [box[0], box[1], 0.008], size: [box[2], box[3], 0.014] }));
        const along = box[2] > box[3];
        const n = 7;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1) - 0.5);
          mb.box(m(vrm, {
            at: [box[0] + (along ? t * box[2] * 0.85 : 0), box[1] + (along ? 0 : t * box[3] * 0.85), 0.017],
            size: along ? [0.004, box[3] * 0.9, 0.006] : [box[2] * 0.9, 0.004, 0.006],
            color: [0.36, 0.37, 0.4],
          }));
        }
      }
      // 后置 I/O 装甲与接口
      mb.box(m(MAT.plastic, { at: [-0.128, 0.098, 0.016], size: [0.048, 0.05, 0.03], color: [0.07, 0.07, 0.08], rough: 0.4 }));
      mb.box(m(MAT.plastic, { at: [-0.1425, 0.06, 0.014], size: [0.019, 0.09, 0.026], color: [0.10, 0.10, 0.12] }));
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plastic, { at: [-0.1524, 0.09 - i * 0.016, 0.012], size: [0.003, 0.007, 0.014], color: [0.05, 0.15, 0.5] }));
      }
      mb.box(m(MAT.steel, { at: [-0.1524, 0.026, 0.012], size: [0.003, 0.016, 0.017], color: [0.5, 0.5, 0.55] }));
      mb.box(m(MAT.steel, { at: [-0.1524, 0.005, 0.010], size: [0.003, 0.012, 0.03], color: [0.45, 0.45, 0.5] }));
      // 无线网卡天线接口
      for (const sy of [0.115, 0.106]) {
        mb.cyl(m(MAT.gold, { at: [-0.152, sy, 0.008], axis: 'x', r: 0.003, h: 0.006, segs: 10 }));
      }
      // 内存插槽
      L.dimm.xs.forEach((x, i) => {
        const isPrimary = i === 1 || i === 3;
        mb.box(m(MAT.plastic, {
          at: [x, L.dimm.y, 0.004], size: [0.0075, L.dimm.len, 0.008],
          color: isPrimary ? [0.30, 0.30, 0.34] : [0.05, 0.05, 0.06], rough: 0.45,
        }));
        mb.box(m(MAT.plastic, {
          at: [x, L.dimm.y, 0.0085], size: [0.0045, L.dimm.len - 0.004, 0.003],
          color: [0.02, 0.02, 0.02],
        }));
        // 卡扣
        mb.box(m(MAT.plastic, {
          at: [x, L.dimm.y + L.dimm.len / 2 + 0.004, 0.006], size: [0.0075, 0.008, 0.012],
          color: [0.55, 0.55, 0.6], rough: 0.4,
        }));
        mb.box(m(MAT.plastic, {
          at: [x, L.dimm.y - L.dimm.len / 2 - 0.004, 0.006], size: [0.0075, 0.008, 0.012],
          color: [0.55, 0.55, 0.6], rough: 0.4,
        }));
      });
      // PCIe 插槽（带金属装甲）
      mb.box(m(MAT.plastic, { at: [L.pcie16.x, L.pcie16.y, 0.0045], size: [L.pcie16.len, 0.008, 0.009], color: [0.06, 0.06, 0.07] }));
      mb.box(m(MAT.steel, { at: [L.pcie16.x, L.pcie16.y, 0.0095], size: [L.pcie16.len + 0.004, 0.0105, 0.002], color: [0.6, 0.61, 0.65], rough: 0.3 }));
      mb.box(m(MAT.plastic, { at: [L.pcie16.x, L.pcie16.y, 0.006], size: [L.pcie16.len - 0.006, 0.0035, 0.004], color: [0.02, 0.02, 0.02] }));
      mb.box(m(MAT.plastic, { at: [L.pcie1.x, L.pcie1.y, 0.0045], size: [L.pcie1.len, 0.007, 0.009], color: [0.06, 0.06, 0.07] }));
      // M.2 插槽与散热马甲底座
      for (const p of [L.m2, L.m2b]) {
        mb.box(m(MAT.plastic, { at: [p[0] + 0.04, p[1], 0.003], size: [0.008, 0.024, 0.005], color: [0.05, 0.05, 0.06] }));
        mb.box(m(MAT.steel, { at: [p[0] - 0.038, p[1], 0.0018], size: [0.008, 0.012, 0.002], color: [0.5, 0.5, 0.55] }));
        mb.box(m(MAT.pcb, { at: [p[0], p[1], 0.0012], size: [0.078, 0.023, 0.0008], color: [0.7, 0.75, 0.7] }));
      }
      // 芯片组散热片
      mb.box(m(MAT.aluDark, { at: [L.chipset[0], L.chipset[1], 0.008], size: [0.052, 0.052, 0.014], color: [0.14, 0.15, 0.17], rough: 0.35 }));
      mb.box(m(MAT.plastic, { at: [L.chipset[0], L.chipset[1], 0.0155], size: [0.03, 0.03, 0.001], color: [0.6, 0.7, 0.9], emis: 0.15 }));
      // 24pin / EPS / 接针
      mb.box(m(MAT.plastic, { at: [L.atx24[0], L.atx24[1], 0.006], size: [0.011, 0.052, 0.012], color: [0.10, 0.10, 0.11] }));
      mb.box(m(MAT.plastic, { at: [L.eps8[0], L.eps8[1], 0.006], size: [0.031, 0.010, 0.012], color: [0.10, 0.10, 0.11] }));
      mb.box(m(MAT.plastic, { at: [L.fpanel[0], L.fpanel[1], 0.0035], size: [0.024, 0.006, 0.006], color: [0.5, 0.5, 0.55] }));
      mb.box(m(MAT.plastic, { at: [L.usb3[0], L.usb3[1], 0.0045], size: [0.021, 0.010, 0.009], color: [0.10, 0.25, 0.55] }));
      for (const p of [L.cpuFan, L.sysFan]) {
        mb.box(m(MAT.plastic, { at: [p[0], p[1], 0.0035], size: [0.011, 0.005, 0.006], color: [0.85, 0.85, 0.88] }));
      }
      // SATA 接口（侧出）
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plastic, {
          at: [L.sata[0], L.sata[1] - i * 0.011, 0.004], size: [0.012, 0.008, 0.008],
          color: i < 2 ? [0.05, 0.15, 0.4] : [0.1, 0.1, 0.12],
        }));
      }
      // 纽扣电池
      mb.cyl(m(MAT.steel, { at: [L.battery[0], L.battery[1], 0.0025], axis: 'z', r: 0.0105, h: 0.0035, segs: 20, color: [0.75, 0.76, 0.8], rough: 0.25 }));
      // 供电电容与电感
      for (let i = 0; i < 12; i++) {
        mb.box(m(MAT.plastic, { at: [c[0] - 0.03 + i * 0.006, 0.092, 0.004], size: [0.005, 0.005, 0.007], color: [0.12, 0.12, 0.14], rough: 0.3 }));
      }
      for (let i = 0; i < 8; i++) {
        mb.cyl(m(MAT.plastic, { at: [-0.115, 0.09 - i * 0.009, 0.005], axis: 'z', r: 0.0035, h: 0.009, segs: 10, color: [0.15, 0.15, 0.17] }));
      }
      // Debug LED / 状态灯
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plastic, {
          at: [L.postLed[0], L.postLed[1] - i * 0.006, 0.0025], size: [0.004, 0.003, 0.002],
          color: [[1, 0.2, 0.15], [1, 0.75, 0.2], [1, 1, 0.4], [0.3, 1, 0.5]][i], emis: 0,
        }));
      }
      // 丝印标签
      mb.quad({
        tex: 'label:mbLabel',
        points: [[0.055, -0.108, 0.0011], [0.135, -0.108, 0.0011], [0.135, -0.072, 0.0011], [0.055, -0.072, 0.0011]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.6,
      });
    },

    /* ============ CPU ============ */
    cpu(mb) {
      mb.box(m(MAT.pcb, { at: [0, 0, -0.0012], size: [0.045, 0.0375, 0.0016], color: [0.7, 0.75, 0.72], uv: 12 }));
      // 触点阵列
      mb.box(m(MAT.gold, { at: [0, 0, -0.0021], size: [0.040, 0.033, 0.0003], uv: 60, rough: 0.3 }));
      // 顶盖（IHS）
      mb.box(m(MAT.steel, { at: [0, 0, 0.0011], size: [0.0375, 0.0315, 0.0028], color: [0.72, 0.73, 0.78], rough: 0.22 }));
      mb.box(m(MAT.steel, { at: [0, 0.0165, 0.0002], size: [0.045, 0.005, 0.001], color: [0.68, 0.69, 0.74], rough: 0.28 }));
      mb.box(m(MAT.steel, { at: [0, -0.0165, 0.0002], size: [0.045, 0.005, 0.001], color: [0.68, 0.69, 0.74], rough: 0.28 }));
      mb.box(m(MAT.steel, { at: [0.0205, 0, 0.0002], size: [0.005, 0.0375, 0.001], color: [0.68, 0.69, 0.74], rough: 0.28 }));
      mb.box(m(MAT.steel, { at: [-0.0205, 0, 0.0002], size: [0.005, 0.0375, 0.001], color: [0.68, 0.69, 0.74], rough: 0.28 }));
      // 顶盖激光刻字
      mb.quad({
        tex: 'label:cpuTop',
        points: [[-0.0175, -0.014, 0.00255], [0.0175, -0.014, 0.00255], [0.0175, 0.014, 0.00255], [-0.0175, 0.014, 0.00255]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.3, metal: 1,
      });
      // 防呆缺角三角
      mb.box(m(MAT.gold, { at: [-0.019, -0.015, -0.0019], size: [0.004, 0.004, 0.0004], color: [1, 0.9, 0.5] }));
    },

    thermalPasteTube(mb) {
      mb.cyl(m(MAT.plastic, { at: [0, 0, 0], axis: 'x', r: 0.011, h: 0.075, segs: 18, color: [0.85, 0.86, 0.9], rough: 0.35 }));
      mb.cyl(m(MAT.plastic, { at: [0.045, 0, 0], axis: 'x', r: 0.005, h: 0.02, r1: 0.0035, segs: 12, color: [0.15, 0.15, 0.16] }));
      mb.cyl(m(MAT.plastic, { at: [0.058, 0, 0], axis: 'x', r: 0.006, h: 0.012, segs: 12, color: [0.85, 0.2, 0.15] }));
      mb.quad({
        tex: 'label:pasteLabel',
        points: [[-0.03, -0.0, 0.0112], [0.03, 0, 0.0112], [0.03, 0.016, 0.0112], [-0.03, 0.016, 0.0112]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.5,
      });
    },

    pasteBlob(mb) {
      mb.sphere(m(MAT.plastic, {
        at: [0, 0, 0.0012], r: 0.0055, ry: 0.0055, rz: 0.0016, rings: 8, segs: 16,
        color: [0.62, 0.63, 0.66], rough: 0.28, metal: 0.35,
      }));
    },

    /* ============ CPU 散热器 ============ */
    coolerBody(mb) {
      // 底座（铜）
      mb.box(m(MAT.copper, { at: [0, 0, 0.004], size: [0.05, 0.042, 0.008], rough: 0.18 }));
      mb.box(m(MAT.aluDark, { at: [0, 0, 0.010], size: [0.056, 0.05, 0.006], color: [0.55, 0.56, 0.6] }));
      // 扣具
      for (const sx of [-1, 1]) {
        mb.box(m(MAT.steel, { at: [sx * 0.035, 0, 0.006], size: [0.02, 0.056, 0.003], color: [0.4, 0.4, 0.45] }));
        mb.cyl(m(MAT.steel, { at: [sx * 0.0385, 0.024, 0.008], axis: 'z', r: 0.0035, h: 0.012, segs: 10, color: [0.6, 0.6, 0.65] }));
        mb.cyl(m(MAT.steel, { at: [sx * 0.0385, -0.024, 0.008], axis: 'z', r: 0.0035, h: 0.012, segs: 10, color: [0.6, 0.6, 0.65] }));
      }
      // 热管（6 根，从底座向上折入鳍片）
      for (let i = 0; i < 6; i++) {
        const off = -0.019 + i * 0.0076;
        const zc = 0.03 + (i % 2) * 0.018;
        mb.tube(m(MAT.copper, {
          points: bezier([off, 0.012, 0.013], [off, 0.045, 0.013], [off, 0.05, zc], [off, 0.062, zc], 10),
          r: 0.0031, sides: 8, rough: 0.2,
        }));
      }
      // 鳍片组
      const fins = 30;
      for (let i = 0; i < fins; i++) {
        const y = 0.056 + i * 0.0037;
        mb.box(m(MAT.alu, {
          at: [0, y, 0.048], size: [0.118, 0.0012, 0.082], uv: 6,
          color: [0.92, 0.93, 0.96], rough: 0.28,
        }));
      }
      // 顶盖
      mb.box(m(MAT.aluDark, { at: [0, 0.168, 0.048], size: [0.124, 0.006, 0.086], color: [0.16, 0.17, 0.19], rough: 0.35 }));
      mb.quad({
        tex: 'label:coolerTop',
        points: [[-0.05, 0.1712, 0.088], [0.05, 0.1712, 0.088], [0.05, 0.1712, 0.012], [-0.05, 0.1712, 0.012]],
        normal: [0, 1, 0], color: [1, 1, 1], rough: 0.4,
      });
    },

    /* ============ 内存 ============ */
    ram(mb, opt) {
      const col = (opt && opt.color) || [0.18, 0.19, 0.22];
      const L = 0.133;
      mb.box(m(MAT.pcb, { at: [0, 0, 0.013], size: [0.0018, L, 0.028], color: [0.8, 0.85, 0.8], uv: 8 }));
      // 金手指
      mb.box(m(MAT.gold, { at: [0, 0, -0.0015], size: [0.0022, L - 0.012, 0.004], uv: 30, rough: 0.3 }));
      mb.box(m(MAT.pcb, { at: [0, 0.004, -0.0016], size: [0.0024, 0.0035, 0.0045], color: [0.3, 0.35, 0.3] }));
      // 散热马甲（双面）
      for (const sx of [-1, 1]) {
        mb.box(m(MAT.alu, { at: [sx * 0.0032, 0, 0.014], size: [0.0022, L - 0.004, 0.026], color: col, rough: 0.52 }));
        for (let i = 0; i < 9; i++) {
          mb.box(m(MAT.alu, {
            at: [sx * 0.0044, -0.05 + i * 0.0125, 0.019], size: [0.0006, 0.008, 0.012],
            color: [col[0] * 1.3, col[1] * 1.3, col[2] * 1.3], rough: 0.45,
          }));
        }
        mb.quad({
          tex: 'label:ramLabel',
          points: [
            [sx * 0.0044, -0.03, 0.006], [sx * 0.0044, 0.03, 0.006],
            [sx * 0.0044, 0.03, 0.021], [sx * 0.0044, -0.03, 0.021],
          ],
          normal: [sx, 0, 0], color: [1, 1, 1], rough: 0.4,
        });
      }
      // 顶部 RGB 导光条（由节点 emisMul 控制通电后发光）
      mb.box(m(MAT.plasticWhite, {
        at: [0, 0, 0.0295], size: [0.0072, L - 0.006, 0.004],
        color: (opt && opt.rgb) || [1, 1, 1], emis: 1.0, rough: 0.25,
      }));
    },

    /* ============ 显卡 ============ */
    gpuBody(mb) {
      // 卡本体：长度沿 X，出槽方向 +Z，厚度沿 Y（风扇朝 -Y）
      const len = 0.29;
      mb.box(m(MAT.pcb, { at: [0.10, 0, 0.055], size: [len, 0.0018, 0.105], color: [0.6, 0.65, 0.62], uv: 4 }));
      // 金手指
      mb.box(m(MAT.gold, { at: [0.0, -0.0004, 0.0035], size: [0.083, 0.0026, 0.007], uv: 30, rough: 0.28 }));
      mb.box(m(MAT.pcb, { at: [-0.018, -0.0004, 0.0035], size: [0.006, 0.003, 0.0075], color: [0.4, 0.45, 0.42] }));
      // 散热鳍片
      for (let i = 0; i < 30; i++) {
        mb.box(m(MAT.alu, {
          at: [-0.02 + i * 0.0092, -0.022, 0.055], size: [0.0014, 0.038, 0.10],
          color: [0.80, 0.81, 0.85], rough: 0.35, uv: 5,
        }));
      }
      // 均热板与热管
      mb.box(m(MAT.copper, { at: [0.02, -0.006, 0.045], size: [0.06, 0.008, 0.06], rough: 0.2 }));
      for (let i = 0; i < 4; i++) {
        mb.tube(m(MAT.copper, {
          points: [[-0.01, -0.010 - i * 0.0035, 0.02 + i * 0.008], [0.23, -0.010 - i * 0.0035, 0.02 + i * 0.008]],
          r: 0.0035, sides: 8, rough: 0.2,
        }));
      }
      // 外壳（塑料导流罩，朝下开两个风扇口）
      const shroud = m(MAT.plastic, { color: [0.10, 0.10, 0.12], rough: 0.42 });
      mb.box(m(shroud, { at: [0.10, -0.045, 0.055], size: [len, 0.006, 0.105], skip: ['ny'] }));
      mb.box(m(shroud, { at: [0.10, -0.024, 0.108], size: [len, 0.048, 0.006] }));
      mb.box(m(shroud, { at: [0.245, -0.024, 0.055], size: [0.006, 0.048, 0.105] }));
      mb.box(m(shroud, { at: [-0.044, -0.024, 0.055], size: [0.006, 0.048, 0.105] }));
      mb.box(m(shroud, { at: [0.107, -0.024, 0.055], size: [0.008, 0.048, 0.105] }));
      // 背板
      mb.box(m(MAT.aluDark, { at: [0.10, 0.004, 0.055], size: [len, 0.0022, 0.104], color: [0.16, 0.17, 0.19], rough: 0.3 }));
      mb.quad({
        tex: 'label:gpuTop',
        points: [[0.02, 0.0053, 0.02], [0.2, 0.0053, 0.02], [0.2, 0.0053, 0.09], [0.02, 0.0053, 0.09]],
        normal: [0, 1, 0], color: [1, 1, 1], rough: 0.45,
      });
      // 侧面 RGB Logo（通电后发光）
      mb.box(m(MAT.plasticWhite, {
        at: [0.10, -0.024, 0.1115], size: [0.09, 0.012, 0.001],
        color: [0.5, 0.8, 1.0], emis: 1.0, rough: 0.3,
      }));
      // 8pin 供电接口（朝上，位于卡尾上方）
      mb.box(m(MAT.plastic, { at: [0.21, 0.0115, 0.09], size: [0.03, 0.012, 0.011], color: [0.10, 0.10, 0.11] }));
      // 挡板 + 视频接口
      mb.box(m(MAT.steel, { at: [-0.056, -0.02, 0.055], size: [0.002, 0.048, 0.105], color: [0.55, 0.56, 0.6], rough: 0.35 }));
      mb.box(m(MAT.steel, { at: [-0.056, 0.008, 0.055], size: [0.002, 0.014, 0.105], color: [0.55, 0.56, 0.6] }));
      for (let i = 0; i < 3; i++) {
        mb.box(m(MAT.plastic, { at: [-0.052, -0.014, 0.022 + i * 0.024], size: [0.006, 0.008, 0.017], color: [0.05, 0.05, 0.06] }));
      }
      mb.box(m(MAT.plastic, { at: [-0.052, -0.032, 0.03], size: [0.006, 0.011, 0.02], color: [0.05, 0.05, 0.06] }));
    },

    /* ============ 电源 ============ */
    psu(mb) {
      const X = 0.16, Y = 0.086, Z = 0.15;
      mb.box(m(MAT.steelDark, { at: [0, 0, 0], size: [X, Y, Z], uv: 3, color: [0.11, 0.115, 0.125], skip: ['ny'] }));
      // 底部风扇（静态）
      mb.box(m(MAT.mesh, { at: [0.0, -Y / 2 + 0.001, 0], size: [X - 0.02, 0.003, Z - 0.02], uv: 8 }));
      mb.pushTRS([0, -Y / 2 + 0.014, 0], [-1.5708, 0, 0]);
      fanFrame(mb, 0.118, 0.022, { color: [0.09, 0.09, 0.10] });
      fanRotor(mb, 0.118, 0.022, { bladeColor: [0.14, 0.14, 0.16] });
      mb.pop();
      // 后部：IEC 插座、开关、蜂窝网
      mb.box(m(MAT.plastic, { at: [-X / 2 - 0.002, -0.018, -0.045], size: [0.006, 0.026, 0.032], color: [0.05, 0.05, 0.06] }));
      for (let i = 0; i < 3; i++) {
        mb.cyl(m(MAT.gold, { at: [-X / 2 - 0.004, -0.018 + (i - 1) * 0.008, -0.045], axis: 'x', r: 0.002, h: 0.004, segs: 8 }));
      }
      mb.box(m(MAT.plastic, { at: [-X / 2 - 0.002, 0.016, -0.045], size: [0.005, 0.014, 0.022], color: [0.2, 0.2, 0.22] }));
      mb.box(m(MAT.mesh, { at: [-X / 2 - 0.001, 0, 0.03], size: [0.003, Y - 0.014, 0.07], uv: 10 }));
      // 前部模组接口面板
      mb.box(m(MAT.plastic, { at: [X / 2 + 0.001, 0, 0], size: [0.004, Y - 0.008, Z - 0.01], color: [0.07, 0.07, 0.08] }));
      const socket = (y, z, w, h, col) => mb.box(m(MAT.plastic, {
        at: [X / 2 + 0.004, y, z], size: [0.006, h, w], color: col || [0.03, 0.03, 0.035], rough: 0.4,
      }));
      socket(0.022, -0.045, 0.042, 0.012, [0.04, 0.04, 0.05]);   // 24pin
      socket(0.022, 0.012, 0.024, 0.012);                        // EPS
      socket(0.022, 0.045, 0.024, 0.012);                        // EPS2
      socket(-0.006, -0.045, 0.024, 0.011, [0.05, 0.05, 0.07]);  // PCIe
      socket(-0.006, -0.012, 0.024, 0.011, [0.05, 0.05, 0.07]);
      socket(-0.006, 0.024, 0.024, 0.011, [0.05, 0.05, 0.07]);
      socket(-0.03, -0.03, 0.02, 0.009, [0.10, 0.10, 0.12]);     // SATA
      socket(-0.03, 0.0, 0.02, 0.009, [0.10, 0.10, 0.12]);
      // 铭牌
      mb.quad({
        tex: 'label:psuLabel',
        points: [[-0.06, Y / 2 + 0.0005, 0.055], [0.06, Y / 2 + 0.0005, 0.055], [0.06, Y / 2 + 0.0005, -0.055], [-0.06, Y / 2 + 0.0005, -0.055]],
        normal: [0, 1, 0], color: [1, 1, 1], rough: 0.5,
      });
    },

    /* ============ 存储 ============ */
    ssdM2(mb) {
      mb.box(m(MAT.pcb, { at: [0, 0, 0], size: [0.08, 0.022, 0.0022], color: [0.35, 0.4, 0.45], uv: 12 }));
      mb.box(m(MAT.plastic, { at: [0.012, 0.004, 0.0018], size: [0.016, 0.012, 0.0014], color: [0.10, 0.10, 0.12], rough: 0.35 }));
      mb.box(m(MAT.plastic, { at: [-0.012, 0.004, 0.0018], size: [0.014, 0.012, 0.0014], color: [0.10, 0.10, 0.12], rough: 0.35 }));
      mb.box(m(MAT.plastic, { at: [0.012, -0.007, 0.0016], size: [0.01, 0.007, 0.001], color: [0.12, 0.12, 0.14] }));
      mb.box(m(MAT.gold, { at: [-0.0385, 0, 0], size: [0.006, 0.019, 0.0026], uv: 40, rough: 0.3 }));
      mb.box(m(MAT.pcb, { at: [-0.0335, 0.0035, 0], size: [0.003, 0.004, 0.003], color: [0.3, 0.35, 0.4] }));
      mb.quad({
        tex: 'label:m2Label',
        points: [[-0.028, -0.009, 0.0026], [0.03, -0.009, 0.0026], [0.03, 0.009, 0.0026], [-0.028, 0.009, 0.0026]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.5,
      });
    },

    m2Heatsink(mb) {
      mb.box(m(MAT.aluDark, { at: [0, 0, 0.004], size: [0.082, 0.024, 0.005], color: [0.20, 0.21, 0.24], rough: 0.32 }));
      for (let i = 0; i < 9; i++) {
        mb.box(m(MAT.aluDark, { at: [-0.032 + i * 0.008, 0, 0.0075], size: [0.004, 0.022, 0.002], color: [0.26, 0.27, 0.3] }));
      }
      mb.box(m(MAT.rubber, { at: [0, 0, 0.001], size: [0.078, 0.02, 0.001], color: [0.4, 0.4, 0.45] }));
    },

    ssdSata(mb) {
      mb.box(m(MAT.alu, { at: [0, 0, 0], size: [0.07, 0.007, 0.10], color: [0.20, 0.22, 0.26], rough: 0.4, uv: 6 }));
      mb.box(m(MAT.plastic, { at: [0, -0.0005, -0.0505], size: [0.05, 0.005, 0.002], color: [0.05, 0.05, 0.06] }));
      mb.box(m(MAT.plastic, { at: [-0.016, -0.0005, -0.0515], size: [0.012, 0.004, 0.003], color: [0.1, 0.2, 0.45] }));
      mb.box(m(MAT.plastic, { at: [0.010, -0.0005, -0.0515], size: [0.02, 0.004, 0.003], color: [0.1, 0.1, 0.12] }));
      mb.quad({
        tex: 'label:ssdLabel',
        points: [[-0.03, 0.0036, 0.04], [0.03, 0.0036, 0.04], [0.03, 0.0036, -0.035], [-0.03, 0.0036, -0.035]],
        normal: [0, 1, 0], color: [1, 1, 1], rough: 0.55,
      });
    },

    hdd(mb) {
      mb.box(m(MAT.alu, { at: [0, 0, 0], size: [0.101, 0.026, 0.146], color: [0.55, 0.56, 0.6], rough: 0.35, uv: 5 }));
      mb.box(m(MAT.pcb, { at: [0, -0.0135, 0], size: [0.095, 0.002, 0.135], color: [0.5, 0.55, 0.5], uv: 6 }));
      for (const sx of [-1, 1]) {
        for (const sz of [-0.9, 0, 0.9]) {
          mb.cyl(m(MAT.steel, { at: [sx * 0.0505, 0.004, sz * 0.055], axis: 'x', r: 0.0025, h: 0.002, segs: 8, color: [0.3, 0.3, 0.33] }));
        }
      }
      mb.box(m(MAT.plastic, { at: [-0.02, -0.008, -0.0735], size: [0.03, 0.007, 0.003], color: [0.05, 0.05, 0.06] }));
      mb.box(m(MAT.plastic, { at: [0.016, -0.008, -0.0735], size: [0.024, 0.007, 0.003], color: [0.05, 0.05, 0.06] }));
      mb.quad({
        tex: 'label:hddLabel',
        points: [[-0.042, 0.0132, 0.055], [0.042, 0.0132, 0.055], [0.042, 0.0132, -0.05], [-0.042, 0.0132, -0.05]],
        normal: [0, 1, 0], color: [1, 1, 1], rough: 0.6,
      });
    },

    /* ============ 风扇 ============ */
    fan120Frame(mb) { fanFrame(mb, 0.12, 0.025, { diffuser: true, rgb: [1, 1, 1], emis: 0 }); },
    fan120Rotor(mb) { fanRotor(mb, 0.12, 0.025, { bladeColor: [0.13, 0.13, 0.15] }); },
    fanCpuFrame(mb) { fanFrame(mb, 0.12, 0.025, { color: [0.10, 0.10, 0.11] }); },
    fanCpuRotor(mb) { fanRotor(mb, 0.12, 0.025, { bladeColor: [0.18, 0.18, 0.2], blades: 7 }); },
    fanGpuFrame(mb) { fanFrame(mb, 0.085, 0.014, { color: [0.09, 0.09, 0.10] }); },
    fanGpuRotor(mb) { fanRotor(mb, 0.085, 0.014, { bladeColor: [0.14, 0.14, 0.16], blades: 11 }); },

    /* ============ 铜柱与螺丝 ============ */
    standoffBag(mb) {
      mb.box(m(MAT.plastic, { at: [0, 0.012, 0], size: [0.09, 0.024, 0.07], color: [0.6, 0.62, 0.65], rough: 0.3, transparent: true, alpha: 0.55 }));
      for (let i = 0; i < 9; i++) {
        mb.cyl(m(MAT.gold, {
          at: [-0.03 + (i % 3) * 0.03, 0.008, -0.02 + Math.floor(i / 3) * 0.02],
          axis: 'y', r: 0.0035, h: 0.012, segs: 8, color: [0.85, 0.7, 0.3],
        }));
      }
    },

    standoffs(mb) {
      for (const p of [[-0.135, 0.108], [0.03, 0.108], [0.135, 0.108], [-0.135, 0.0], [0.03, 0.0],
        [0.135, 0.0], [-0.135, -0.108], [0.03, -0.108], [0.135, -0.108]]) {
        mb.cyl(m(MAT.gold, { at: [p[0], p[1], 0.003], axis: 'z', r: 0.0045, h: 0.006, segs: 10, color: [0.85, 0.72, 0.35], rough: 0.3 }));
      }
    },

    mbScrews(mb) {
      for (const p of [[-0.135, 0.108], [0.03, 0.108], [0.135, 0.108], [-0.135, 0.0], [0.03, 0.0],
        [0.135, 0.0], [-0.135, -0.108], [0.03, -0.108], [0.135, -0.108]]) {
        mb.cyl(m(MAT.steel, { at: [p[0], p[1], 0.0018], axis: 'z', r: 0.0045, h: 0.0016, segs: 10, color: [0.62, 0.63, 0.68], rough: 0.28 }));
        mb.box(m(MAT.steel, { at: [p[0], p[1], 0.0027], size: [0.0055, 0.0012, 0.0004], color: [0.35, 0.35, 0.38] }));
      }
    },

    wifiAntenna(mb) {
      mb.box(m(MAT.plastic, { at: [0, 0.04, 0], size: [0.012, 0.08, 0.03], color: [0.08, 0.08, 0.09], rough: 0.4 }));
      mb.box(m(MAT.plastic, { at: [0, 0.09, 0], size: [0.012, 0.02, 0.03], color: [0.12, 0.12, 0.14] }));
      mb.cyl(m(MAT.steel, { at: [0, 0.005, 0], axis: 'y', r: 0.008, h: 0.01, segs: 12, color: [0.4, 0.4, 0.45] }));
      mb.tube(m(MAT.rubber, {
        points: bezier([0, 0.002, 0], [0.03, -0.01, 0.03], [0.06, 0.0, 0.06], [0.08, 0.005, 0.09], 10),
        r: 0.0022, sides: 6,
      }));
    },

    /* ============ 线材 ============ */
    /** 手持线材：连接头 + 卷起的线束 */
    cableCoil(mb, opt) {
      const col = (opt && opt.color) || [0.06, 0.06, 0.07];
      const w = (opt && opt.w) || 0.05;
      mb.box(m(MAT.plastic, { at: [0, 0, 0], size: [w, 0.012, 0.014], color: col, rough: 0.4 }));
      for (let i = 0; i < (opt && opt.pins || 12); i++) {
        mb.box(m(MAT.gold, { at: [-w / 2 + 0.004 + i * (w - 0.008) / Math.max(1, (opt && opt.pins || 12) - 1), 0, 0.008], size: [0.002, 0.006, 0.002] }));
      }
      const N = (opt && opt.strands) || 6;
      for (let i = 0; i < N; i++) {
        const t = (i / N - 0.5);
        mb.tube(m(MAT.rubber, {
          points: bezier([t * w * 0.8, 0, -0.008], [t * w, 0.02, -0.05], [t * w * 2, -0.03, -0.10], [t * w * 0.5, 0.01, -0.14], 12),
          r: 0.0026, sides: 6, color: (opt && opt.wire) || [0.05, 0.05, 0.06],
        }));
      }
    },

    /** 已安装的线束：由多段贝塞尔管道构成（机箱局部坐标） */
    cableRun(mb, opt) {
      const paths = opt.paths;
      for (const p of paths) {
        const pts = bezier(p.a, p.c1, p.c2, p.b, p.steps || 16);
        const strands = p.strands || 1;
        for (let s = 0; s < strands; s++) {
          const off = (s - (strands - 1) / 2) * (p.spread || 0.006);
          const shifted = pts.map((q, i) => [
            q[0] + off * (p.axis === 'x' ? 1 : 0),
            q[1] + off * (p.axis === 'y' ? 1 : 0),
            q[2] + off * (p.axis === 'z' || !p.axis ? 1 : 0),
          ]);
          mb.tube(m(MAT.rubber, { points: shifted, r: p.r || 0.0035, sides: 7, color: p.color || [0.05, 0.05, 0.06] }));
        }
        if (p.plugA) mb.box(m(MAT.plastic, { at: p.a, size: p.plugA, color: [0.09, 0.09, 0.10], rough: 0.4 }));
        if (p.plugB) mb.box(m(MAT.plastic, { at: p.b, size: p.plugB, color: [0.09, 0.09, 0.10], rough: 0.4 }));
      }
    },

    /** 发光小点（电源指示灯 / Debug LED） */
    ledDot(mb, opt) {
      opt = opt || {};
      mb.cyl(m(MAT.plasticWhite, {
        at: [0, 0, 0], axis: opt.axis || 'z', r: opt.r || 0.004, h: 0.002, segs: 12,
        color: opt.color || [0.4, 0.9, 1.0], emis: 1.0, rough: 0.2,
      }));
    },

    /** 主板 Debug LED 四连灯 */
    ledDots(mb) {
      const cols = [[1, 0.2, 0.15], [1, 0.72, 0.2], [1, 1, 0.45], [0.3, 1, 0.5]];
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plasticWhite, {
          at: [0, -i * 0.006, 0], size: [0.0042, 0.0032, 0.0016], color: cols[i], emis: 1.0, rough: 0.2,
        }));
      }
    },

    /* ============ 拆下的挡板 / 其他 ============ */
    ioShield(mb) {
      mb.box(m(MAT.steel, { at: [0, 0, 0], size: [0.159, 0.045, 0.002], color: [0.5, 0.5, 0.55], rough: 0.35 }));
      for (let i = 0; i < 5; i++) {
        mb.box(m(MAT.steel, { at: [-0.05 + i * 0.025, 0, 0.002], size: [0.018, 0.02, 0.002], color: [0.2, 0.2, 0.22] }));
      }
    },
  };

  root.MODELS_HW = { HW, MB_L, labelTex };
})(window);
