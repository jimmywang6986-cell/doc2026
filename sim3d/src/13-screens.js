/* 显示器画面：POST 自检、BIOS、系统安装、桌面与跑分（Canvas 动态纹理） */
(function (root) {
  'use strict';

  const F = (px, bold) => (bold ? 'bold ' : '') + px
    + 'px "WenQuanYi Micro Hei", "Noto Sans CJK SC", sans-serif';
  const MONO = (px, bold) => (bold ? 'bold ' : '') + px + 'px "WenQuanYi Micro Hei Mono", monospace';

  const S = {
    state: 'off',
    t: 0,
    acc: 0,
    dirty: true,
    data: {},
    W: 1024,
    H: 576,

    init(gl) {
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      this.canvas = c;
      this.ctx = c.getContext('2d');
      this.dyn = root.GLU.dynamicTex(gl, c);
      root.TEX.register('dyn:monitor', { albedo: this.dyn.tex, normal: null });
      this.draw();
    },

    set(state, data) {
      this.state = state;
      this.data = Object.assign({}, this.data, data || {});
      this.t = 0;
      this.dirty = true;
    },

    update(dt) {
      this.t += dt;
      this.acc += dt;
      if (this.acc < 1 / 14 && !this.dirty) return;
      this.acc = 0;
      this.dirty = false;
      this.draw();
      this.dyn.update();
    },

    draw() {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#04060a';
      ctx.fillRect(0, 0, W, H);
      const fn = this['draw_' + this.state];
      if (fn) fn.call(this, ctx, W, H);
    },

    draw_off(ctx, W, H) {
      ctx.fillStyle = '#02040688';
      ctx.fillRect(0, 0, W, H);
    },

    draw_nosignal(ctx, W, H) {
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 0, W, H);
      const bob = Math.sin(this.t * 0.7) * 60;
      ctx.fillStyle = '#182030';
      ctx.fillRect(W / 2 - 190 + bob, H / 2 - 60, 380, 120);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7f8da0';
      ctx.font = F(38, true);
      ctx.fillText('无信号', W / 2 + bob, H / 2 - 6);
      ctx.font = F(20);
      ctx.fillText('请检查视频线是否接在显卡上', W / 2 + bob, H / 2 + 34);
    },

    draw_post(ctx, W, H) {
      const lines = [
        'NOVA UEFI BIOS v3.21  (Z-990)',
        '',
        'CPU: NOVA CORE X9-14900K  24C/32T  @ 3.60GHz',
        'Memory Training .....................  OK',
        'Installed Memory: 32768 MB (DDR5-4800 JEDEC)',
        'M.2_1: NOVA SSD 2TB  (PCIe 5.0 x4)',
        'SATA_1: NOVA SATA SSD 1TB',
        'SATA_2: NOVA ARCHIVE 8TB',
        'PCIe x16_1: NOVA RTV-5080 16GB',
        'CPU Fan: 780 RPM      SYS Fan: 640/650/700 RPM',
        '',
        'Press <DEL> to enter SETUP',
      ];
      const show = Math.min(lines.length, Math.floor(this.t * 7) + 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#dfe7f0';
      ctx.font = MONO(22);
      for (let i = 0; i < show; i++) {
        ctx.fillStyle = i === 0 ? '#7fd2ff' : (lines[i].indexOf('OK') > 0 ? '#7fe6a8' : '#cfd8e4');
        ctx.fillText(lines[i], 48, 70 + i * 36);
      }
      if (Math.floor(this.t * 2) % 2 === 0 && show >= lines.length) {
        ctx.fillStyle = '#cfd8e4';
        ctx.fillRect(48 + ctx.measureText(lines[lines.length - 1]).width + 10, 70 + (lines.length - 1) * 36 - 18, 12, 24);
      }
    },

    draw_bios(ctx, W, H) {
      const xmp = !!this.data.xmp;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1420'); g.addColorStop(1, '#060a10');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0f2536';
      ctx.fillRect(0, 0, W, 74);
      ctx.fillStyle = '#7fd2ff';
      ctx.font = F(30, true);
      ctx.textAlign = 'left';
      ctx.fillText('NOVA UEFI BIOS  —  EZ Mode', 32, 48);
      ctx.font = F(18);
      ctx.fillStyle = '#8ea0b6';
      ctx.fillText('2026/08/20  07:42', W - 220, 46);

      const card = (x, y, w, h, title) => {
        ctx.fillStyle = '#101c28';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#1e3445';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#5f7fa0';
        ctx.font = F(18, true);
        ctx.fillText(title, x + 16, y + 30);
      };
      const row = (x, y, k, v, color) => {
        ctx.fillStyle = '#8ea0b6'; ctx.font = F(19);
        ctx.fillText(k, x, y);
        ctx.fillStyle = color || '#e6eef7'; ctx.font = F(19, true);
        ctx.fillText(v, x + 210, y);
      };

      card(32, 96, 470, 210, '系统信息');
      row(52, 148, 'CPU', 'NOVA X9-14900K @ 5.80GHz');
      row(52, 182, '内存', xmp ? '32GB DDR5-6400 (XMP I)' : '32GB DDR5-4800 (JEDEC 默认)', xmp ? '#7fe6a8' : '#ffcf6b');
      row(52, 216, 'CPU 温度', '34 °C', '#7fe6a8');
      row(52, 250, '显卡', 'NOVA RTV-5080 16GB');
      row(52, 284, '存储', 'M.2 2TB · SATA 1TB · HDD 8TB');

      card(524, 96, 468, 210, '风扇转速 / 温控');
      row(544, 148, 'CPU_FAN', '780 RPM  (曲线：静音)');
      row(544, 182, 'SYS_FAN1/2', '640 / 650 RPM');
      row(544, 216, 'SYS_FAN3', '700 RPM  (排风)');
      ctx.strokeStyle = '#2c4a63';
      ctx.beginPath();
      ctx.moveTo(560, 288); ctx.lineTo(700, 270); ctx.lineTo(820, 230); ctx.lineTo(960, 214);
      ctx.stroke();
      ctx.fillStyle = '#5f7fa0'; ctx.font = F(15);
      ctx.fillText('温度 →', 560, 300);

      card(32, 326, 960, 214, '内存超频档案 (XMP / EXPO)');
      ctx.fillStyle = xmp ? '#123c2a' : '#3a2a12';
      ctx.fillRect(52, 356, 300, 60);
      ctx.strokeStyle = xmp ? '#3fd68a' : '#e0a33c';
      ctx.strokeRect(52, 356, 300, 60);
      ctx.fillStyle = xmp ? '#7fe6a8' : '#ffcf6b';
      ctx.font = F(26, true);
      ctx.fillText(xmp ? 'XMP I  已开启' : 'XMP  未开启', 74, 396);
      ctx.fillStyle = '#8ea0b6'; ctx.font = F(19);
      ctx.fillText(xmp ? 'DDR5-6400 CL30-38-38-96  1.35V' : '当前按 JEDEC 4800 保守频率运行', 380, 380);
      ctx.fillText(xmp ? '带宽 ≈ 102 GB/s（双通道）' : '开启 XMP 后带宽可提升约 33%', 380, 410);
      ctx.fillStyle = '#5f7fa0'; ctx.font = F(17);
      ctx.fillText('提示：XMP 是内存厂商预设的超频档案，开启后由主板自动套用频率/时序/电压。', 52, 468);
      ctx.fillText('F10 保存并退出   ESC 取消   DEL 进入 SETUP', 52, 502);
    },

    draw_osinstall(ctx, W, H) {
      const p = Math.min(1, this.data.progress || 0);
      ctx.fillStyle = '#0a2440';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eaf3ff';
      ctx.font = F(34, true);
      ctx.fillText('正在安装 NovaOS 12', W / 2, 190);
      ctx.font = F(20);
      ctx.fillStyle = '#a9c4e0';
      const stage = p < 0.3 ? '正在复制系统文件…' : p < 0.6 ? '正在准备要安装的文件…'
        : p < 0.85 ? '正在安装驱动程序…' : '正在完成配置…';
      ctx.fillText(stage, W / 2, 240);
      ctx.fillStyle = '#123a5e';
      ctx.fillRect(W / 2 - 260, 300, 520, 16);
      ctx.fillStyle = '#4ad6ff';
      ctx.fillRect(W / 2 - 260, 300, 520 * p, 16);
      ctx.font = F(22, true);
      ctx.fillStyle = '#eaf3ff';
      ctx.fillText(Math.round(p * 100) + '%', W / 2, 356);
      ctx.font = F(17);
      ctx.fillStyle = '#88a8c8';
      ctx.fillText('安装完成后会自动重启一次，这是正常现象', W / 2, 420);
    },

    draw_desktop(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0d2b46'); g.addColorStop(0.6, '#123c5e'); g.addColorStop(1, '#0a1b2c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const x = (i * 137 % W), y = (i * 89 % (H - 80));
        ctx.fillStyle = 'rgba(120,200,255,' + (0.03 + (i % 5) * 0.01) + ')';
        ctx.fillRect(x, y, 60, 2);
      }
      // 任务栏
      ctx.fillStyle = 'rgba(6,12,20,0.82)';
      ctx.fillRect(0, H - 48, W, 48);
      ctx.fillStyle = '#4ad6ff';
      ctx.fillRect(18, H - 36, 24, 24);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cfe0f0'; ctx.font = F(18);
      ctx.fillText('NovaOS 12  ·  已激活', 60, H - 18);
      ctx.textAlign = 'right';
      ctx.fillText('07:58', W - 24, H - 18);

      // 跑分窗口
      const bx = 150, by = 90, bw = 724, bh = 380;
      ctx.fillStyle = 'rgba(10,18,28,0.94)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#2a4a68'; ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#14283c';
      ctx.fillRect(bx, by, bw, 44);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e6eef7'; ctx.font = F(21, true);
      ctx.fillText('NovaMark 综合性能测试', bx + 18, by + 30);

      const score = this.data.score || 0;
      const rows = [
        ['CPU 多核', Math.round(score * 0.42) + ' 分', '#7fd2ff'],
        ['显卡图形', Math.round(score * 0.51) + ' 分', '#a48cff'],
        ['存储读写', '13872 MB/s', '#7fe6a8'],
        ['内存带宽', (this.data.xmp ? '102.4' : '76.8') + ' GB/s', this.data.xmp ? '#7fe6a8' : '#ffcf6b'],
      ];
      rows.forEach((r, i) => {
        const y = by + 100 + i * 56;
        ctx.fillStyle = '#8ea0b6'; ctx.font = F(20);
        ctx.fillText(r[0], bx + 30, y);
        ctx.fillStyle = r[2]; ctx.font = F(22, true);
        ctx.fillText(r[1], bx + 220, y);
        ctx.fillStyle = '#16283a';
        ctx.fillRect(bx + 400, y - 16, 280, 14);
        ctx.fillStyle = r[2];
        ctx.fillRect(bx + 400, y - 16, 280 * (0.55 + i * 0.11), 14);
      });
      ctx.fillStyle = '#e6eef7'; ctx.font = F(30, true);
      ctx.fillText('总分  ' + score, bx + 30, by + 350);
      ctx.fillStyle = this.data.xmp ? '#7fe6a8' : '#ffcf6b'; ctx.font = F(18);
      ctx.fillText(this.data.xmp ? '内存已开启 XMP，成绩正常' : '未开启 XMP，内存带宽损失约 25%', bx + 300, by + 350);
    },

    draw_error(ctx, W, H) {
      ctx.fillStyle = '#180a0a';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff7a5a'; ctx.font = F(40, true);
      ctx.fillText(this.data.title || '自检失败', W / 2, 200);
      ctx.fillStyle = '#e0b0a0'; ctx.font = F(22);
      (this.data.lines || []).forEach((l, i) => ctx.fillText(l, W / 2, 262 + i * 40));
    },
  };

  root.SCREENS = S;
})(window);
