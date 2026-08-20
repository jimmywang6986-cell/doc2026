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
      // 窗玻璃 + 窗外城市天际线
      mb.box(m(MAT.glass, { at: [x - 0.01, 1.65, -0.65], size: [0.02, 1.16, 4.04] }));
      mb.quad({
        tex: 'label:skyline', color: [1, 1, 1], rough: 1, metal: 0, emis: 0.95,
        points: [[x + 0.9, 1.08, -2.65], [x + 0.9, 1.08, 1.35], [x + 0.9, 2.22, 1.35], [x + 0.9, 2.22, -2.65]],
        normal: [-1, 0, 0],
      });
      mb.box(m(MAT.sky, { at: [x + 1.0, 1.65, -0.65], size: [0.02, 1.3, 4.4], emis: 1.0, color: [0.72, 0.82, 1.0] }));
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

    /**
     * 第一人称手（局部：掌心在原点，手指指向 -Z，+X 为拇指侧）
     * opt.side: 1 = 右手, -1 = 左手；opt.grip: 0 松弛 1 握持
     */
    hand(mb, opt) {
      const side = opt && opt.side === -1 ? -1 : 1;
      const grip = opt && opt.grip != null ? opt.grip : 0;
      const skin = { tex: 'paint', color: [0.62, 0.44, 0.34], rough: 0.88, metal: 0 };
      const skinDark = m(skin, { color: [0.55, 0.38, 0.29] });
      const sleeve = { tex: 'fabric', color: [0.26, 0.36, 0.52], rough: 0.92, metal: 0 };

      // 袖口与小臂
      mb.box(m(sleeve, { at: [0, 0.004, 0.145], size: [0.088, 0.082, 0.20], uv: 6 }));
      mb.box(m(sleeve, { at: [0, 0.004, 0.052], size: [0.095, 0.090, 0.030], uv: 6, color: [0.20, 0.29, 0.44] }));
      // 手腕 + 手掌
      mb.box(m(skin, { at: [0, 0.002, 0.030], size: [0.070, 0.058, 0.030] }));
      mb.box(m(skin, { at: [0, 0, -0.028], size: [0.082, 0.048, 0.088] }));
      // 四指（两节，握持时向内弯）
      const bend = 0.30 + grip * 1.15;
      for (let i = 0; i < 4; i++) {
        const x = side * (-0.030 + i * 0.020);
        const len = i === 3 ? 0.040 : 0.048;
        mb.pushTRS([x, -0.004, -0.072], [bend * 0.55, 0, 0]);
        mb.box(m(skin, { at: [0, 0, -len / 2], size: [0.019, 0.021, len] }));
        mb.pushTRS([0, 0, -len], [bend * 0.85, 0, 0]);
        mb.box(m(skinDark, { at: [0, 0, -0.020], size: [0.018, 0.019, 0.040] }));
        mb.pop();
        mb.pop();
      }
      // 拇指
      mb.pushTRS([side * 0.044, -0.004, -0.014], [0.15, side * 0.55, side * -0.35]);
      mb.box(m(skin, { at: [0, 0, -0.024], size: [0.024, 0.024, 0.048] }));
      mb.pushTRS([0, 0, -0.048], [0.1 + grip * 0.7, 0, 0]);
      mb.box(m(skinDark, { at: [0, 0, -0.017], size: [0.022, 0.021, 0.034] }));
      mb.pop();
      mb.pop();
    },

    /* ---------------- 店内装饰 ---------------- */
    /** 工具挂板（洞洞板 + 挂着的工具） */
    pegboard(mb) {
      mb.box(m(MAT.wood, { at: [0, 0, 0], size: [1.5, 0.62, 0.018], uv: 2.5, color: [0.72, 0.62, 0.5] }));
      mb.box(m(MAT.woodDark, { at: [0, 0.315, 0.004], size: [1.54, 0.03, 0.03] }));
      mb.box(m(MAT.woodDark, { at: [0, -0.315, 0.004], size: [1.54, 0.03, 0.03] }));
      for (let x = -0.68; x <= 0.68; x += 0.062) {
        for (let y = -0.26; y <= 0.27; y += 0.062) {
          mb.cyl(m(MAT.plastic, { at: [x, y, 0.010], axis: 'z', r: 0.006, h: 0.004, segs: 6, color: [0.05, 0.05, 0.05] }));
        }
      }
      // 挂钩上的工具
      const tool = (x, y, w, h, col, r) => {
        mb.box(m(MAT.plastic, { at: [x, y, 0.028], size: [w, h, 0.022], color: col, rough: r != null ? r : 0.5 }));
      };
      for (let i = 0; i < 5; i++) {
        tool(-0.62 + i * 0.062, 0.14, 0.020, 0.16, [0.85, 0.42, 0.08]);
        mb.cyl(m(MAT.steel, { at: [-0.62 + i * 0.062, -0.02, 0.028], axis: 'y', r: 0.005, h: 0.12, segs: 8 }));
      }
      tool(-0.20, 0.10, 0.05, 0.20, [0.20, 0.22, 0.26], 0.35);   // 钳子
      tool(-0.08, 0.10, 0.05, 0.20, [0.55, 0.15, 0.12], 0.4);
      tool(0.06, 0.14, 0.12, 0.11, [0.25, 0.27, 0.30], 0.35);    // 扳手
      mb.cyl(m(MAT.plastic, { at: [0.28, 0.10, 0.03], axis: 'z', r: 0.055, h: 0.030, segs: 20, color: [0.85, 0.75, 0.25] })); // 胶带
      mb.cyl(m(MAT.plastic, { at: [0.28, 0.10, 0.032], axis: 'z', r: 0.018, h: 0.032, segs: 14, color: [0.15, 0.15, 0.16] }));
      // 零件盒
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plastic, {
          at: [-0.60 + i * 0.17, -0.20, 0.06], size: [0.15, 0.10, 0.10],
          color: [0.55, 0.58, 0.62], rough: 0.45, transparent: true, alpha: 0.72,
        }));
        mb.box(m(MAT.plastic, { at: [-0.60 + i * 0.17, -0.24, 0.111], size: [0.09, 0.03, 0.002], color: [0.9, 0.9, 0.88] }));
      }
      tool(0.50, -0.18, 0.14, 0.10, [0.15, 0.16, 0.18], 0.4);
      tool(0.50, 0.12, 0.09, 0.18, [0.30, 0.60, 0.35], 0.5);
    },

    /** 线材卷架 */
    spoolRack(mb) {
      mb.box(m(MAT.steelDark, { at: [0, 0, 0], size: [0.9, 0.05, 0.05] }));
      for (let i = 0; i < 4; i++) {
        const x = -0.33 + i * 0.22;
        mb.cyl(m(MAT.steel, { at: [x, -0.10, 0], axis: 'y', r: 0.006, h: 0.16, segs: 8 }));
        const col = [[0.10, 0.10, 0.11], [0.55, 0.12, 0.10], [0.12, 0.35, 0.55], [0.85, 0.80, 0.20]][i];
        for (let t = 0; t < 7; t++) {
          mb.cyl(m(MAT.rubber, {
            at: [x, -0.14 - t * 0.008, 0], axis: 'y', r: 0.055 - Math.abs(t - 3) * 0.004,
            h: 0.008, segs: 16, color: col,
          }));
        }
      }
    },

    /** 备用机箱（堆叠） */
    spareCase(mb) {
      mb.box(m(MAT.steelDark, { at: [0, 0.22, 0], size: [0.42, 0.44, 0.20], uv: 2, color: [0.13, 0.135, 0.15] }));
      mb.box(m(MAT.mesh, { at: [0.212, 0.22, 0], size: [0.004, 0.36, 0.16], uv: 6 }));
      mb.box(m(MAT.plastic, { at: [0, 0.445, 0], size: [0.40, 0.012, 0.19], color: [0.10, 0.10, 0.11] }));
      mb.box(m(MAT.paper, { at: [-0.212, 0.28, 0.04], size: [0.002, 0.10, 0.07], color: [0.9, 0.88, 0.8] }));
    },

    /** 老式 CRT 显示器（爷爷的收藏） */
    crt(mb) {
      mb.box(m(MAT.plasticWhite, { at: [0, 0.16, 0], size: [0.38, 0.32, 0.36], color: [0.72, 0.70, 0.62], rough: 0.6 }));
      mb.box(m(MAT.plasticWhite, { at: [0, 0.16, 0.185], size: [0.34, 0.28, 0.02], color: [0.66, 0.64, 0.57] }));
      mb.box(m(MAT.plastic, { at: [0, 0.17, 0.196], size: [0.28, 0.22, 0.006], color: [0.06, 0.07, 0.07], rough: 0.2 }));
      mb.box(m(MAT.plasticWhite, { at: [0, 0.02, 0], size: [0.34, 0.04, 0.32], color: [0.68, 0.66, 0.59] }));
      mb.cyl(m(MAT.plastic, { at: [0.12, 0.03, 0.19], axis: 'z', r: 0.012, h: 0.01, segs: 12, color: [0.3, 0.3, 0.3] }));
    },

    /** 工具车 */
    cart(mb) {
      const s = m(MAT.steelDark, { color: [0.22, 0.24, 0.28] });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mb.box(m(s, { at: [sx * 0.28, 0.36, sz * 0.19], size: [0.03, 0.72, 0.03] }));
          mb.cyl(m(MAT.rubber, { at: [sx * 0.28, 0.035, sz * 0.19], axis: 'x', r: 0.035, h: 0.02, segs: 12 }));
        }
      }
      for (const y of [0.24, 0.46, 0.70]) {
        mb.box(m(MAT.steel, { at: [0, y, 0], size: [0.60, 0.02, 0.40], uv: 2.5, color: [0.45, 0.47, 0.5] }));
        mb.box(m(s, { at: [0, y + 0.03, -0.19], size: [0.60, 0.05, 0.02] }));
      }
      mb.box(m(MAT.plastic, { at: [-0.14, 0.755, 0.02], size: [0.22, 0.09, 0.16], color: [0.75, 0.25, 0.12] }));
      mb.box(m(MAT.plastic, { at: [0.16, 0.735, -0.02], size: [0.18, 0.05, 0.14], color: [0.2, 0.22, 0.26] }));
      for (let i = 0; i < 3; i++) {
        mb.box(m(MAT.pcb, { at: [0.08 + i * 0.01, 0.48 + i * 0.006, 0.06], size: [0.20, 0.004, 0.16], color: [1.1, 1.1, 1.1], uv: 3 }));
      }
    },

    /** 绿植 */
    plant(mb) {
      mb.cyl(m(MAT.tile, { at: [0, 0.11, 0], axis: 'y', r: 0.15, r1: 0.18, h: 0.22, segs: 18, color: [0.72, 0.45, 0.32], rough: 0.6 }));
      mb.cyl(m(MAT.plastic, { at: [0, 0.225, 0], axis: 'y', r: 0.165, h: 0.02, segs: 18, color: [0.18, 0.13, 0.09] }));
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + i * 1.9;
        const h = 0.26 + ((i * 7) % 5) * 0.11;
        const lean = 0.35 + ((i * 3) % 4) * 0.12;
        mb.pushTRS([Math.cos(a) * 0.05, 0.24, Math.sin(a) * 0.05], [lean * Math.cos(a), -a, lean * Math.sin(a)]);
        mb.box(m(MAT.paint, { at: [0, h / 2, 0], size: [0.012, h, 0.012], color: [0.15, 0.30, 0.13], rough: 0.8 }));
        // 叶片：两片对生，稍微翘起
        for (const sx of [-1, 1]) {
          mb.pushTRS([sx * 0.055, h * 0.82, 0], [0, 0, sx * -0.5]);
          mb.box(m(MAT.paint, {
            at: [0, 0, 0], size: [0.13, 0.010, 0.075],
            color: [0.14, 0.38 + (i % 3) * 0.07, 0.15], rough: 0.75,
          }));
          mb.pop();
        }
        mb.box(m(MAT.paint, { at: [0, h + 0.03, 0], size: [0.05, 0.09, 0.03], color: [0.16, 0.44, 0.17], rough: 0.75 }));
        mb.pop();
      }
    },

    /** 霓虹灯招牌（自发光） */
    neon(mb, opt) {
      mb.box(m(MAT.plastic, { at: [0, 0, -0.01], size: [(opt && opt.w) || 0.62, (opt && opt.h) || 0.30, 0.02], color: [0.05, 0.05, 0.06] }));
      mb.quad({
        tex: opt.tex,
        points: [[-(opt.w || 0.62) / 2, -(opt.h || 0.30) / 2, 0.002], [(opt.w || 0.62) / 2, -(opt.h || 0.30) / 2, 0.002],
          [(opt.w || 0.62) / 2, (opt.h || 0.30) / 2, 0.002], [-(opt.w || 0.62) / 2, (opt.h || 0.30) / 2, 0.002]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.3, emis: 1.0,
      });
    },

    /** 桌下 LED 灯带 */
    ledStrip(mb, opt) {
      const len = (opt && opt.len) || 3.0;
      mb.box(m(MAT.plastic, { at: [0, 0, 0], size: [len, 0.02, 0.02], color: [0.15, 0.15, 0.16] }));
      mb.box(m(MAT.plasticWhite, {
        at: [0, -0.012, 0], size: [len - 0.04, 0.006, 0.016],
        color: (opt && opt.color) || [0.45, 0.72, 1.0], emis: 1.0, rough: 0.25,
      }));
    },

    /** 垃圾桶 */
    bin(mb) {
      mb.cyl(m(MAT.plastic, { at: [0, 0.16, 0], axis: 'y', r: 0.13, r1: 0.16, h: 0.32, segs: 18, color: [0.18, 0.20, 0.23], caps: false }));
      mb.cyl(m(MAT.plastic, { at: [0, 0.005, 0], axis: 'y', r: 0.13, h: 0.01, segs: 18, color: [0.15, 0.16, 0.18] }));
      mb.cyl(m(MAT.plastic, { at: [0, 0.315, 0], axis: 'y', r: 0.168, h: 0.014, segs: 18, color: [0.22, 0.24, 0.27] }));
      mb.box(m(MAT.paper, { at: [0.03, 0.33, 0.02], size: [0.10, 0.05, 0.09], color: [0.85, 0.83, 0.78] }));
    },

    /** 灭火器 */
    extinguisher(mb) {
      mb.cyl(m(MAT.paint, { at: [0, 0.22, 0], axis: 'y', r: 0.075, h: 0.36, segs: 16, color: [0.46, 0.05, 0.04], rough: 0.4 }));
      mb.cyl(m(MAT.paint, { at: [0, 0.42, 0], axis: 'y', r: 0.05, r1: 0.028, h: 0.05, segs: 14, color: [0.38, 0.05, 0.04] }));
      mb.cyl(m(MAT.steel, { at: [0, 0.46, 0], axis: 'y', r: 0.022, h: 0.04, segs: 12, color: [0.6, 0.6, 0.62] }));
      mb.box(m(MAT.steel, { at: [0, 0.485, 0.01], size: [0.05, 0.02, 0.09], color: [0.15, 0.15, 0.16] }));
      mb.box(m(MAT.paper, { at: [0, 0.24, 0.077], size: [0.09, 0.11, 0.002], color: [0.95, 0.93, 0.85] }));
      mb.tube(m(MAT.rubber, {
        points: bezier([0.05, 0.44, 0], [0.12, 0.36, 0.04], [0.10, 0.22, 0.06], [0.06, 0.14, 0.03], 8),
        r: 0.010, sides: 6,
      }));
    },

    /** 相框 */
    photo(mb, opt) {
      mb.box(m(MAT.woodDark, { at: [0, 0, -0.008], size: [(opt.w || 0.26) + 0.03, (opt.h || 0.20) + 0.03, 0.014] }));
      mb.quad({
        tex: opt.tex,
        points: [[-(opt.w || 0.26) / 2, -(opt.h || 0.20) / 2, 0], [(opt.w || 0.26) / 2, -(opt.h || 0.20) / 2, 0],
          [(opt.w || 0.26) / 2, (opt.h || 0.20) / 2, 0], [-(opt.w || 0.26) / 2, (opt.h || 0.20) / 2, 0]],
        normal: [0, 0, 1], color: [1, 1, 1], rough: 0.25,
      });
    },

    /** 插排与地面走线 */
    powerStrip(mb) {
      mb.box(m(MAT.plasticWhite, { at: [0, 0.018, 0], size: [0.34, 0.036, 0.075], color: [0.85, 0.85, 0.83], rough: 0.5 }));
      for (let i = 0; i < 4; i++) {
        mb.box(m(MAT.plastic, { at: [-0.12 + i * 0.08, 0.037, 0], size: [0.055, 0.004, 0.055], color: [0.2, 0.2, 0.21] }));
      }
      mb.box(m(MAT.plastic, { at: [0.145, 0.037, 0], size: [0.02, 0.006, 0.03], color: [0.9, 0.25, 0.15], emis: 0.6 }));
      mb.tube(m(MAT.rubber, {
        points: bezier([-0.17, 0.018, 0], [-0.4, 0.02, 0.1], [-0.7, 0.02, -0.1], [-1.0, 0.02, 0.05], 12),
        r: 0.008, sides: 6,
      }));
    },

    /** 木格栅背景墙 */
    slatWall(mb, opt) {
      const w = opt.w, h = opt.h;
      mb.box(m(MAT.woodDark, { at: [0, 0, -0.015], size: [w, h, 0.025], uv: 2, color: [0.22, 0.17, 0.13] }));
      for (let x = -w / 2 + 0.06; x <= w / 2 - 0.06; x += 0.115) {
        mb.box(m(MAT.wood, { at: [x, 0, 0.012], size: [0.055, h - 0.03, 0.03], uv: 2.2, color: [0.60, 0.42, 0.28] }));
      }
      mb.box(m(MAT.woodDark, { at: [0, h / 2, 0.014], size: [w, 0.05, 0.05], color: [0.26, 0.20, 0.15] }));
      mb.box(m(MAT.woodDark, { at: [0, -h / 2, 0.014], size: [w, 0.05, 0.05], color: [0.26, 0.20, 0.15] }));
    },

    /** 玻璃展示柜（内置灯带 + 展示硬件） */
    displayCase(mb) {
      const W = 1.25, H = 2.0, D = 0.42;
      const fr = m(MAT.steelDark, { color: [0.16, 0.17, 0.20], rough: 0.35 });
      // 立柱与横梁
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) mb.box(m(fr, { at: [sx * W / 2, H / 2, sz * D / 2], size: [0.05, H, 0.05] }));
      }
      for (const y of [0.02, H - 0.02]) {
        mb.box(m(fr, { at: [0, y, 0], size: [W, 0.05, D] }));
      }
      // 层板 + 灯带
      const shelves = [0.42, 0.86, 1.30, 1.72];
      for (const y of shelves) {
        mb.box(m(MAT.plastic, { at: [0, y, 0], size: [W - 0.06, 0.022, D - 0.06], color: [0.10, 0.11, 0.13], rough: 0.4 }));
        mb.box(m(MAT.plasticWhite, {
          at: [0, y + 0.018, D / 2 - 0.05], size: [W - 0.14, 0.008, 0.012],
          color: [0.55, 0.78, 1.0], emis: 1.0, rough: 0.3,
        }));
      }
      // 展品：显卡盒 / 处理器盒 / 内存 / 老 CPU
      const box = (x, y, z, sx, sy, sz, col) => mb.box(m(MAT.plastic, { at: [x, y, z], size: [sx, sy, sz], color: col, rough: 0.45 }));
      box(-0.32, 0.50, 0, 0.42, 0.14, 0.22, [0.12, 0.13, 0.16]);
      box(-0.32, 0.575, 0.01, 0.36, 0.012, 0.16, [0.20, 0.55, 0.85]);
      box(0.30, 0.52, 0, 0.26, 0.18, 0.20, [0.55, 0.13, 0.11]);
      box(-0.30, 0.94, 0, 0.30, 0.14, 0.20, [0.10, 0.35, 0.55]);
      box(0.28, 0.93, 0, 0.34, 0.12, 0.18, [0.16, 0.17, 0.20]);
      for (let i = 0; i < 4; i++) box(-0.42 + i * 0.24, 1.40, 0, 0.05, 0.16, 0.13, [0.35, 0.12, 0.45]);
      for (let i = 0; i < 3; i++) box(-0.34 + i * 0.32, 1.79, 0, 0.16, 0.10, 0.16, [0.70, 0.68, 0.55]);
      // 玻璃
      const g = m(MAT.glass, { alpha: 0.13, color: [0.10, 0.14, 0.18] });
      mb.box(m(g, { at: [0, H / 2, D / 2], size: [W - 0.05, H - 0.06, 0.012] }));
      for (const sx of [-1, 1]) mb.box(m(g, { at: [sx * W / 2, H / 2, 0], size: [0.012, H - 0.06, D - 0.05] }));
      mb.box(m(MAT.paper, { at: [0, H - 0.06, D / 2 + 0.012], size: [0.7, 0.10, 0.006], color: [0.9, 0.88, 0.82] }));
    },

    /** 沙发（等候区） */
    sofa(mb) {
      const f = m(MAT.fabric, { color: [0.28, 0.31, 0.38], rough: 0.95, uv: 2.2 });
      mb.box(m(f, { at: [0, 0.20, 0], size: [1.70, 0.26, 0.80] }));
      mb.box(m(f, { at: [0, 0.40, -0.30], size: [1.62, 0.16, 0.18], color: [0.33, 0.36, 0.44] }));
      for (const sx of [-1, 1]) {
        mb.box(m(f, { at: [sx * 0.41, 0.375, 0.05], size: [0.78, 0.10, 0.66], color: [0.34, 0.37, 0.45] }));
      }
      mb.box(m(f, { at: [0, 0.55, -0.36], size: [1.70, 0.60, 0.16] }));
      for (const sx of [-1, 1]) {
        mb.box(m(f, { at: [sx * 0.86, 0.42, 0], size: [0.14, 0.44, 0.80], color: [0.25, 0.28, 0.34] }));
        // 抱枕
        mb.box(m(f, { at: [sx * 0.55, 0.55, -0.20], size: [0.30, 0.30, 0.12], color: sx > 0 ? [0.60, 0.30, 0.22] : [0.22, 0.42, 0.40] }));
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) mb.cyl(m(MAT.woodDark, { at: [sx * 0.75, 0.035, sz * 0.32], axis: 'y', r: 0.03, h: 0.07, segs: 8 }));
      }
    },

    /** 茶几 */
    coffeeTable(mb) {
      mb.box(m(MAT.glass, { at: [0, 0.40, 0], size: [0.90, 0.02, 0.50], alpha: 0.22, color: [0.10, 0.16, 0.18] }));
      mb.box(m(MAT.woodDark, { at: [0, 0.18, 0], size: [0.80, 0.03, 0.42] }));
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) mb.box(m(MAT.woodDark, { at: [sx * 0.40, 0.20, sz * 0.21], size: [0.05, 0.40, 0.05] }));
      }
      mb.box(m(MAT.paper, { at: [0.16, 0.415, 0.03], size: [0.24, 0.008, 0.32], color: [0.88, 0.86, 0.8], rough: 0.6 }));
      mb.box(m(MAT.paper, { at: [0.12, 0.423, 0.00], size: [0.22, 0.008, 0.30], color: [0.75, 0.80, 0.86], rough: 0.6 }));
      mb.cyl(m(MAT.plasticWhite, { at: [-0.24, 0.455, 0], axis: 'y', r: 0.042, h: 0.09, segs: 16, color: [0.9, 0.9, 0.88] }));
    },

    /** 大地毯（等候区） */
    areaRug(mb, opt) {
      const w = opt.w, d = opt.d;
      mb.box(m(MAT.fabric, { at: [0, 0.006, 0], size: [w, 0.012, d], uv: 3, color: opt.color || [0.30, 0.26, 0.30] }));
      mb.box(m(MAT.fabric, { at: [0, 0.013, 0], size: [w - 0.16, 0.004, d - 0.16], uv: 3, color: opt.color2 || [0.22, 0.20, 0.26] }));
    },

    /** 壁挂电视（播放宣传画面） */
    wallTV(mb, opt) {
      const w = (opt && opt.w) || 1.30, h = (opt && opt.h) || 0.76;
      mb.box(m(MAT.plastic, { at: [0, 0, -0.03], size: [w, h, 0.05], color: [0.07, 0.07, 0.08] }));
      mb.box(m(MAT.plastic, { at: [0, 0, 0.001], size: [w - 0.03, h - 0.03, 0.012], color: [0.03, 0.03, 0.035], rough: 0.2 }));
      mb.quad({
        tex: opt.tex, color: [1, 1, 1], rough: 0.25, metal: 0, emis: 0.85,
        points: [[-w / 2 + 0.03, -h / 2 + 0.03, 0.009], [w / 2 - 0.03, -h / 2 + 0.03, 0.009],
          [w / 2 - 0.03, h / 2 - 0.03, 0.009], [-w / 2 + 0.03, h / 2 - 0.03, 0.009]],
        normal: [0, 0, 1],
      });
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
