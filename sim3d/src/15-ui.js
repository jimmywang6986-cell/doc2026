/* 界面层：HUD、剧情对话、知识卡片、零件资料、任务日志、BIOS、结算报告 */
(function (root) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const UI = {
    modalOpen: null,
    dialogueQueue: null,

    init(game) {
      this.game = game;
      this.crosshair = $('crosshair');
      this.prompt = $('prompt');
      this.held = $('held');
      this.toasts = $('toasts');
      this.perfEl = $('perf');
      this.objChapter = $('objChapter');
      this.objTask = $('objTask');
      this.objHint = $('objHint');
      this.objBar = $('objBar');
      this.objCount = $('objCount');
      this.compassEl = $('compass');
      this.dialogueEl = $('dialogue');
      this.dialogueWho = $('dialogueWho');
      this.dialogueText = $('dialogueText');
      this.modal = $('modal');
      this.modalBody = $('modalBody');
      this.hintKeys = $('keys');

      $('btnStart').addEventListener('click', () => this.game.start());
      $('btnHelp').addEventListener('click', () => this.showHelp());
      $('btnSettings').addEventListener('click', () => this.showSettings());
      this.dialogueEl.addEventListener('click', () => this.advanceDialogue());
      this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.closeModal(); });
    },

    /* ---------------- HUD ---------------- */
    setPrompt(html) {
      if (!html) { this.prompt.classList.add('hidden'); return; }
      this.prompt.classList.remove('hidden');
      this.prompt.innerHTML = html;
    },

    setHeld(name, sub) {
      if (!name) { this.held.classList.add('hidden'); return; }
      this.held.classList.remove('hidden');
      this.held.innerHTML = '<span class="k">手持</span>' + name
        + (sub ? '<span class="s">' + sub + '</span>' : '');
    },

    setObjective(chapter, task, hint, done, total) {
      this.objChapter.textContent = chapter;
      this.objTask.innerHTML = task;
      this.objHint.innerHTML = hint || '';
      const p = total ? (done / total * 100) : 0;
      this.objBar.style.width = p.toFixed(1) + '%';
      this.objCount.textContent = done + ' / ' + total;
    },

    compass(visible, screenX, dist, label) {
      if (!visible) { this.compassEl.classList.add('hidden'); return; }
      this.compassEl.classList.remove('hidden');
      this.compassEl.style.left = (screenX * 100).toFixed(2) + '%';
      this.compassEl.innerHTML = '<div class="arrow"></div><div class="lbl">' + label
        + ' · ' + dist.toFixed(1) + 'm</div>';
    },

    toast(text, kind) {
      const t = el('div', 'toast ' + (kind || 'info'), text);
      this.toasts.appendChild(t);
      while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
      setTimeout(() => t.classList.add('in'), 10);
      setTimeout(() => {
        t.classList.remove('in');
        setTimeout(() => t.remove(), 400);
      }, kind === 'warn' ? 6200 : 3600);
    },

    perf(fps, tris, extra) {
      this.perfEl.innerHTML = fps.toFixed(0) + ' FPS · ' + (tris / 1000).toFixed(0) + 'k 三角面'
        + (extra ? ' · ' + extra : '');
    },

    setKeyHints(html) { this.hintKeys.innerHTML = html; },

    crosshairState(state) {
      this.crosshair.className = state || '';
    },

    /* ---------------- 剧情对话 ---------------- */
    dialogue(lines, onDone) {
      // 弹窗打开时先排队，等弹窗关闭再播，避免按键被身后的对话吃掉
      if (this.modalOpen) {
        this.pendingDialogue = { lines, onDone };
        return;
      }
      this.dialogueQueue = lines.slice();
      this.dialogueDone = onDone;
      this.dialogueEl.classList.remove('hidden');
      this.block(true);
      this.advanceDialogue(true);
    },

    advanceDialogue(first) {
      if (!this.dialogueQueue) return;
      if (!first) this.dialogueQueue.shift();
      if (!this.dialogueQueue.length) {
        this.dialogueEl.classList.add('hidden');
        this.dialogueQueue = null;
        this.block(false);
        const d = this.dialogueDone;
        this.dialogueDone = null;
        if (d) d();
        return;
      }
      const l = this.dialogueQueue[0];
      this.dialogueWho.textContent = l.who || '';
      this.dialogueWho.style.color = l.color || '#7fd2ff';
      this.dialogueText.innerHTML = l.text;
      root.AUDIO.play('card');
    },

    inDialogue() { return !!this.dialogueQueue; },

    /* ---------------- 通用弹窗 ---------------- */
    openModal(html, opts) {
      opts = opts || {};
      this.modalBody.innerHTML = html;
      this.modalBody.className = 'modal-body ' + (opts.cls || '');
      this.modal.classList.remove('hidden');
      this.modalOpen = opts.name || 'modal';
      this.block(true);
      const close = this.modalBody.querySelector('[data-close]');
      if (close) close.addEventListener('click', () => this.closeModal());
      if (opts.onOpen) opts.onOpen(this.modalBody);
    },

    closeModal() {
      if (!this.modalOpen) return;
      this.modal.classList.add('hidden');
      const cb = this.onModalClose;
      this.onModalClose = null;
      this.modalOpen = null;
      this.block(false);
      if (cb) cb();
      if (this.pendingDialogue) {
        const d = this.pendingDialogue;
        this.pendingDialogue = null;
        setTimeout(() => this.dialogue(d.lines, d.onDone), 260);
      }
    },

    block(on) {
      root.PLAYER.Input.blocked = on;
      if (on && document.pointerLockElement) document.exitPointerLock();
    },

    /* ---------------- 知识卡片 ---------------- */
    card(lesson, onClose) {
      const tips = (lesson.tips || []).map((t) => '<li>' + t + '</li>').join('');
      this.onModalClose = onClose;
      this.openModal(
        '<div class="card-head"><span class="tag">知识卡片</span><h2>' + lesson.title + '</h2></div>'
        + '<p class="body">' + lesson.body + '</p>'
        + (tips ? '<div class="tips"><h3>实操要点</h3><ul>' + tips + '</ul></div>' : '')
        + '<div class="foot"><button class="btn primary" data-close>知道了（空格）</button></div>',
        { cls: 'card', name: 'card' });
      root.AUDIO.play('ok');
    },

    /* ---------------- 零件资料 ---------------- */
    inspect(def) {
      const spec = (def.spec || []).map((s) => '<li>' + s + '</li>').join('');
      const tips = (def.lesson.tips || []).map((t) => '<li>' + t + '</li>').join('');
      this.openModal(
        '<div class="card-head"><span class="tag alt">零件资料</span><h2>' + def.name
        + '<small>' + (def.full || '') + '</small></h2></div>'
        + '<div class="cols"><div><h3>规格</h3><ul class="spec">' + spec + '</ul></div>'
        + '<div><h3>' + def.lesson.title + '</h3><p class="body">' + def.lesson.body + '</p></div></div>'
        + (tips ? '<div class="tips"><h3>实操要点</h3><ul>' + tips + '</ul></div>' : '')
        + '<div class="foot"><button class="btn primary" data-close>关闭（F / Esc）</button></div>',
        { cls: 'inspect', name: 'inspect' });
    },

    /* ---------------- 任务日志 ---------------- */
    journal(data) {
      const chapters = data.chapters.map((c) => {
        const items = c.steps.map((s) => '<li class="' + (s.done ? 'done' : s.avail ? 'avail' : 'lock') + '">'
          + (s.done ? '✔ ' : s.avail ? '▸ ' : '· ') + s.title + '</li>').join('');
        return '<div class="chap"><h3>' + (c.done ? '✔ ' : '') + c.title + '</h3><ul>' + items + '</ul></div>';
      }).join('');
      const cards = data.cards.length
        ? data.cards.map((c) => '<span class="chip">' + c + '</span>').join('')
        : '<span class="dim">还没有收集到知识卡片</span>';
      this.openModal(
        '<div class="card-head"><span class="tag">装机手册</span><h2>任务与知识收集</h2></div>'
        + '<div class="jr">' + chapters + '</div>'
        + '<div class="tips"><h3>已收集知识卡片（' + data.cards.length + '）</h3><div class="chips">' + cards + '</div></div>'
        + '<div class="foot"><button class="btn primary" data-close>关闭（Tab / Esc）</button></div>',
        { cls: 'journal', name: 'journal' });
    },

    /* ---------------- BIOS 交互 ---------------- */
    biosPanel(state, onToggle, onSave) {
      this.openModal(
        '<div class="card-head"><span class="tag alt">UEFI BIOS</span><h2>内存超频档案</h2></div>'
        + '<p class="body">主板默认按 JEDEC 保守频率（DDR5-4800）运行内存。'
        + '要跑到内存条标称的 6400MT/s，需要在 BIOS 里开启厂商预设的 XMP 档案。</p>'
        + '<div class="bios-row"><span>XMP I（DDR5-6400 CL30 · 1.35V）</span>'
        + '<button class="btn ' + (state.xmp ? 'good' : '') + '" id="biosXmp">'
        + (state.xmp ? '已开启' : '未开启（点击开启）') + '</button></div>'
        + '<div class="bios-row"><span>CPU 风扇曲线</span><span class="dim">静音（40℃ 起转，80℃ 全速）</span></div>'
        + '<div class="bios-row"><span>启动顺序</span><span class="dim">M.2_1 NOVA SSD 2TB</span></div>'
        + '<div class="foot"><button class="btn primary" id="biosSave">F10 保存并退出</button></div>',
        {
          cls: 'bios',
          name: 'bios',
          onOpen: (body) => {
            body.querySelector('#biosXmp').addEventListener('click', () => onToggle());
            body.querySelector('#biosSave').addEventListener('click', () => onSave());
          },
        });
    },

    /* ---------------- 结算 ---------------- */
    report(stats, onRestart) {
      const rows = [
        ['完成步骤', stats.done + ' / ' + stats.total],
        ['用时', stats.time],
        ['知识卡片', stats.cards + ' 张'],
        ['错误尝试', stats.mistakes + ' 次'],
        ['跑分', stats.score + ' 分' + (stats.xmp ? '（XMP 已开启）' : '（未开 XMP）')],
      ].map((r) => '<div class="rrow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
      this.openModal(
        '<div class="card-head"><span class="tag good">装机完成</span><h2>评级 ' + stats.rank + '</h2></div>'
        + '<p class="body">' + stats.comment + '</p>'
        + '<div class="report">' + rows + '</div>'
        + '<div class="foot"><button class="btn primary" id="btnRestart">再来一次</button>'
        + '<button class="btn" data-close>留在店里逛逛</button></div>',
        {
          cls: 'report', name: 'report',
          onOpen: (body) => {
            body.querySelector('#btnRestart').addEventListener('click', () => onRestart());
          },
        });
      root.AUDIO.play('win');
    },

    /* ---------------- 帮助 / 设置 ---------------- */
    showHelp() {
      this.openModal(
        '<div class="card-head"><span class="tag">操作说明</span><h2>怎么玩</h2></div>'
        + '<div class="cols"><div><h3>移动与视角</h3><ul class="spec">'
        + '<li><b>W A S D</b> 行走 · <b>Shift</b> 疾走 · <b>Space</b> 跳</li>'
        + '<li><b>C / Ctrl</b> 下蹲（看机箱底部很有用）</li>'
        + '<li><b>鼠标</b> 环视（点击画面锁定指针）</li>'
        + '<li><b>方向键</b> 也可以转视角（不锁指针时）</li>'
        + '</ul></div><div><h3>装机操作</h3><ul class="spec">'
        + '<li><b>E</b> 拾取 / 安装 / 交互</li>'
        + '<li><b>F</b> 查看手中或准星指向零件的资料</li>'
        + '<li><b>Q</b> 放回手中零件</li>'
        + '<li><b>Tab</b> 任务与知识手册 · <b>Esc</b> 暂停</li>'
        + '</ul></div></div>'
        + '<div class="tips"><h3>小提示</h3><ul>'
        + '<li>准星变成青色圆环时表示可以操作；红色表示前置步骤没完成，会告诉你原因。</li>'
        + '<li>安装位置会有半透明的「幽灵零件」预览，走近点看更清楚。</li>'
        + '<li>不确定下一步做什么？看左上角任务栏，或按 Tab 打开手册。</li>'
        + '</ul></div>'
        + '<div class="foot"><button class="btn primary" data-close>明白了</button></div>',
        { cls: 'help', name: 'help' });
    },

    showSettings() {
      const q = root.RENDER.quality;
      this.openModal(
        '<div class="card-head"><span class="tag">设置</span><h2>画质与操作</h2></div>'
        + '<div class="set-row"><span>渲染分辨率</span><input type="range" id="setScale" min="50" max="100" step="5" value="'
        + Math.round(q.renderScale * 100) + '"><b id="setScaleV">' + Math.round(q.renderScale * 100) + '%</b></div>'
        + '<div class="set-row"><span>阴影</span><button class="btn" id="setShadow">' + (q.shadows ? '开' : '关') + '</button></div>'
        + '<div class="set-row"><span>泛光（灯光辉光）</span><button class="btn" id="setBloom">' + (q.bloom ? '开' : '关') + '</button></div>'
        + '<div class="set-row"><span>抗锯齿 FXAA</span><button class="btn" id="setFxaa">' + (q.fxaa ? '开' : '关') + '</button></div>'
        + '<div class="set-row"><span>鼠标灵敏度</span><input type="range" id="setSens" min="20" max="250" step="10" value="'
        + Math.round(root.PLAYER.Input.sensitivity * 100) + '"><b id="setSensV">'
        + root.PLAYER.Input.sensitivity.toFixed(1) + '×</b></div>'
        + '<div class="set-row"><span>音效</span><button class="btn" id="setMute">' + (root.AUDIO.muted ? '静音' : '开') + '</button></div>'
        + '<div class="foot"><button class="btn primary" data-close>返回</button></div>',
        {
          cls: 'settings', name: 'settings',
          onOpen: (body) => {
            this.game.qManual = true;
            const scale = body.querySelector('#setScale');
            scale.addEventListener('input', () => {
              q.renderScale = parseInt(scale.value, 10) / 100;
              body.querySelector('#setScaleV').textContent = scale.value + '%';
              this.game.onResize();
            });
            const sens = body.querySelector('#setSens');
            sens.addEventListener('input', () => {
              root.PLAYER.Input.sensitivity = parseInt(sens.value, 10) / 100;
              body.querySelector('#setSensV').textContent = root.PLAYER.Input.sensitivity.toFixed(1) + '×';
            });
            const toggle = (id, get, set) => {
              const b = body.querySelector(id);
              b.addEventListener('click', () => {
                set(!get());
                b.textContent = get() ? '开' : '关';
                this.game.onResize();
              });
            };
            toggle('#setShadow', () => q.shadows, (v) => { q.shadows = v; });
            toggle('#setBloom', () => q.bloom, (v) => { q.bloom = v; });
            toggle('#setFxaa', () => q.fxaa, (v) => { q.fxaa = v; });
            const mb = body.querySelector('#setMute');
            mb.addEventListener('click', () => {
              root.AUDIO.muted = !root.AUDIO.muted;
              root.AUDIO.setFans(root.AUDIO.muted ? 0 : (this.game.fanLevel || 0));
              mb.textContent = root.AUDIO.muted ? '静音' : '开';
            });
          },
        });
    },

    pauseMenu(onResume, onRestart) {
      this.openModal(
        '<div class="card-head"><span class="tag">暂停</span><h2>星海电脑维修部</h2></div>'
        + '<p class="body">随时可以回到工位继续装机。</p>'
        + '<div class="foot col"><button class="btn primary" id="pResume">继续（Esc）</button>'
        + '<button class="btn" id="pHelp">操作说明</button>'
        + '<button class="btn" id="pSet">设置</button>'
        + '<button class="btn danger" id="pRestart">重新开始</button></div>',
        {
          cls: 'pause', name: 'pause',
          onOpen: (body) => {
            body.querySelector('#pResume').addEventListener('click', () => { this.closeModal(); onResume(); });
            body.querySelector('#pHelp').addEventListener('click', () => { this.closeModal(); this.showHelp(); });
            body.querySelector('#pSet').addEventListener('click', () => { this.closeModal(); this.showSettings(); });
            body.querySelector('#pRestart').addEventListener('click', () => onRestart());
          },
        });
    },

    hideTitle() { $('title').classList.add('gone'); },
    showLoading(text) { $('loadingText').textContent = text; },
    hideLoading() { $('loading').classList.add('gone'); },
    fatal(msg) {
      $('loading').classList.remove('gone');
      $('loadingText').innerHTML = '<b style="color:#ff8a6a">出错了</b><br><br>' + msg;
    },
  };

  root.UI = UI;
})(window);
