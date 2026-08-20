/* 世界构建：房间、工作台、货架、灯光、机箱与全部可拾取零件 */
(function (root) {
  'use strict';

  const PI = Math.PI;
  const { Node } = root.SCENE;

  /** 关键世界坐标 */
  const W = {
    benchPos: [-0.6, 0, -2.92],
    benchTop: 0.95,
    casePos: [0.75, 0.95, -2.90],
    matPos: [-1.95, 0.958, -2.90],
    deskPos: [2.90, 0, -3.00],
    monitorPos: [2.90, 0.75, -3.16],
    shelfPos: [-3.90, 0, -0.30],
    playerStart: [2.45, 0, 2.50],
    playerYaw: 0.35,
    wallSocket: [0.80, 0.32, -3.37],
  };

  function build(scene) {
    const world = { W, parts: {}, nodes: {}, rotors: [], colliders: [], lights: {} };
    const add = (name, model, pos, rot, opts) => {
      const n = new Node(Object.assign({ name, model, pos, rot }, opts || {}));
      scene.add(n);
      return n;
    };
    const M = (name, opts) => root.MODELS.get(name, opts);

    /* ---------- 房间与家具 ---------- */
    add('room', M('room'), [0, 0, 0]);
    add('bench', M('bench'), W.benchPos);
    add('desk', M('deskSmall'), W.deskPos);
    add('shelf', M('shelf'), W.shelfPos, [0, PI / 2, 0]);
    add('chair', M('chair'), [1.85, 0, -1.55], [0, 0.9, 0]);
    add('crate1', M('crate'), [-3.60, 0, 2.55], [0, 0.3, 0]);
    add('crate2', M('crate'), [-3.05, 0, 2.80], [0, -0.2, 0]);
    add('crate3', M('crate'), [-3.55, 0.4, 2.55], [0, 0.9, 0]);
    add('toolbox', M('toolbox'), [-0.95, 0.95, -2.98], [0, 0.15, 0]);
    add('mug', M('mug'), [0.18, 0.95, -2.66], [0, 0, 0]);
    add('retro', M('retroBoard'), [-3.86, 1.998, 0.95], [0, 0.35, 0]);
    add('lamp1', M('ceilingLamp'), [-1.20, 2.72, -1.10]);
    add('lamp2', M('ceilingLamp'), [1.60, 2.72, 0.60]);
    add('deskLamp', M('deskLamp'), [-2.45, 0.95, -2.80], [0, -0.6, 0]);
    add('clock', M('clock'), [3.55, 2.25, -3.33], [0, 0, 0]);

    /* ---------- 店内装饰 ---------- */
    add('pegboard', M('pegboard'), [-2.30, 1.70, -3.33]);
    add('spoolRack', M('spoolRack'), [1.05, 1.35, -3.30]);
    add('cart', M('cart'), [-3.05, 0, -2.35], [0, 0.35, 0]);
    add('plant', M('plant'), [3.75, 0, 1.95], [0, 0.4, 0]);
    add('plant2', M('plant'), [-3.95, 0, 2.95], [0, -0.6, 0]);
    add('bin', M('bin'), [1.90, 0, -2.55], [0, 0.2, 0]);
    add('extinguisher', M('extinguisher'), [3.95, 0, 2.85], [0, -0.5, 0]);
    add('spare1', M('spareCase'), [-4.00, 0, 1.35], [0, 0.25, 0]);
    add('spare2', M('spareCase'), [-4.00, 0.46, 1.35], [0, -0.18, 0]);
    add('spare3', M('spareCase'), [-3.98, 0, 0.80], [0, -0.55, 0]);
    add('crt', M('crt'), [3.30, 0.75, -3.05], [0, -0.45, 0]);
    add('powerStrip', M('powerStrip'), [1.30, 0, -3.15], [0, 0.15, 0]);
    add('neon', M('neon', { tex: 'label:neonRepair', w: 0.64, h: 0.32 }), [-4.11, 2.05, 0.60], [0, PI / 2, 0]);
    add('photo', M('photo', { tex: 'label:photoGrandpa', w: 0.30, h: 0.23 }), [1.85, 1.72, -3.33]);
    add('calendar', M('photo', { tex: 'label:calendar', w: 0.26, h: 0.34 }), [2.45, 1.75, -3.33]);
    const led = add('led', M('ledStrip', { len: 3.6, color: [0.42, 0.70, 1.0] }), [-0.60, 0.855, -2.52]);
    led.emisMul = 0.7;
    const led2 = add('led2', M('ledStrip', { len: 1.5, color: [0.55, 0.45, 1.0] }), [2.90, 0.70, -2.68]);
    led2.emisMul = 0.55;

    // 木格栅背景墙 + 天花板灯槽 + 展示柜 + 等候区
    add('slatWall', M('slatWall', { w: 3.4, h: 2.4 }), [0.55, 1.42, -3.44]);
    const cove = [
      ['coveN', 3.4, [0, 2.72, -3.30], [0, 0, 0], [0.16, 0.46, 1.0]],
      ['coveS', 3.4, [0, 2.72, 3.30], [0, 0, 0], [0.45, 0.20, 1.0]],
      ['coveW', 6.4, [-3.86, 2.72, 0], [0, PI / 2, 0], [1.0, 0.14, 0.42]],
      ['coveE', 6.4, [3.86, 2.72, 0], [0, PI / 2, 0], [0.14, 0.80, 0.95]],
    ];
    for (const c of cove) {
      const n = add(c[0], M('ledStrip', { len: c[1], color: c[4] }), c[2], c[3]);
      n.emisMul = 0.45;
    }
    add('wallTV', M('wallTV', { tex: 'label:tvAd', w: 1.4, h: 0.82 }), [-1.30, 1.80, 3.37], [0, PI, 0]);
    add('displayCase', M('displayCase'), [-3.55, 0, 3.15], [0, 0.55, 0]);
    add('sofa', M('sofa'), [1.15, 0, 2.95], [0, PI, 0]);
    add('coffeeTable', M('coffeeTable'), [1.15, 0, 2.05], [0, 0, 0]);
    add('rug', M('areaRug', { w: 3.0, d: 2.2, color: [0.26, 0.22, 0.26], color2: [0.19, 0.17, 0.22] }), [1.15, 0, 2.45]);

    /* ---------- 墙面教学海报 ---------- */
    add('posterFlow', M('poster', { tex: 'label:posterFlow', w: 0.62, h: 0.88 }), [-2.05, 1.78, -3.33]);
    add('posterAir', M('poster', { tex: 'label:posterAirflow', w: 0.70, h: 0.52 }), [0.90, 1.85, -3.33]);
    add('whiteboard', M('poster', { tex: 'label:whiteboard', w: 1.00, h: 0.70 }), [-0.55, 1.80, -3.33]);
    add('posterStatic', M('poster', { tex: 'label:posterStatic', w: 0.46, h: 0.62 }), [-4.13, 1.55, -1.40], [0, PI / 2, 0]);
    add('sign', M('poster', { tex: 'label:shopSign', w: 1.10, h: 0.32 }), [2.50, 2.55, 3.33], [0, PI, 0]);

    /* ---------- 外设 ---------- */
    add('monitor', M('monitor'), W.monitorPos);
    add('keyboard', M('keyboard'), [2.85, 0.752, -2.80], [0, 0.02, 0]);
    add('mouse', M('mouse'), [3.28, 0.752, -2.82], [0, -0.1, 0]);
    const screen = add('screen', M('screen', { tex: 'dyn:monitor' }),
      [W.monitorPos[0], W.monitorPos[1] + 0.50, W.monitorPos[2] + 0.004]);
    screen.emisMul = 0;
    world.nodes.screen = screen;

    /* ---------- 爷爷的装机手记 ---------- */
    const notebook = add('notebook', M('notebook'), [-0.52, 0.952, -2.72], [0, 0.4, 0]);
    notebook.data.interact = { type: 'notebook', label: '爷爷的《装机手记》', key: 'E' };
    world.nodes.notebook = notebook;

    /* ---------- 机箱 ---------- */
    const caseNode = add('case', M('pcCase'), W.casePos.slice(), [0, 0, 0]);
    world.nodes.case = caseNode;
    // 电源指示灯（前面板）
    const powerLed = new Node({
      name: 'powerLed', model: M('ledDot', { color: [0.45, 0.85, 1.0], axis: 'x', r: 0.004 }),
      pos: [0.2415, 0.43, 0.04],
    });
    powerLed.emisMul = 0;
    caseNode.add(powerLed);
    world.nodes.powerLed = powerLed;
    caseNode.data.interact = { type: 'power', label: '按下电源键', key: 'E', pos: [0.245, 0.43, 0.04] };

    /* ---------- 灯光 ---------- */
    scene.sun.dir = root.MATH3D.V3.norm([0, 0, 0], [0.80, 0.52, 0.14]);
    scene.sun.color = [3.1, 2.85, 2.5];
    scene.sun.focus = [-0.4, 1.1, -2.0];
    scene.sun.extent = 3.6;
    scene.lights.push({ pos: [-1.20, 2.62, -1.10], color: [1.0, 0.96, 0.90], intensity: 13, range: 9 });
    scene.lights.push({ pos: [1.60, 2.62, 0.60], color: [1.0, 0.96, 0.90], intensity: 12, range: 9 });
    scene.lights.push({ pos: [-1.30, 2.10, -2.45], color: [1.0, 0.97, 0.92], intensity: 6, range: 4.5 });
    scene.lights.push({ pos: [0.80, 1.95, -2.35], color: [1.0, 0.97, 0.94], intensity: 5, range: 3.6 });
    const lampLight = { pos: [-2.32, 1.34, -2.76], color: [1.0, 0.86, 0.62], intensity: 1.5, range: 2.8 };
    scene.lights.push(lampLight);
    const screenLight = { pos: [2.90, 1.25, -2.92], color: [0.55, 0.72, 1.0], intensity: 0, range: 2.6 };
    scene.lights.push(screenLight);
    const rgbLight = { pos: [0.80, 1.16, -2.84], color: [0.50, 0.72, 1.0], intensity: 0, range: 1.6 };
    scene.lights.push(rgbLight);
    world.lights = { lamp: lampLight, screen: screenLight, rgb: rgbLight, rgb2: { intensity: 0 } };

    /* ---------- 碰撞体 ---------- */
    const box = (x0, y0, z0, x1, y1, z1) => ({ min: [x0, y0, z0], max: [x1, y1, z1] });
    world.colliders.push(
      box(-4.3, 0, -3.5, 4.3, 3.0, -3.28),   // 后墙
      box(-4.3, 0, 3.28, 1.95, 3.0, 3.5),    // 前墙（左段）
      box(3.05, 0, 3.28, 4.3, 3.0, 3.5),     // 前墙（右段）
      box(-4.3, 0, -3.5, -4.08, 3.0, 3.5),   // 左墙
      box(4.08, 0, -3.5, 4.3, 3.0, 3.5),     // 右墙
      box(-2.75, 0, -3.36, 1.50, 0.95, -2.47),  // 工作台
      box(2.03, 0, -3.38, 3.77, 0.75, -2.62),   // 显示器桌
      box(-4.16, 0, -2.12, -3.62, 2.05, 1.52),  // 货架
      box(1.55, 0, -1.85, 2.15, 0.60, -1.25),   // 椅子
      box(-3.40, 0, -2.60, -2.70, 0.75, -2.10), // 工具车
      box(-4.16, 0, 0.55, -3.80, 0.92, 1.62),   // 备用机箱堆
      box(1.72, 0, -2.72, 2.08, 0.35, -2.38),   // 垃圾桶
      box(-4.00, 0, 2.75, -2.95, 2.00, 3.60),   // 展示柜
      box(0.20, 0, 2.50, 2.10, 0.90, 3.45),     // 沙发
      box(0.70, 0, 1.78, 1.60, 0.45, 2.32),     // 茶几
      box(-3.85, 0, 2.30, -3.35, 0.85, 2.80),   // 纸箱
      box(-3.30, 0, 2.55, -2.80, 0.45, 3.05),
    );

    /* ---------- 零件实例 ---------- */
    for (const def of root.PARTS_DB.PARTS) {
      const node = new Node({
        name: 'part:' + def.id,
        model: M(def.model, def.modelOpts),
        pos: def.shelf.slice(),
        rot: (def.shelfRot || [0, 0, 0]).slice(),
      });
      if (def.id === 'ram1' || def.id === 'ram2' || def.id === 'gpu'
        || def.kind === 'fan') node.emisMul = 0;
      scene.add(node);
      const children = [];
      for (const c of (def.children || [])) {
        const cn = new Node({ name: 'sub', model: M(c.model), pos: c.pos.slice(), rot: c.rot.slice() });
        if (c.spin != null) {
          cn.spin = { axis: c.spin, speed: 0, angle: Math.random() * 6 };
          world.rotors.push(cn);
        }
        node.add(cn);
        children.push(cn);
      }
      const part = { def, node, children, state: 'shelf', inspected: false };
      world.parts[def.id] = part;

      // 货架标签牌
      if (def.shelf[0] < -3.5) {
        root.LABELS.partPlate(def.name, def.cat + ' · ' + (def.full || ''));
        const plate = add('plate:' + def.id,
          M('plate', { tex: 'label:plate:' + def.name, w: 0.14, h: 0.035 }),
          [def.shelf[0] + 0.235, def.shelf[1] + 0.06, def.shelf[2]], [0, PI / 2, 0]);
        plate.data.plateFor = def.id;
      }
    }

    /* ---------- 主板 Debug LED ---------- */
    const mbPart = world.parts.mb;
    const dbg = new Node({
      name: 'dbgLed', model: M('ledDots'),
      pos: [root.MODELS_HW.MB_L.postLed[0], root.MODELS_HW.MB_L.postLed[1], 0.0028],
    });
    dbg.emisMul = 0;
    mbPart.node.add(dbg);
    world.nodes.dbgLed = dbg;

    return world;
  }

  /** 通电后的外部连线（显示器 / 键鼠 / 市电） */
  function externalCablePaths() {
    const gpuOut = [0.545, 1.145, -2.96];
    const psuIec = [0.520, 0.990, -2.945];
    return {
      paths: [
        {
          a: gpuOut, c1: [0.30, 0.80, -3.25], c2: [2.10, 0.72, -3.34], b: [2.90, 1.09, -3.22],
          r: 0.0042, strands: 1, steps: 24, color: [0.05, 0.05, 0.06],
          plugA: [0.014, 0.012, 0.008], plugB: [0.014, 0.012, 0.008],
        },
        {
          a: [0.520, 1.235, -2.955], c1: [0.60, 0.90, -3.30], c2: [2.30, 0.78, -3.32], b: [2.83, 0.762, -2.86],
          r: 0.0026, strands: 1, steps: 24, color: [0.06, 0.06, 0.07],
        },
        {
          a: [0.520, 1.215, -2.955], c1: [0.70, 0.88, -3.32], c2: [2.60, 0.78, -3.30], b: [3.26, 0.762, -2.88],
          r: 0.0026, strands: 1, steps: 24, color: [0.06, 0.06, 0.07],
        },
        {
          a: psuIec, c1: [0.40, 0.70, -3.30], c2: [0.70, 0.45, -3.36], b: W.wallSocket,
          r: 0.0045, strands: 1, steps: 20, color: [0.04, 0.04, 0.05],
          plugA: [0.016, 0.016, 0.012],
        },
      ],
    };
  }

  root.WORLD = { build, W, externalCablePaths };
})(window);
