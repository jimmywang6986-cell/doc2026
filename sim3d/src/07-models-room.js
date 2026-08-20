/* 场景模型：材质预设、房间、工作台、货架与各类道具 */
(function (root) {
  'use strict';

  const { MB, bezier } = root.GEOM;

  const MAT = {
    concrete: { tex: 'concrete', color: [0.82, 0.82, 0.84], rough: 0.92, metal: 0 },
    wall: { tex: 'wall', color: [0.74, 0.76, 0.80], rough: 0.88, metal: 0 },
    wallDark: { tex: 'wall', color: [0.30, 0.33, 0.38], rough: 0.85, metal: 0 },
    wood: { tex: 'wood', color: [0.95, 0.92, 0.90], rough: 0.62, metal: 0 },
    woodDark: { tex: 'wood', color: [0.42, 0.40, 0.40], rough: 0.55, metal: 0 },
    steel: { tex: 'steel', color: [1.00, 1.01, 1.04], rough: 0.34, metal: 1 },
    steelDark: { tex: 'steel', color: [0.16, 0.165, 0.18], rough: 0.42, metal: 1 },
    alu: { tex: 'alu', color: [0.90, 0.91, 0.94], rough: 0.26, metal: 1 },
    aluDark: { tex: 'alu', color: [0.30, 0.31, 0.34], rough: 0.35, metal: 1 },
    copper: { tex: 'copper', color: [1.0, 0.95, 0.92], rough: 0.24, metal: 1 },
    gold: { tex: 'gold', color: [1.0, 0.94, 0.86], rough: 0.28, metal: 1 },
    pcb: { tex: 'pcb', color: [1.0, 1.0, 1.0], rough: 0.52, metal: 0 },
    pcbBlue: { tex: 'pcb', color: [0.7, 0.9, 1.5], rough: 0.5, metal: 0 },
    paint: { tex: 'paint', color: [1.0, 1.0, 1.0], rough: 0.5, metal: 0 },
    plastic: { tex: 'plasticDark', color: [0.14, 0.14, 0.15], rough: 0.55, metal: 0 },
    plasticGrey: { tex: 'plasticDark', color: [0.62, 0.62, 0.66], rough: 0.5, metal: 0 },
    plasticWhite: { tex: 'white', color: [0.86, 0.87, 0.88], rough: 0.45, metal: 0 },
    mesh: { tex: 'plasticMesh', color: [1.0, 1.0, 1.0], rough: 0.7, metal: 0 },
    rubber: { tex: 'rubber', color: [1.0, 1.0, 1.0], rough: 0.75, metal: 0 },
    fabric: { tex: 'fabric', color: [1.0, 1.0, 1.0], rough: 0.95, metal: 0 },
    paper: { tex: 'paper', color: [1.0, 1.0, 1.0], rough: 0.8, metal: 0 },
    tile: { tex: 'tile', color: [1.0, 1.0, 1.0], rough: 0.35, metal: 0 },
    glass: { tex: 'white', color: [0.05, 0.07, 0.09], rough: 0.04, metal: 0, transparent: true, alpha: 0.16 },
    lamp: { tex: 'white', color: [1.0, 0.97, 0.92], rough: 0.4, metal: 0, emis: 1.3 },
    sky: { tex: 'white', color: [0.62, 0.74, 1.0], rough: 1, metal: 0, emis: 2.6 },
  };

  const m = (base, over) => Object.assign({}, base, over || {});
  const cache = new Map();

  /** 房间尺寸 */
  const R = { x: 4.2, z: 3.4, y: 3.0 };

  function screw(mb, at, axis, r, mat) {
    mb.cyl(m(mat || MAT.steel, { at, axis, r: r, h: r * 0.7, segs: 10, rough: 0.3 }));
  }

  /** 风扇：frame（外框）与 rotor（可旋转扇叶，绕局部 Z 轴） */
  function fanFrame(mb, size, thick, o) {
    o = o || {};
    const h = size / 2;
    const fr = m(o.mat || MAT.plastic, { color: o.color || [0.13, 0.13, 0.14] });
    const bar = size * 0.10;
    // 四边外框
    mb.box(m(fr, { at: [0, h - bar / 2, 0], size: [size, bar, thick] }));
    mb.box(m(fr, { at: [0, -h + bar / 2, 0], size: [size, bar, thick] }));
    mb.box(m(fr, { at: [-h + bar / 2, 0, 0], size: [bar, size - bar * 2, thick] }));
    mb.box(m(fr, { at: [h - bar / 2, 0, 0], size: [bar, size - bar * 2, thick] }));
    // 四角螺丝孔与减震垫
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        mb.box(m(MAT.rubber, { at: [sx * (h - bar * 0.5), sy * (h - bar * 0.5), thick / 2 - 0.001], size: [bar * 0.9, bar * 0.9, 0.002] }));
      }
    }
    // 后侧支撑与线缆出口
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      mb.pushTRS([0, 0, -thick * 0.32], [0, 0, a]);
      mb.box(m(fr, { at: [0, size * 0.24, 0], size: [size * 0.05, size * 0.42, thick * 0.3] }));
      mb.pop();
    }
    if (o.diffuser) {
      // 导光环：emis 固定为 1，由节点 emisMul 控制是否点亮
      mb.cyl(m(MAT.plasticWhite, {
        at: [0, 0, thick / 2 - 0.002], axis: 'z', r: h * 0.94, h: 0.004, segs: 28,
        color: o.rgb || [1.0, 1.0, 1.0], emis: 1.0, caps: true,
      }));
    }
  }

  function fanRotor(mb, size, thick, o) {
    o = o || {};
    const hub = m(o.mat || MAT.plastic, { color: o.hubColor || [0.10, 0.10, 0.11] });
    mb.cyl(m(hub, { at: [0, 0, 0], axis: 'z', r: size * 0.17, h: thick * 0.6, segs: 18 }));
    mb.cyl(m(MAT.steelDark, { at: [0, 0, thick * 0.31], axis: 'z', r: size * 0.05, h: 0.002, segs: 10 }));
    const blades = o.blades || 9;
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2;
      mb.pushTRS([0, 0, 0], [0, 0, a]);
      mb.pushTRS([size * 0.30, 0, 0], [0, 0.55, 0.16]);
      mb.box(m(o.bladeMat || m(MAT.plastic, { color: o.bladeColor || [0.16, 0.16, 0.18], rough: 0.4 }), {
        at: [0, 0, 0], size: [size * 0.30, size * 0.185, 0.0022], uv: 4,
      }));
      mb.pop();
      mb.pop();
    }
  }

  const BUILDERS = {
    /* ---------------- 房间 ---------------- */
    room(mb) {
      const { x, z, y } = R;
      // 地面（水磨石）
      mb.box(m(MAT.concrete, { at: [0, -0.05, 0], size: [x * 2, 0.1, z * 2], uv: 0.9 }));
      // 天花板
      mb.box(m(MAT.wall, { at: [0, y + 0.05, 0], size: [x * 2, 0.1, z * 2], uv: 0.7, color: [0.55, 0.56, 0.60] }));
      // 天花板横梁
      for (let i = -2; i <= 2; i++) {
        mb.box(m(MAT.woodDark, { at: [i * 1.6, y - 0.12, 0], size: [0.14, 0.22, z * 2], uv: 1.2 }));
      }
      // 墙体（-Z 背墙 / -X 左墙 / +Z 前墙带门洞 / +X 右墙带窗）
      mb.box(m(MAT.wall, { at: [0, y / 2, -z - 0.05], size: [x * 2, y, 0.1], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [-x - 0.05, y / 2, 0], size: [0.1, y, z * 2], uv: 0.8 }));
      // 前墙：留出门洞 (x: 2.0..3.0)
      mb.box(m(MAT.wall, { at: [-0.6, y / 2, z + 0.05], size: [x * 2 - 2.6, y, 0.1], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [3.6, y / 2, z + 0.05], size: [1.2, y, 0.1], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [2.5, y - 0.35, z + 0.05], size: [1.0, 0.7, 0.1], uv: 0.8 }));
      // 门框与门（半开）
      mb.box(m(MAT.woodDark, { at: [2.0, 1.15, z + 0.02], size: [0.08, 2.3, 0.16] }));
      mb.box(m(MAT.woodDark, { at: [3.0, 1.15, z + 0.02], size: [0.08, 2.3, 0.16] }));
      mb.pushTRS([2.04, 0, z - 0.02], [0, -0.7, 0]);
      mb.box(m(MAT.wood, { at: [0.45, 1.05, 0], size: [0.92, 2.1, 0.05], uv: 1.1, color: [0.6, 0.55, 0.52] }));
      mb.cyl(m(MAT.steel, { at: [0.82, 1.02, 0.06], axis: 'z', r: 0.022, h: 0.09, segs: 10 }));
      mb.pop();
      // 右墙：窗洞 (y 1.05..2.25, z -2.7..1.4)
      const wx = x + 0.05;
      mb.box(m(MAT.wall, { at: [wx, 0.52, 0], size: [0.1, 1.05, z * 2], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [wx, 2.62, 0], size: [0.1, 0.76, z * 2], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [wx, 1.65, -3.05], size: [0.1, 1.2, 0.7], uv: 0.8 }));
      mb.box(m(MAT.wall, { at: [wx, 1.65, 2.40], size: [0.1, 1.2, 2.0], uv: 0.8 }));
      // 窗框 + 中挺
      const frame = m(MAT.plasticWhite, { color: [0.66, 0.67, 0.68], rough: 0.5 });
      mb.box(m(frame, { at: [x - 0.02, 1.05, -0.65], size: [0.1, 0.07, 4.1] }));
      mb.box(m(frame, { at: [x - 0.02, 2.25, -0.65], size: [0.1, 0.07, 4.1] }));
      mb.box(m(frame, { at: [x - 0.02, 1.65, -2.70], size: [0.1, 1.2, 0.07] }));
      mb.box(m(frame, { at: [x - 0.02, 1.65, 1.40], size: [0.1, 1.2, 0.07] }));
      mb.box(m(frame, { at: [x - 0.02, 1.65, -0.65], size: [0.09, 1.2, 0.05] }));
      // 窗玻璃 + 窗外天光
      mb.box(m(MAT.glass, { at: [x - 0.01, 1.65, -0.65], size: [0.02, 1.16, 4.04] }));
      mb.box(m(MAT.sky, { at: [x + 0.22, 1.65, -0.65], size: [0.02, 1.14, 4.0] }));
      // 踢脚线
      mb.box(m(MAT.woodDark, { at: [0, 0.06, -z + 0.03], size: [x * 2, 0.12, 0.03] }));
      mb.box(m(MAT.woodDark, { at: [-x + 0.03, 0.06, 0], size: [0.03, 0.12, z * 2] }));
      // 墙面插座与线槽
      for (const px of [-2.4, 0.8, 2.6]) {
        mb.box(m(MAT.plasticWhite, { at: [px, 0.32, -z + 0.04], size: [0.1, 0.14, 0.03] }));
        mb.box(m(MAT.plastic, { at: [px, 0.32, -z + 0.058], size: [0.05, 0.05, 0.005], color: [0.2, 0.2, 0.2] }));
      }
      mb.box(m(MAT.plasticWhite, { at: [0, 2.2, -z + 0.03], size: [x * 2, 0.06, 0.04], color: [0.5, 0.5, 0.5] }));
    },

    /* ---------------- 工作台 ---------------- */
    bench(mb) {
      const w = 4.2, d = 0.86, h = 0.95;
      mb.box(m(MAT.wood, { at: [0, h - 0.03, 0], size: [w, 0.06, d], uv: 1.4 }));
      mb.box(m(MAT.woodDark, { at: [0, h - 0.09, d / 2 - 0.02], size: [w, 0.06, 0.04] }));
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mb.box(m(MAT.steelDark, {
            at: [sx * (w / 2 - 0.12), (h - 0.06) / 2, sz * (d / 2 - 0.1)],
            size: [0.06, h - 0.06, 0.06],
          }));
        }
      }
      mb.box(m(MAT.steelDark, { at: [0, 0.14, 0], size: [w - 0.3, 0.04, 0.05] }));
      // 下层置物板
      mb.box(m(MAT.woodDark, { at: [0, 0.36, 0], size: [w - 0.3, 0.04, d - 0.24], uv: 1.2 }));
      // 防静电台垫
      mb.box(m(MAT.paint, {
        at: [-1.35, h + 0.002, 0], size: [0.90, 0.004, 0.60],
        color: [0.055, 0.135, 0.175], rough: 0.9, uv: 3,
      }));
      mb.box(m(MAT.paint, {
        at: [-1.35, h + 0.0035, -0.26], size: [0.86, 0.001, 0.02],
        color: [0.30, 0.52, 0.62], rough: 0.6,
      }));
    },

    deskSmall(mb) {
      const w = 1.7, d = 0.72, h = 0.75;
      mb.box(m(MAT.wood, { at: [0, h - 0.02, 0], size: [w, 0.04, d], uv: 1.4, color: [0.75, 0.72, 0.7] }));
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mb.box(m(MAT.steelDark, {
            at: [sx * (w / 2 - 0.08), (h - 0.04) / 2, sz * (d / 2 - 0.08)], size: [0.05, h - 0.04, 0.05],
          }));
        }
      }
    },

    /* ---------------- 零件货架 ---------------- */
    shelf(mb) {
      const w = 3.6, d = 0.5, h = 2.05;
      const post = m(MAT.steelDark, { color: [0.20, 0.21, 0.23] });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mb.box(m(post, { at: [sx * (w / 2 - 0.04), h / 2, sz * (d / 2 - 0.04)], size: [0.05, h, 0.05] }));
        }
      }
      [0.42, 0.95, 1.48, 1.98].forEach((y) => {
        mb.box(m(MAT.steel, { at: [0, y, 0], size: [w, 0.03, d], uv: 2.2, color: [0.42, 0.43, 0.46] }));
        mb.box(m(post, { at: [0, y - 0.035, -d / 2 + 0.02], size: [w, 0.04, 0.02] }));
        mb.box(m(post, { at: [0, y + 0.06, -d / 2 + 0.01], size: [w, 0.09, 0.012], color: [0.25, 0.26, 0.28] }));
      });
      // 斜撑
      mb.pushTRS([0, 1.0, -d / 2 + 0.03], [0, 0, 0.52]);
      mb.box(m(post, { at: [0, 0, 0], size: [3.7, 0.03, 0.02] }));
      mb.pop();
    },

    chair(mb) {
      mb.cyl(m(MAT.steelDark, { at: [0, 0.02, 0], axis: 'y', r: 0.03, h: 0.04, segs: 10 }));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        mb.pushTRS([0, 0.06, 0], [0, a, 0]);
        mb.box(m(MAT.plastic, { at: [0, 0, 0.14], size: [0.05, 0.035, 0.28] }));
        mb.cyl(m(MAT.plastic, { at: [0, -0.03, 0.28], axis: 'x', r: 0.028, h: 0.03, segs: 10, color: [0.05, 0.05, 0.05] }));
        mb.pop();
      }
      mb.cyl(m(MAT.steel, { at: [0, 0.26, 0], axis: 'y', r: 0.028, h: 0.4, segs: 12 }));
      mb.box(m(MAT.fabric, { at: [0, 0.47, 0], size: [0.44, 0.07, 0.44], color: [0.9, 0.9, 0.95], uv: 5 }));
      mb.pushTRS([0, 0.72, -0.2], [-0.14, 0, 0]);
      mb.box(m(MAT.fabric, { at: [0, 0, 0], size: [0.42, 0.5, 0.06], color: [0.9, 0.9, 0.95], uv: 5 }));
      mb.pop();
    },

    /* ---------------- 灯具 ---------------- */
    ceilingLamp(mb) {
      mb.box(m(MAT.steel, { at: [0, 0, 0], size: [1.24, 0.07, 0.32], color: [0.5, 0.5, 0.52] }));
      mb.box(m(MAT.lamp, { at: [0, -0.045, 0], size: [1.16, 0.02, 0.26], emis: 2.4 }));
      for (const sx of [-1, 1]) {
        mb.cyl(m(MAT.steel, { at: [sx * 0.45, 0.12, 0], axis: 'y', r: 0.006, h: 0.24, segs: 6 }));
      }
    },

    deskLamp(mb) {
      mb.cyl(m(MAT.steelDark, { at: [0, 0.01, 0], axis: 'y', r: 0.09, h: 0.02, segs: 20 }));
      mb.pushTRS([0, 0.02, 0], [0, 0, -0.25]);
      mb.cyl(m(MAT.steel, { at: [0, 0.2, 0], axis: 'y', r: 0.012, h: 0.4, segs: 10 }));
      mb.pop();
      mb.pushTRS([0.11, 0.42, 0], [0, 0, 0.9]);
      mb.box(m(MAT.steel, { at: [0, 0, 0], size: [0.22, 0.05, 0.1], color: [0.3, 0.31, 0.33] }));
      mb.box(m(MAT.lamp, { at: [0, -0.028, 0], size: [0.19, 0.008, 0.08], emis: 2.0 }));
      mb.pop();
    },

    /* ---------------- 道具 ---------------- */
    toolbox(mb) {
      mb.box(m(MAT.plastic, { at: [0, 0.09, 0], size: [0.42, 0.18, 0.22], color: [0.85, 0.25, 0.12], rough: 0.5 }));
      mb.box(m(MAT.plastic, { at: [0, 0.2, 0], size: [0.42, 0.05, 0.22], color: [0.15, 0.15, 0.16] }));
      mb.pushTRS([0, 0.23, 0], [0, 0, 0]);
      mb.tube(m(MAT.plastic, {
        points: bezier([-0.1, 0, 0], [-0.08, 0.09, 0], [0.08, 0.09, 0], [0.1, 0, 0], 8),
        r: 0.012, sides: 6, color: [0.12, 0.12, 0.13],
      }));
      mb.pop();
      mb.box(m(MAT.steel, { at: [0, 0.135, 0.111], size: [0.06, 0.03, 0.006] }));
    },

    screwdriver(mb) {
      mb.cyl(m(MAT.plastic, { at: [0, 0, 0], axis: 'x', r: 0.016, h: 0.1, segs: 14, color: [0.85, 0.35, 0.05], rough: 0.4 }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        mb.pushTRS([0, 0, 0], [a, 0, 0]);
        mb.box(m(MAT.plastic, { at: [0, 0.016, 0], size: [0.1, 0.004, 0.006], color: [0.6, 0.25, 0.03] }));
        mb.pop();
      }
      mb.cyl(m(MAT.steel, { at: [0.11, 0, 0], axis: 'x', r: 0.004, h: 0.12, segs: 10 }));
      mb.box(m(MAT.steel, { at: [0.172, 0, 0], size: [0.012, 0.008, 0.002], color: [0.8, 0.8, 0.82] }));
    },

    mug(mb) {
      mb.cyl(m(MAT.tile, { at: [0, 0.045, 0], axis: 'y', r: 0.042, h: 0.09, segs: 20, color: [0.9, 0.92, 0.95], rough: 0.25 }));
      mb.cyl(m(MAT.tile, { at: [0, 0.078, 0], axis: 'y', r: 0.036, h: 0.004, segs: 18, color: [0.25, 0.14, 0.06], rough: 0.15 }));
      mb.pushTRS([0.05, 0.05, 0], [1.5708, 0, 0]);
      mb.tube(m(MAT.tile, {
        points: bezier([-0.005, 0, -0.02], [0.03, 0, -0.02], [0.03, 0, 0.02], [-0.005, 0, 0.02], 10),
        r: 0.006, sides: 6, color: [0.9, 0.92, 0.95], rough: 0.25,
      }));
      mb.pop();
    },

    crate(mb) {
      const s = 0.4;
      mb.box(m(MAT.paper, { at: [0, s / 2, 0], size: [s, s, s * 0.8], color: [0.72, 0.56, 0.36], rough: 0.9, uv: 2 }));
      mb.box(m(MAT.paper, { at: [0, s, 0], size: [s * 0.99, 0.01, s * 0.79], color: [0.62, 0.48, 0.30], rough: 0.9 }));
      mb.box(m(MAT.paper, { at: [0, s / 2, s * 0.4 + 0.001], size: [0.14, 0.08, 0.001], color: [0.95, 0.95, 0.92] }));
      mb.box(m(MAT.plastic, { at: [0, s * 0.75, s * 0.4 + 0.002], size: [s, 0.05, 0.001], color: [0.75, 0.72, 0.6], rough: 0.6 }));
    },

    notebook(mb) {
      mb.box(m(MAT.paper, { at: [0, 0.008, 0], size: [0.16, 0.016, 0.22], color: [0.55, 0.16, 0.12], rough: 0.75 }));
      mb.box(m(MAT.paper, { at: [0, 0.017, 0.005], size: [0.15, 0.003, 0.2], color: [1.0, 0.98, 0.92] }));
      mb.box(m(MAT.paper, { at: [-0.072, 0.009, 0], size: [0.012, 0.017, 0.21], color: [0.35, 0.09, 0.07] }));
    },

    rug(mb) {
      mb.box(m(MAT.fabric, { at: [0, 0.004, 0], size: [2.0, 0.008, 1.4], color: [0.9, 0.85, 0.8], uv: 3 }));
      mb.box(m(MAT.fabric, { at: [0, 0.007, 0], size: [1.8, 0.004, 1.2], color: [0.5, 0.6, 0.75], uv: 3 }));
    },

    clock(mb) {
      mb.cyl(m(MAT.plasticWhite, { at: [0, 0, 0], axis: 'z', r: 0.12, h: 0.035, segs: 24, color: [0.2, 0.2, 0.22] }));
      mb.cyl(m(MAT.white, { at: [0, 0, 0.019], axis: 'z', r: 0.105, h: 0.002, segs: 24, color: [0.95, 0.95, 0.93] }));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        mb.box(m(MAT.plastic, {
          at: [Math.cos(a) * 0.088, Math.sin(a) * 0.088, 0.021], size: [0.012, 0.012, 0.002], color: [0.1, 0.1, 0.1],
        }));
      }
      mb.pushTRS([0, 0, 0.023], [0, 0, 1.1]);
      mb.box(m(MAT.plastic, { at: [0, 0.028, 0], size: [0.008, 0.056, 0.002], color: [0.05, 0.05, 0.05] }));
      mb.pop();
      mb.pushTRS([0, 0, 0.025], [0, 0, -0.5]);
      mb.box(m(MAT.plastic, { at: [0, 0.038, 0], size: [0.006, 0.076, 0.002], color: [0.05, 0.05, 0.05] }));
      mb.pop();
    },

    /* ---------------- 外设 ---------------- */
    monitor(mb) {
      // 底座 + 支架
      mb.box(m(MAT.aluDark, { at: [0, 0.012, 0.02], size: [0.28, 0.024, 0.19], color: [0.22, 0.22, 0.24] }));
      mb.pushTRS([0, 0, 0], [0, 0, 0]);
      mb.box(m(MAT.aluDark, { at: [0, 0.16, 0.0], size: [0.07, 0.3, 0.05] }));
      mb.pop();
      // 面板
      mb.box(m(MAT.plastic, { at: [0, 0.5, -0.01], size: [0.62, 0.38, 0.022], color: [0.10, 0.10, 0.11], rough: 0.5 }));
      mb.box(m(MAT.plastic, { at: [0, 0.5, -0.026], size: [0.6, 0.36, 0.012], color: [0.07, 0.07, 0.08] }));
      mb.box(m(MAT.plastic, { at: [0, 0.315, -0.005], size: [0.62, 0.012, 0.03], color: [0.16, 0.16, 0.17] }));
      mb.cyl(m(MAT.plastic, { at: [0.26, 0.315, 0.007], axis: 'z', r: 0.004, h: 0.004, segs: 8, color: [0.3, 1.0, 0.5], emis: 0.0 }));
    },

    /** 屏幕面片（贴动态纹理，单独节点便于切换画面） */
    screen(mb, opt) {
      mb.quad({
        tex: opt.tex, points: [[-0.29, -0.165, 0], [0.29, -0.165, 0], [0.29, 0.165, 0], [-0.29, 0.165, 0]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.62, metal: 0, emis: opt.emis != null ? opt.emis : 1.0,
      });
    },

    keyboard(mb) {
      mb.box(m(MAT.aluDark, { at: [0, 0.008, 0], size: [0.42, 0.016, 0.14], color: [0.18, 0.18, 0.2] }));
      const cols = 15, rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const w = (r === 4 && c > 3 && c < 9) ? 0.0 : 1;
          if (!w) continue;
          mb.box(m(MAT.plastic, {
            at: [-0.19 + c * 0.0266, 0.019, -0.052 + r * 0.0255], size: [0.021, 0.008, 0.019],
            color: [0.12, 0.12, 0.13], rough: 0.6,
          }));
        }
      }
      mb.box(m(MAT.plastic, { at: [-0.02, 0.019, 0.05], size: [0.13, 0.008, 0.019], color: [0.12, 0.12, 0.13] }));
      mb.box(m(MAT.plastic, { at: [0.16, 0.0175, -0.052], size: [0.09, 0.004, 0.016], color: [0.2, 0.5, 0.9], emis: 0.5 }));
    },

    mouse(mb) {
      mb.sphere(m(MAT.plastic, { at: [0, 0.018, 0], r: 0.032, ry: 0.018, rz: 0.05, rings: 8, segs: 14, color: [0.12, 0.12, 0.13], rough: 0.45 }));
      mb.box(m(MAT.plastic, { at: [0, 0.032, -0.012], size: [0.006, 0.006, 0.02], color: [0.4, 0.6, 1.0], emis: 0.7 }));
    },

    /* ---------------- 展示牌 / 海报 ---------------- */
    plate(mb, opt) {
      mb.box(m(MAT.plastic, { at: [0, 0, 0], size: [opt.w + 0.006, opt.h + 0.006, 0.004], color: [0.08, 0.08, 0.09] }));
      mb.quad({
        tex: opt.tex, points: [
          [-opt.w / 2, -opt.h / 2, 0.0031], [opt.w / 2, -opt.h / 2, 0.0031],
          [opt.w / 2, opt.h / 2, 0.0031], [-opt.w / 2, opt.h / 2, 0.0031],
        ],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.55, emis: opt.emis || 0,
      });
    },

    poster(mb, opt) {
      mb.quad({
        tex: opt.tex, points: [
          [-opt.w / 2, -opt.h / 2, 0], [opt.w / 2, -opt.h / 2, 0],
          [opt.w / 2, opt.h / 2, 0], [-opt.w / 2, opt.h / 2, 0],
        ],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.7,
      });
      mb.box(m(MAT.woodDark, { at: [0, 0, -0.009], size: [opt.w + 0.02, opt.h + 0.02, 0.012] }));
    },

    /** 旧硬件（爷爷的收藏） */
    retroBoard(mb) {
      mb.box(m(MAT.pcb, { at: [0, 0, 0], size: [0.22, 0.004, 0.18], color: [1.4, 1.2, 0.7], uv: 2.5 }));
      mb.box(m(MAT.plastic, { at: [-0.05, 0.008, 0], size: [0.05, 0.012, 0.05], color: [0.6, 0.6, 0.62] }));
      for (let i = 0; i < 3; i++) {
        mb.box(m(MAT.plastic, { at: [0.06, 0.006, -0.05 + i * 0.05], size: [0.09, 0.008, 0.012], color: [0.5, 0.3, 0.1] }));
      }
      mb.cyl(m(MAT.alu, { at: [-0.05, 0.02, 0.06], axis: 'y', r: 0.012, h: 0.03, segs: 12, color: [0.4, 0.4, 0.45] }));
    },
  };

  root.MODELS_ROOM = { MAT, m, BUILDERS, R, screw, fanFrame, fanRotor, cache };
})(window);
