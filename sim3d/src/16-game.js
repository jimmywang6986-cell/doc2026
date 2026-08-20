/* 游戏主逻辑：拾取与安装、前置条件教学、剧情推进、点亮与验收 */
(function (root) {
  'use strict';

  const { M4, V3, clamp, lerp, smooth, damp } = root.MATH3D;
  const PI = Math.PI;

  /* 章节定义 */
  const CHAPTERS = [
    { id: 1, title: '第一章 · 接手爷爷的店' },
    { id: 2, title: '第二章 · 板外平台（在防静电垫上装）' },
    { id: 3, title: '第三章 · 主板入箱' },
    { id: 4, title: '第四章 · 电源 / 显卡 / 存储 / 风扇' },
    { id: 5, title: '第五章 · 走线与合盖' },
    { id: 6, title: '第六章 · 点亮、BIOS 与交付' },
  ];

  /* 章节剧情 */
  const STORY = {
    intro: [
      { who: '', text: '2026 年 8 月，城南老巷。爷爷的「星海电脑维修部」在他走后关了三个月。', color: '#9fb0c0' },
      { who: '你', text: '钥匙还是那把黄铜的……门口的招牌该擦一擦了。' },
      { who: '', text: '柜台上压着一张手写的订单，和一本卷了边的《装机手记》。', color: '#9fb0c0' },
      { who: '订单', text: '客户：柯小雨（高一）。用途：编程竞赛训练机。<br>备注：孩子省了一年零花钱，务必装稳当。', color: '#ffd479' },
      { who: '你', text: '爷爷，这单我接了。' },
      { who: '系统', text: '按 <b>E</b> 翻开《装机手记》，它会一步步教你。<br>走到左边货架，用 <b>F</b> 查看零件资料。', color: '#7fd2ff' },
    ],
    ch1done: [
      { who: '装机手记', text: '“装机不是拼积木，是给每一个零件找到它该在的位置。”', color: '#ffd479' },
      { who: '装机手记', text: '“第一步永远是：把主板放到防静电垫上。别嫌麻烦，静电杀人于无形。”', color: '#ffd479' },
      { who: '系统', text: '第二章开始：在防静电垫上完成 CPU、内存、M.2、硅脂与散热器。', color: '#7fd2ff' },
    ],
    ch2done: [
      { who: '你', text: '平台搭好了。CPU、内存、固态、散热器——手感都对。' },
      { who: '装机手记', text: '“铜柱先装，主板后进。少一颗会弯板，多一颗会短路。”', color: '#ffd479' },
    ],
    ch3done: [
      { who: '你', text: '主板稳稳落在铜柱上，九颗螺丝都到位了。' },
      { who: '系统', text: '接下来装电源、显卡、硬盘和风扇。注意风扇方向：前进后出。', color: '#7fd2ff' },
    ],
    ch4done: [
      { who: '你', text: '硬件都进箱了。现在是最考验耐心的一步——走线。' },
      { who: '装机手记', text: '“线走得好不好，决定了三年后你还愿不愿意打开这台机器。”', color: '#ffd479' },
    ],
    ch5done: [
      { who: '你', text: '侧板合上了。整机第一次通电，永远是最紧张的一刻。' },
      { who: '系统', text: '接好显示器（一定插显卡）、键鼠和市电，然后按下电源键。', color: '#7fd2ff' },
    ],
    post: [
      { who: '', text: '风扇同时启动，机箱里亮起一圈青蓝色的光。显示器闪了一下——自检画面出来了。', color: '#9fb0c0' },
      { who: '你', text: '点亮了。爷爷，一次点亮。' },
      { who: '系统', text: '走到显示器前，按 <b>E</b> 进入 BIOS，把内存的 XMP 打开。', color: '#7fd2ff' },
    ],
    afterBios: [
      { who: '系统', text: 'XMP 已保存，机器会重启一次并开始安装系统。稍等一会儿。', color: '#7fd2ff' },
    ],
    ending: [
      { who: '', text: '三天后，柯小雨抱着显示器来取机。她盯着机箱里那圈光看了很久。', color: '#9fb0c0' },
      { who: '柯小雨', text: '哥，它开机只要 8 秒！编译速度比学校机房快好多！', color: '#ffb3d1' },
      { who: '你', text: '记住三件事：别堵住前面板进风、每年清一次灰、重要数据一定要备份。' },
      { who: '', text: '送走客人，你在《装机手记》最后一页发现了爷爷的字。', color: '#9fb0c0' },
      { who: '装机手记', text: '“电脑会旧，会坏，会被淘汰。但把它装好的那双手，会一直记得每一个零件的位置。”', color: '#ffd479' },
      { who: '装机手记', text: '“——给接过这把螺丝刀的人。”', color: '#ffd479' },
    ],
  };

  /* 前置条件被挡住时的教学提示 */
  const BLOCK_MSG = {
    cpu_in: '主板还没放到防静电垫上。带静电的手直接碰针脚，损伤是不可逆的。',
    ram_a2: '先把主板放到防静电垫上再装内存。',
    m2_in: '先把主板放到防静电垫上。',
    m2hs_in: '固态还没装，先装 M.2 硬盘再盖马甲。',
    paste_in: 'CPU 还没装。硅脂是涂在 CPU 顶盖上的，不是涂在插座里。',
    cooler_in: '先涂硅脂、装好内存，再压散热器——否则要整个拆下来重做。',
    ram_b2: '先装 A2 那条，再装 B2，方便检查双通道。',
    mb_case: '机箱里还没装铜柱！主板直接贴在钣金上，通电瞬间就是短路。',
    mb_screw: '主板还没入箱，没有可拧的螺丝孔。',
    psu_in: '先把主板固定好，再装电源，否则线材会挡住螺丝孔。',
    gpu_in: '主板还没上螺丝固定，插显卡会把主板顶弯。',
    ssd_in: '先固定主板。',
    hdd_in: '先固定主板。',
    fan_f1: '先固定主板，再装风扇。',
    fan_f2: '先装好第一把前部风扇。',
    fan_r: '先装好两把前部进风风扇。',
    c24_in: '需要先装好电源和主板才能接 24pin。',
    ceps_in: '需要先装好电源和主板。',
    cpcie_in: '显卡和电源都装好之后才能接 PCIe 供电。',
    csata_in: '硬盘和电源都要先装好。',
    cfp_in: '主板固定好之后再接前面板跳线。',
    cfan_in: '三把机箱风扇都装好之后再统一接线。',
    antenna_in: '主板还没入箱固定。',
    panel_in: '箱内还有线没接完，先把 24pin / EPS / PCIe / SATA / 前面板 / 风扇线接完再合盖。',
    cext_in: '先把侧板装回去，再接外设——理线不合盖等于没做风道。',
    power_on: '外设与市电还没接好。',
    bios_xmp: '还没点亮，先按电源键。',
  };

  const G = {
    steps: [],
    doneSteps: Object.create(null),
    cards: [],
    mistakes: 0,
    inspected: 0,
    held: null,
    chapter: 1,
    started: false,
    powered: false,
    xmp: false,
    fanLevel: 0,
    score: 0,
    animations: [],
    startTime: 0,
    phase: 'idle',
    dev: /[?&]dev=1/.test(location.search),

    /* ---------------- 初始化 ---------------- */
    async init() {
      const canvas = document.getElementById('gl');
      root.UI.init(this);
      root.UI.showLoading('正在初始化渲染器…');
      try {
        root.RENDER.init(canvas);
      } catch (e) {
        root.UI.fatal('无法创建 WebGL2 上下文：' + e.message
          + '<br><br>请使用较新的 Chrome / Edge / Firefox，并确认已启用硬件加速。');
        return;
      }
      const gl = root.RENDER.gl;
      root.TEX.init(gl);
      root.MODELS.init(gl);
      await this.tick('正在生成材质…');
      root.LABELS_INIT();
      await this.tick('正在生成零件模型…');
      root.SCREENS.init(gl);
      this.scene = new root.SCENE.Scene();
      await this.tick('正在搭建店铺场景…');
      this.world = root.WORLD.build(this.scene);
      this.player = new root.PLAYER.Player(root.WORLD.W.playerStart, root.WORLD.W.playerYaw);
      this.player.colliders = this.world.colliders;

      this.ghost = new root.SCENE.Node({ name: 'ghost', visible: false, noShadow: true, alpha: 0.34 });
      this.ghost.tint = [0.35, 0.95, 1.0];
      this.ghost.tintStrength = 0.85;
      this.scene.add(this.ghost);

      this.buildStepList();
      root.PLAYER.Input.init(canvas, (code, e, repeat) => this.onKey(code, e, repeat));
      canvas.addEventListener('click', () => {
        root.AUDIO.init(); root.AUDIO.resume();
        if (this.started && !root.PLAYER.Input.blocked && !root.UI.modalOpen) this.lockPointer();
      });
      window.addEventListener('resize', () => this.onResize());
      this.onResize();
      root.SCREENS.set('off');

      await this.tick('准备就绪');
      root.UI.hideLoading();
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
    },

    tick(msg) {
      root.UI.showLoading(msg);
      return new Promise((r) => setTimeout(r, 16));
    },

    buildStepList() {
      const pseudo1 = [
        { id: 'read_notebook', chapter: 1, special: 'notebook', title: '翻开爷爷的《装机手记》', hint: '柜台工作台上，按 E 打开' },
        {
          id: 'inspect3', chapter: 1, special: 'inspect', count: 3, requires: ['read_notebook'],
          title: '在货架前查看任意 3 个零件的资料', hint: '准星指向零件，按 F 打开资料卡',
        },
      ];
      const pseudo6 = [
        { id: 'power_on', chapter: 6, special: 'power', requires: ['cext_in'], title: '按下机箱电源键', hint: '前面板圆形按键，按 E' },
        { id: 'bios_xmp', chapter: 6, special: 'bios', requires: ['power_on'], title: '进入 BIOS 开启内存 XMP', hint: '走到显示器前按 E' },
        { id: 'os_install', chapter: 6, special: 'os', requires: ['bios_xmp'], title: '等待系统安装完成', hint: '安装过程会自动进行' },
        { id: 'bench', chapter: 6, special: 'bench', requires: ['os_install'], title: '跑分验收并交付整机', hint: '走到显示器前按 E' },
      ];
      this.steps = pseudo1.concat(root.PARTS_DB.STEPS, pseudo6);
      this.stepById = Object.create(null);
      for (const s of this.steps) this.stepById[s.id] = s;
    },

    start() {
      this.started = true;
      root.AUDIO.init();
      root.AUDIO.resume();
      root.UI.hideTitle();
      root.UI.setKeyHints('<b>WASD</b> 移动 · <b>E</b> 交互 · <b>F</b> 资料 · <b>Q</b> 放回 · <b>Tab</b> 手册 · <b>Esc</b> 暂停');
      this.startTime = performance.now();
      root.UI.dialogue(STORY.intro, () => this.lockPointer());
    },

    restart() { location.reload(); },

    /** 指针锁定：部分环境（无头浏览器 / 无用户手势）会抛错，忽略即可 */
    lockPointer() {
      const c = document.getElementById('gl');
      if (!c || !c.requestPointerLock) return;
      try {
        const r = c.requestPointerLock();
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch (e) { /* 忽略 */ }
    },

    onResize() {
      const canvas = document.getElementById('gl');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      root.RENDER.resize(canvas.width, canvas.height);
    },

    /* ---------------- 步骤与目标 ---------------- */
    isDone(id) { return !!this.doneSteps[id]; },

    reqMet(step) {
      for (const r of (step.requires || [])) if (!this.isDone(r)) return false;
      return true;
    },

    currentStep() {
      for (const s of this.steps) {
        if (this.isDone(s.id)) continue;
        if (!this.reqMet(s)) continue;
        return s;
      }
      return null;
    },

    stepsOfChapter(ch) { return this.steps.filter((s) => s.chapter === ch); },

    chapterDone(ch) { return this.stepsOfChapter(ch).every((s) => this.isDone(s.id)); },

    completeStep(step) {
      if (this.isDone(step.id)) return;
      this.doneSteps[step.id] = true;
      const total = this.steps.length;
      const done = Object.keys(this.doneSteps).length;
      root.UI.toast('✔ 完成：' + step.title, 'good');
      this.updateHud();
      // 章节推进
      for (const c of CHAPTERS) {
        if (this.chapter === c.id && this.chapterDone(c.id)) {
          const key = 'ch' + c.id + 'done';
          this.chapter = Math.min(6, c.id + 1);
          if (STORY[key]) setTimeout(() => root.UI.dialogue(STORY[key]), 700);
          break;
        }
      }
      if (done === total) setTimeout(() => this.finish(), 900);
    },

    showLesson(step, part) {
      const lesson = step.lesson || (step.lessonKey && root.PARTS_DB.partById[step.lessonKey]
        ? root.PARTS_DB.partById[step.lessonKey].lesson : (part && part.def.lesson));
      if (!lesson) return;
      if (this.cards.indexOf(lesson.title) < 0) this.cards.push(lesson.title);
      root.UI.card(lesson);
    },

    /* ---------------- 拾取 / 放回 ---------------- */
    pendingStepFor(kind) {
      for (const s of this.steps) {
        if (this.isDone(s.id) || s.special) continue;
        if (s.accept === kind) return s;
      }
      return null;
    },

    /** 可拾取：仍在货架上，或是可重复搬动的零件（主板）且还有用得上它的步骤 */
    canPickup(part) {
      if (part === this.held) return false;
      if (part.state === 'shelf') return !!this.pendingStepFor(part.def.kind);
      if (part.state === 'installed' && part.def.movable) return !!this.pendingStepFor(part.def.kind);
      return false;
    },

    pickup(part) {
      if (this.held) this.dropHeld(true);
      this.held = part;
      part.state = 'held';
      part.node.visible = true;
      root.AUDIO.play('pickup');
      root.UI.setHeld(part.def.name, part.def.cat);
      const step = this.pendingStepFor(part.def.kind);
      if (step) root.UI.toast('目标：' + step.title + (step.hint ? '（' + step.hint + '）' : ''), 'info');
    },

    dropHeld(silent) {
      const p = this.held;
      if (!p) return;
      this.held = null;
      p.state = 'shelf';
      p.node.matrixOverride = null;
      if (p.node.parent !== this.scene.root) this.scene.root.add(p.node);
      p.node.pos = p.def.shelf.slice();
      p.node.rot = (p.def.shelfRot || [0, 0, 0]).slice();
      root.UI.setHeld(null);
      if (!silent) root.UI.toast('已放回原位：' + p.def.name, 'info');
    },

    /* ---------------- 安装 ---------------- */
    resolveParent(name) {
      if (name === 'case') return this.world.nodes.case;
      if (name === 'mb') return this.world.parts.mb.node;
      return this.scene.root;
    },

    /** 当前手持零件对应的可安装步骤（含被阻挡的情况） */
    targetStepForHeld() {
      const held = this.held;
      if (!held) return null;
      for (const s of this.steps) {
        if (this.isDone(s.id) || s.special) continue;
        if (s.accept !== held.def.kind) continue;
        return s;
      }
      return null;
    },

    anchorWorld(step) {
      const parent = this.resolveParent(step.anchor.parent);
      return M4.xformPoint([0, 0, 0], parent.world, step.anchor.pos);
    },

    tryInstall(step) {
      const part = this.held;
      if (!part) return;
      if (!this.reqMet(step)) {
        this.deny(BLOCK_MSG[step.id] || '前置步骤还没完成。');
        return;
      }
      const parent = this.resolveParent(step.anchor.parent);
      const node = part.node;

      if (step.keepPart) {
        // 工具类（硅脂、螺丝刀）：不消耗手持零件，只生成安装结果
        this.spawnFrom(step);
        root.AUDIO.play(step.sound || 'click');
        this.completeStep(step);
        this.showLesson(step, part);
        return;
      }

      // 计算从当前世界位置到目标局部位置的过渡
      const worldPos = [node.world[12], node.world[13], node.world[14]];
      const inv = M4.invert(M4.create(), parent.world);
      const startLocal = M4.xformPoint([0, 0, 0], inv, worldPos);
      const approach = step.approach || [0, 0, 0.06];
      const target = step.anchor.pos.slice();

      node.matrixOverride = null;
      // 同一节点只保留最新的安装动画
      this.animations = this.animations.filter((a) => a.node !== node);
      parent.add(node);
      node.rot = (step.anchor.rot || [0, 0, 0]).slice();
      node.pos = startLocal;

      if (step.installOpts && part.def.installModel) {
        node.model = root.MODELS.get(part.def.installModel, step.installOpts);
        node.pos = target.slice();
        node.alpha = 0.05;
        this.animations.push({ t: 0, dur: 0.35, kind: 'fade', node });
      } else if (step.externalCables) {
        node.model = root.MODELS.get('cableRun', root.WORLD.externalCablePaths());
        node.pos = [0, 0, 0];
        node.alpha = 0.05;
        this.animations.push({ t: 0, dur: 0.4, kind: 'fade', node });
      } else {
        const mid = [target[0] + approach[0], target[1] + approach[1], target[2] + approach[2]];
        this.animations.push({
          t: 0, dur: 0.34, kind: 'slide', node,
          a: startLocal.slice(), m: mid, b: target.slice(),
        });
      }

      this.held = null;
      part.state = 'installed';
      root.UI.setHeld(null);
      root.AUDIO.play(step.sound || 'click');
      root.RENDER.flash = 0.05;
      if (part.def.kind === 'fan' || part.def.id === 'gpu' || part.def.kind === 'ram') {
        node.emisMul = this.powered ? 0.55 : 0;
      }
      this.spawnFrom(step);
      this.completeStep(step);
      this.showLesson(step, part);
    },

    spawnFrom(step) {
      if (!step.spawn) return;
      const parent = this.resolveParent(step.spawn.parent);
      const n = new root.SCENE.Node({
        name: 'spawn:' + step.id,
        model: root.MODELS.get(step.spawn.model, step.spawn.opts),
        pos: step.spawn.pos.slice(),
        rot: (step.spawn.rot || [0, 0, 0]).slice(),
      });
      parent.add(n);
      this.scene.markDirty();
    },

    deny(msg) {
      root.AUDIO.play('deny');
      this.mistakes++;
      root.UI.toast('✖ ' + msg, 'warn');
    },

    /* ---------------- 交互扫描 ---------------- */
    /** 以准星为中心的锥形瞄准：返回 {d, ang} 或 null（ang 越小越正对） */
    aimPoint(p, radius, range, tol) {
      const cam = this.player.camPos;
      const dir = this.player.forward();
      const to = V3.sub([0, 0, 0], p, cam);
      const d = V3.len(to);
      if (d > range) return null;
      const cosA = V3.dot(V3.norm([0, 0, 0], to), dir);
      if (cosA <= 0.1) return null;
      const ang = Math.acos(clamp(cosA, -1, 1));
      const angR = Math.atan2(radius, Math.max(d, 0.06));
      const off = ang - angR;
      if (off > (tol != null ? tol : 0.16)) return null;
      return { d, ang: Math.max(0, off) };
    },

    aimNode(node, range, tol, extra) {
      const box = node.worldAABB();
      if (!box) return null;
      const c = [
        (box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2,
      ];
      const r = 0.5 * Math.hypot(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);
      return this.aimPoint(c, r + (extra || 0.02), range, tol);
    },

    scan() {
      const cands = [];
      const add = (aim, kind, extra) => {
        if (!aim) return;
        // 综合角度偏差与距离打分，安装点略微优先
        const score = aim.ang * 2.2 + aim.d * 0.12 + (extra && extra.bonus ? -extra.bonus : 0);
        cands.push(Object.assign({ score, dist: aim.d, kind }, extra || {}));
      };
      // 1) 手持零件 → 安装点
      const step = this.targetStepForHeld();
      let ghostShown = false;
      if (step) {
        const wp = this.anchorWorld(step);
        const aim = this.aimPoint(wp, 0.05, 2.1, 0.36);
        if (aim) {
          const ok = this.reqMet(step);
          add(aim, ok ? 'install' : 'blocked', { step, bonus: 0.5 });
          if (ok) {
            const p = this.held.def;
            const gm = (step.installOpts && p.installModel)
              ? root.MODELS.get(p.installModel, step.installOpts)
              : step.externalCables
                ? root.MODELS.get('cableRun', root.WORLD.externalCablePaths())
                : root.MODELS.get(p.model, p.modelOpts);
            this.ghost.model = gm;
            const parent = this.resolveParent(step.anchor.parent);
            if (this.ghost.parent !== parent) parent.add(this.ghost);
            this.ghost.pos = (step.installOpts || step.externalCables) ? [0, 0, 0] : step.anchor.pos.slice();
            this.ghost.rot = (step.anchor.rot || [0, 0, 0]).slice();
            this.ghost.visible = true;
            this.ghost.alpha = 0.28 + Math.sin(performance.now() * 0.005) * 0.08;
            ghostShown = true;
          }
        }
        // 内存插错槽的教学
        if (step.wrongSlots && !ghostShown) {
          for (const ws of step.wrongSlots) {
            const parent = this.resolveParent(step.anchor.parent);
            const wp2 = M4.xformPoint([0, 0, 0], parent.world, ws.pos);
            add(this.aimPoint(wp2, 0.02, 1.6, 0.10), 'wrongslot', { step, msg: ws.msg, bonus: 0.5 });
          }
        }
      }
      if (!ghostShown) this.ghost.visible = false;

      // 2) 场景物体：零件、手记、电源键、显示器
      for (const id in this.world.parts) {
        const part = this.world.parts[id];
        if (!this.canPickup(part)) continue;
        add(this.aimNode(part.node, 2.6, 0.16, 0.03), 'part',
          { target: part, step: this.pendingStepFor(part.def.kind) });
      }

      add(this.aimNode(this.world.nodes.notebook, 2.3, 0.20, 0.06), 'notebook',
        { target: this.world.nodes.notebook });

      if (this.isDone('cext_in') || this.powered) {
        const btnLocal = this.world.nodes.case.data.interact.pos;
        const wp = M4.xformPoint([0, 0, 0], this.world.nodes.case.world, btnLocal);
        add(this.aimPoint(wp, 0.03, 1.8, 0.22), 'power', { target: wp });
      }

      const cur = this.currentStep();
      if (cur && (cur.special === 'bios' || cur.special === 'bench')) {
        const wp = [root.WORLD.W.monitorPos[0], root.WORLD.W.monitorPos[1] + 0.45, root.WORLD.W.monitorPos[2] + 0.20];
        add(this.aimPoint(wp, 0.22, 2.2, 0.24), cur.special, { target: wp, step: cur });
      }

      let best = null;
      for (const c of cands) if (!best || c.score < best.score) best = c;
      this.focus = best;
      return this.focus;
    },

    promptFor(f) {
      if (!f) {
        root.UI.setPrompt(null);
        root.UI.crosshairState('');
        return;
      }
      const K = (k) => '<b>' + k + '</b>';
      switch (f.kind) {
        case 'install':
          root.UI.setPrompt(K('E') + ' 安装 · ' + f.step.title
            + (f.step.hint ? '<span class="sub">' + f.step.hint + '</span>' : ''));
          root.UI.crosshairState('active');
          break;
        case 'blocked':
          root.UI.setPrompt('<span class="warn">无法安装：' + (BLOCK_MSG[f.step.id] || '前置步骤未完成')
            + '</span>');
          root.UI.crosshairState('blocked');
          break;
        case 'wrongslot':
          root.UI.setPrompt('<span class="warn">' + f.msg + '</span>');
          root.UI.crosshairState('blocked');
          break;
        case 'part': {
          const p = f.target.def;
          root.UI.setPrompt(K('E') + ' 拿起 ' + p.name + ' · ' + K('F') + ' 查看资料'
            + '<span class="sub">' + (f.step ? '当前需要：' + f.step.title : p.full || '') + '</span>');
          root.UI.crosshairState(f.step ? 'active' : 'hover');
          break;
        }
        case 'notebook':
          root.UI.setPrompt(K('E') + ' 翻开《装机手记》');
          root.UI.crosshairState('active');
          break;
        case 'power':
          root.UI.setPrompt(K('E') + (this.powered ? ' 电源键（已开机）' : ' 按下电源键点亮整机'));
          root.UI.crosshairState(this.powered ? 'hover' : 'active');
          break;
        case 'bios':
          root.UI.setPrompt(K('E') + ' 按 DEL 进入 BIOS 设置');
          root.UI.crosshairState('active');
          break;
        case 'bench':
          root.UI.setPrompt(K('E') + ' 运行 NovaMark 跑分并交付');
          root.UI.crosshairState('active');
          break;
        default:
          root.UI.setPrompt(null);
          root.UI.crosshairState('');
      }
    },

    /* ---------------- 按键 ---------------- */
    onKey(code, e, repeat) {
      if (repeat) return;
      if (!this.started) {
        if (code === 'Space' || code === 'Enter') this.start();
        return;
      }
      if (root.UI.inDialogue()) {
        if (code === 'Space' || code === 'Enter' || code === 'KeyE') root.UI.advanceDialogue();
        return;
      }
      if (root.UI.modalOpen) {
        if (code === 'Escape' || code === 'Space' || code === 'Enter'
          || (root.UI.modalOpen === 'inspect' && code === 'KeyF')
          || (root.UI.modalOpen === 'journal' && code === 'Tab')) root.UI.closeModal();
        return;
      }
      switch (code) {
        case 'KeyE': this.interact(); break;
        case 'KeyF': this.inspect(); break;
        case 'KeyQ': if (this.held) this.dropHeld(); break;
        case 'Tab': this.openJournal(); break;
        case 'Escape':
          root.UI.pauseMenu(() => this.lockPointer(), () => this.restart());
          break;
        case 'KeyK':
          if (this.dev) this.devSkip();
          break;
        default: break;
      }
    },

    interact() {
      const f = this.focus;
      if (!f) return;
      switch (f.kind) {
        case 'install': this.tryInstall(f.step); break;
        case 'blocked': this.deny(BLOCK_MSG[f.step.id] || '前置步骤还没完成。'); break;
        case 'wrongslot': this.deny(f.msg); break;
        case 'part': {
          const part = f.target;
          const pend = this.pendingStepFor(part.def.kind);
          if (!pend) {
            root.UI.toast('这件零件暂时还用不上：' + part.def.name, 'info');
            return;
          }
          this.pickup(part);
          break;
        }
        case 'notebook': this.readNotebook(); break;
        case 'power': this.powerButton(); break;
        case 'bios': this.enterBios(); break;
        case 'bench': this.runBenchmark(); break;
        default: break;
      }
    },

    inspect() {
      if (root.UI.modalOpen) { root.UI.closeModal(); return; }
      let def = null, part = null;
      if (this.focus && this.focus.kind === 'part') part = this.focus.target;
      else if (this.held) part = this.held;
      if (part) def = part.def;
      if (!def) {
        root.UI.toast('把准星指向一个零件，或先拿起一个零件再按 F', 'info');
        return;
      }
      if (!part.inspected) {
        part.inspected = true;
        this.inspected++;
        const s = this.stepById.inspect3;
        if (s && !this.isDone('inspect3') && this.reqMet(s) && this.inspected >= s.count) {
          this.completeStep(s);
        }
      }
      if (this.cards.indexOf(def.lesson.title) < 0) this.cards.push(def.lesson.title);
      root.UI.inspect(def);
    },

    openJournal() {
      const chapters = CHAPTERS.map((c) => ({
        title: c.title,
        done: this.chapterDone(c.id),
        steps: this.stepsOfChapter(c.id).map((s) => ({
          title: s.title, done: this.isDone(s.id), avail: this.reqMet(s),
        })),
      }));
      root.UI.journal({ chapters, cards: this.cards });
    },

    readNotebook() {
      if (!this.isDone('read_notebook')) {
        this.completeStep(this.stepById.read_notebook);
        root.UI.dialogue([
          { who: '装机手记', text: '第 1 页：<b>装机六步</b><br>板外平台 → 主板入箱 → 装大件 → 走线 → 合盖点亮 → BIOS 与系统。', color: '#ffd479' },
          { who: '装机手记', text: '第 2 页：<b>三条铁律</b><br>① 断电再插拔；② 手先摸机箱放静电；③ 插不进去先看方向，别硬来。', color: '#ffd479' },
          { who: '系统', text: '现在去左边货架，用 <b>F</b> 认识 3 个零件。', color: '#7fd2ff' },
        ]);
      } else {
        this.openJournal();
      }
    },

    /* ---------------- 点亮流程 ---------------- */
    powerButton() {
      if (this.powered) { root.AUDIO.play('click'); return; }
      const step = this.stepById.power_on;
      if (!this.reqMet(step)) { this.deny(BLOCK_MSG.power_on); return; }
      this.powered = true;
      this.phase = 'post';
      this.phaseT = 0;
      root.AUDIO.play('relay');
      root.AUDIO.play('boot');
      this.completeStep(step);
      this.setPowerVisuals(true);
      root.SCREENS.set('post');
      root.UI.toast('风扇转动、灯光亮起，显示器出现自检画面', 'good');
      setTimeout(() => {
        root.AUDIO.play('beep');
        root.UI.dialogue(STORY.post);
      }, 2600);
    },

    setPowerVisuals(on) {
      const w = this.world;
      w.nodes.powerLed.emisMul = on ? 1 : 0;
      w.nodes.dbgLed.emisMul = on ? 1 : 0;
      w.nodes.screen.emisMul = on ? 1 : 0;
      for (const id of ['ram1', 'ram2', 'gpu', 'fan1', 'fan2', 'fan3']) {
        const p = w.parts[id];
        if (p && p.state === 'installed') p.node.emisMul = on ? 0.55 : 0;
      }
      w.lights.rgb.intensity = on ? 0.35 : 0;
      w.lights.rgb2.intensity = on ? 0.6 : 0;
      w.lights.screen.intensity = on ? 1.6 : 0;
      this.fanTarget = on ? 1 : 0;
    },

    enterBios() {
      const step = this.stepById.bios_xmp;
      root.SCREENS.set('bios', { xmp: this.xmp });
      const open = () => root.UI.biosPanel({ xmp: this.xmp }, () => {
        this.xmp = !this.xmp;
        root.SCREENS.set('bios', { xmp: this.xmp });
        root.AUDIO.play('click');
        root.UI.closeModal();
        open();
      }, () => {
        root.UI.closeModal();
        root.AUDIO.play('ok');
        if (!this.xmp) {
          root.UI.toast('没有开启 XMP：内存只会跑 4800，白白浪费了 6400 的条子', 'warn');
          this.mistakes++;
        }
        this.completeStep(step);
        this.startOsInstall();
      });
      open();
    },

    startOsInstall() {
      this.phase = 'os';
      this.osProgress = 0;
      root.SCREENS.set('osinstall', { progress: 0 });
      root.UI.dialogue(STORY.afterBios);
    },

    runBenchmark() {
      const step = this.stepById.bench;
      if (!this.reqMet(step)) return;
      this.score = Math.max(9000, 18600 + (this.xmp ? 900 : 0) - this.mistakes * 80);
      root.SCREENS.set('desktop', { score: this.score, xmp: this.xmp });
      root.AUDIO.play('win');
      this.completeStep(step);
    },

    finish() {
      // 先播结局剧情，再出结算报告
      root.UI.dialogue(STORY.ending, () => this.showReport());
    },

    showReport() {
      const secs = (performance.now() - this.startTime) / 1000;
      const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
      const rank = (this.mistakes <= 1 && this.xmp) ? 'S' : this.mistakes <= 4 ? 'A' : 'B';
      const comment = rank === 'S'
        ? '一次点亮、零返工、XMP 也没忘——这台机器可以放心交给客户了。'
        : rank === 'A' ? '装得很稳，个别步骤走了点弯路，但结果没问题。'
          : '机器能跑起来了。回头再看看那些提示，下一台会顺得多。';
      root.UI.report({
        done: Object.keys(this.doneSteps).length,
        total: this.steps.length,
        time: mm + ' 分 ' + ss + ' 秒',
        cards: this.cards.length,
        mistakes: this.mistakes,
        score: this.score,
        xmp: this.xmp,
        rank, comment,
      }, () => this.restart());
    },

    devSkip() {
      const s = this.currentStep();
      if (!s) return;
      if (s.special) {
        if (s.special === 'power') { this.powerButton(); return; }
        if (s.special === 'bios') { this.xmp = true; this.completeStep(s); this.startOsInstall(); return; }
        if (s.special === 'os') {
          this.phase = 'desktop';
          this.osProgress = 1;
          this.completeStep(s);
          root.SCREENS.set('desktop', { score: 0, xmp: this.xmp });
          return;
        }
        if (s.special === 'bench') { this.runBenchmark(); return; }
        if (s.special === 'inspect') { this.completeStep(s); return; }
        if (s.special === 'notebook') { this.completeStep(s); return; }
        return;
      }
      // 自动拿起对应零件并安装
      for (const id in this.world.parts) {
        const p = this.world.parts[id];
        if (p.def.kind === s.accept
          && (p.state === 'shelf' || p.state === 'held' || (p.state === 'installed' && p.def.movable))) {
          this.held = p;
          p.state = 'held';
          this.tryInstall(s);
          if (root.UI.modalOpen) root.UI.closeModal();
          return;
        }
      }
    },

    /* ---------------- HUD ---------------- */
    updateHud() {
      const s = this.currentStep();
      const ch = CHAPTERS.find((c) => c.id === this.chapter) || CHAPTERS[0];
      const done = Object.keys(this.doneSteps).length;
      root.UI.setObjective(ch.title, s ? s.title : '全部完成 · 交付整机',
        s ? (s.hint || '') : '', done, this.steps.length);
    },

    /* ---------------- 自适应画质 ---------------- */
    QUALITY: [
      { renderScale: 1.0, shadows: true, bloom: true, fxaa: true, shadowSize: 2048, maxLights: 8, name: '高' },
      { renderScale: 0.85, shadows: true, bloom: true, fxaa: true, shadowSize: 1536, maxLights: 8, name: '中高' },
      { renderScale: 0.72, shadows: true, bloom: false, fxaa: true, shadowSize: 1024, maxLights: 6, name: '中' },
      { renderScale: 0.58, shadows: false, bloom: true, fxaa: true, shadowSize: 1024, maxLights: 4, name: '低' },
      { renderScale: 0.45, shadows: false, bloom: false, fxaa: false, shadowSize: 512, maxLights: 3, name: '最低' },
    ],
    qLevel: 0,
    qManual: false,

    applyQuality(level, quiet) {
      const q = this.QUALITY[clamp(level, 0, this.QUALITY.length - 1)];
      this.qLevel = clamp(level, 0, this.QUALITY.length - 1);
      Object.assign(root.RENDER.quality, {
        renderScale: q.renderScale, shadows: q.shadows, bloom: q.bloom, fxaa: q.fxaa,
        maxLights: q.maxLights,
      });
      root.RENDER.setShadowSize(q.shadowSize);
      this.onResize();
      if (!quiet) root.UI.toast('检测到帧率偏低，已自动把画质降到「' + q.name + '」（Esc → 设置里可手动调整）', 'info');
    },

    /** 帧率过低时逐级降画质；用户手动改过设置后不再自动干预 */
    autoQuality(dt) {
      if (this.qManual || !this.started) return;
      this.qT = (this.qT || 0) + dt;
      this.qFrames = (this.qFrames || 0) + 1;
      if (this.qT < 2.2) return;
      const fps = this.qFrames / this.qT;
      this.qT = 0; this.qFrames = 0;
      if (this.qWarm === undefined) { this.qWarm = 0; }
      if (this.qWarm < 1) { this.qWarm++; return; }   // 跳过首个统计窗口
      if (fps < 26 && this.qLevel < this.QUALITY.length - 1) this.applyQuality(this.qLevel + 1);
      else if (fps > 85 && this.qLevel > 0) this.applyQuality(this.qLevel - 1, true);
    },

    /* ---------------- 主循环 ---------------- */
    frame(now) {
      const dtRaw = (now - this.last) / 1000;
      this.last = now;
      const dt = Math.min(0.1, Math.max(0.0005, dtRaw));
      this.fps = this.fps ? lerp(this.fps, 1 / dt, 0.12) : 1 / dt;
      this.autoQuality(dt);

      if (this.started) {
        const wasGround = this.player.onGround;
        this.player.update(dt, { frozen: root.UI.inDialogue() });
        if (this.player.onGround && !wasGround) root.AUDIO.step();
        this.stepSound(dt);
      }

      // 手持零件跟随相机
      if (this.held) {
        const camM = M4.invert(M4.create(), this.player.view);
        const h = this.held.def.hold;
        const sway = Math.sin(performance.now() * 0.0016) * 0.004;
        const hold = M4.fromTRS(M4.create(),
          [h.pos[0], h.pos[1] + sway, h.pos[2]], h.rot, [1, 1, 1]);
        this.held.node.matrixOverride = M4.mul(M4.create(), camM, hold);
      }

      // 安装动画
      for (let i = this.animations.length - 1; i >= 0; i--) {
        const a = this.animations[i];
        a.t += dt;
        const k = clamp(a.t / a.dur, 0, 1);
        if (a.kind === 'slide') {
          const e = smooth(k);
          const from = e < 0.5 ? a.a : a.m;
          const to = e < 0.5 ? a.m : a.b;
          const kk = e < 0.5 ? e * 2 : (e - 0.5) * 2;
          a.node.pos = [lerp(from[0], to[0], kk), lerp(from[1], to[1], kk), lerp(from[2], to[2], kk)];
        } else if (a.kind === 'fade') {
          a.node.alpha = lerp(0.05, 1, k);
        }
        if (k >= 1) {
          if (a.kind === 'slide') a.node.pos = a.b.slice();
          if (a.kind === 'fade') a.node.alpha = 1;
          this.animations.splice(i, 1);
        }
      }

      // 风扇与音效
      this.fanLevel = damp(this.fanLevel, this.fanTarget || 0, 1.4, dt);
      for (const r of this.world.rotors) {
        const installed = r.parent && r.parent.parent;
        r.spin.speed = this.fanLevel * (34 + (r.id % 5));
        void installed;
      }
      root.AUDIO.setFans(this.fanLevel);

      // 系统安装进度
      if (this.phase === 'os') {
        this.osProgress = Math.min(1, this.osProgress + dt / 14);
        root.SCREENS.set('osinstall', { progress: this.osProgress });
        if (this.osProgress >= 1) {
          this.phase = 'desktop';
          this.completeStep(this.stepById.os_install);
          root.SCREENS.set('desktop', { score: 0, xmp: this.xmp });
          root.AUDIO.play('boot');
          root.UI.toast('系统安装完成，走到显示器前跑个分验收', 'good');
        }
      }

      // 当前目标零件高亮
      const cur = this.currentStep();
      const nb = this.world.nodes.notebook;
      const nbTarget = cur && cur.special === 'notebook';
      nb.tint = nbTarget ? [0.95, 0.75, 0.25] : null;
      nb.tintStrength = nbTarget ? 0.30 + Math.sin(now * 0.004) * 0.16 : 0;
      for (const id in this.world.parts) {
        const p = this.world.parts[id];
        const isTarget = cur && !cur.special && p.def.kind === cur.accept && p.state === 'shelf';
        p.node.tint = isTarget ? [0.25, 0.85, 1.0] : null;
        p.node.tintStrength = isTarget ? 0.22 + Math.sin(now * 0.004) * 0.12 : 0;
      }

      this.scene.update(dt);
      if (this.started) {
        this.scan();
        this.promptFor(this.focus);
        this.updateCompass(cur);
        this.updateHud();
      }
      root.SCREENS.update(dt);
      root.RENDER.flash = damp(root.RENDER.flash, 0, 6, dt);

      const cam = { pos: this.player.camPos, view: this.player.view, fov: this.player.fov };
      root.RENDER.render(this.scene, cam, dt);

      if (this.started && (this.frameCount = (this.frameCount || 0) + 1) % 15 === 0) {
        root.UI.perf(this.fps, root.MODELS.stats().tris, this.dev ? 'DEV(K 跳过)' : null);
      }
      requestAnimationFrame((t) => this.frame(t));
    },

    stepSound(dt) {
      const sp = Math.hypot(this.player.vel[0], this.player.vel[2]);
      this.stepAcc = (this.stepAcc || 0) + sp * dt;
      if (this.stepAcc > 1.6) { this.stepAcc = 0; root.AUDIO.step(); }
    },

    updateCompass(step) {
      if (!step) { root.UI.compass(false); return; }
      let wp = null, label = step.title;
      if (step.special) {
        if (step.special === 'notebook') wp = this.world.nodes.notebook.worldPos();
        else if (step.special === 'inspect') wp = [-3.7, 1.2, -0.4];
        else if (step.special === 'power') {
          wp = M4.xformPoint([0, 0, 0], this.world.nodes.case.world, this.world.nodes.case.data.interact.pos);
        } else wp = [root.WORLD.W.monitorPos[0], root.WORLD.W.monitorPos[1] + 0.4, root.WORLD.W.monitorPos[2] + 0.3];
      } else if (this.held && this.held.def.kind === step.accept) {
        wp = this.anchorWorld(step);
      } else {
        for (const id in this.world.parts) {
          const p = this.world.parts[id];
          if (p.def.kind === step.accept && p.state === 'shelf') { wp = p.node.worldPos(); break; }
        }
      }
      if (!wp) { root.UI.compass(false); return; }
      const vp = M4.mul(M4.create(), root.RENDER.proj, this.player.view);
      const x = vp[0] * wp[0] + vp[4] * wp[1] + vp[8] * wp[2] + vp[12];
      const w = vp[3] * wp[0] + vp[7] * wp[1] + vp[11] * wp[2] + vp[15];
      const dist = V3.dist(this.player.camPos, wp);
      let sx;
      if (w > 0.001) sx = clamp((x / w) * 0.5 + 0.5, 0.03, 0.97);
      else sx = x > 0 ? 0.97 : 0.03;
      root.UI.compass(dist > 1.0, sx, dist, label);
    },
  };

  root.GAME = G;
  window.addEventListener('load', () => G.init());
})(window);
