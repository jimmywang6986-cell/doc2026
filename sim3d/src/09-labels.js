/* 贴图文字与图示：零件铭牌、墙面教学海报、白板 */
(function (root) {
  'use strict';

  const F = (px, bold) => (bold === false ? '' : 'bold ') + px
    + 'px "WenQuanYi Micro Hei", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
  const MONO = (px) => 'bold ' + px + 'px "WenQuanYi Micro Hei Mono", monospace';

  function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }

  function text(ctx, t, x, y, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left';
    ctx.fillText(t, x, y);
  }

  function grad(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    return g;
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0), s = (width || 4) * 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.4) * s, y1 - Math.sin(a - 0.4) * s);
    ctx.lineTo(x1 - Math.cos(a + 0.4) * s, y1 - Math.sin(a + 0.4) * s);
    ctx.closePath(); ctx.fill();
  }

  function registerAll() {
    const L = root.TEX.label;

    L('caseLogo', 256, 64, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#07090c');
      text(ctx, '星海 NOVA-01', w / 2, 42, F(30), '#8fdcff', 'center');
    });

    L('mbLabel', 256, 128, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#0a1410');
      text(ctx, 'NOVA', 16, 44, F(38), '#d8e6dc');
      text(ctx, 'Z-990 GAMING', 16, 76, F(24), '#8fb59c');
      text(ctx, 'ATX · DDR5 · PCIe 5.0', 16, 104, F(19, false), '#6d8f7c');
    });

    L('cpuTop', 256, 200, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#9aa0a8');
      const g = grad(ctx, 0, 0, w, h, [[0, '#b4bac2'], [0.5, '#8f959d'], [1, '#a8aeb6']]);
      rect(ctx, 0, 0, w, h, g);
      ctx.textAlign = 'center';
      text(ctx, 'NOVA', w / 2, 54, F(40), '#3a3f45', 'center');
      text(ctx, 'CORE X9-14900K', w / 2, 92, F(24), '#41464c', 'center');
      text(ctx, 'SRPX3  3.6GHz', w / 2, 124, MONO(20), '#4c5157', 'center');
      text(ctx, 'LGA1851  24C/32T', w / 2, 154, MONO(19), '#565b61', 'center');
      text(ctx, 'MADE IN NOVA CITY', w / 2, 182, MONO(15), '#5f646a', 'center');
    });

    L('pasteLabel', 256, 96, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#e9edf2');
      rect(ctx, 0, 0, w, 26, '#1b6fd6');
      text(ctx, '导热硅脂 TG-12', 10, 20, F(19), '#ffffff');
      text(ctx, '12.5 W/m·K', 10, 54, F(24), '#12305c');
      text(ctx, '非导电 · 4g', 10, 82, F(20, false), '#3a5573');
    });

    L('coolerTop', 400, 300, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#1a1d21');
      text(ctx, 'NOVA', w / 2, 130, F(76), '#d6dde6', 'center');
      text(ctx, 'FROST TOWER 6', w / 2, 186, F(34), '#8b96a3', 'center');
      text(ctx, '6 热管 · 260W TDP', w / 2, 232, F(26, false), '#6f7a86', 'center');
    });

    L('ramLabel', 300, 96, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#12151a');
      text(ctx, 'NOVA VENOM', 12, 38, F(30), '#e6ecf3');
      text(ctx, 'DDR5-6400 CL30 · 16GB', 12, 70, F(21, false), '#93a0b0');
      rect(ctx, 12, 80, 120, 4, '#e0453c');
    });

    L('gpuTop', 512, 200, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#0c0e12');
      text(ctx, 'NOVA  RTV-5080', 24, 78, F(58), '#e7eef7');
      text(ctx, '16GB GDDR7 · 320W', 24, 130, F(30, false), '#8ea0b6');
      rect(ctx, 24, 152, 300, 6, grad(ctx, 24, 0, 324, 0, [[0, '#4ad6ff'], [1, '#a44dff']]));
    });

    L('psuLabel', 400, 300, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#d6dae0');
      rect(ctx, 0, 0, w, 54, '#111418');
      text(ctx, 'NOVA POWER  850W', 14, 38, F(28), '#ffffff');
      text(ctx, 'ATX 3.1 · 80 PLUS 金牌', 14, 92, F(24), '#1a1f26');
      text(ctx, '+12V   70.8A   850W', 14, 132, MONO(22), '#2a323c');
      text(ctx, '+5V    20A   +3.3V 20A', 14, 166, MONO(22), '#2a323c');
      text(ctx, '全模组 · 全日系电容', 14, 206, F(22, false), '#3c4654');
      rect(ctx, 14, 226, 200, 6, '#c8a020');
      text(ctx, '⚠ 内有高压，请勿拆解', 14, 268, F(20, false), '#a02020');
    });

    L('m2Label', 256, 96, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#111418');
      text(ctx, 'NOVA SSD 2TB', 10, 34, F(26), '#e8eef5');
      text(ctx, 'M.2 2280 · PCIe 5.0 x4', 10, 62, F(18, false), '#93a0b0');
      text(ctx, '14000/12000 MB/s', 10, 88, MONO(18), '#5fd3a0');
    });

    L('ssdLabel', 400, 300, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#1b2430');
      text(ctx, 'NOVA', 20, 70, F(52), '#e8eef5');
      text(ctx, 'SATA SSD 1TB', 20, 120, F(32), '#9fb3c8');
      text(ctx, '2.5" · 6Gb/s · 560MB/s', 20, 164, F(22, false), '#7d90a4');
      rect(ctx, 20, 190, 160, 5, '#3f9fd6');
    });

    L('hddLabel', 420, 300, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#dfe3e8');
      rect(ctx, 0, 0, w, 60, '#20242a');
      text(ctx, 'NOVA ARCHIVE 8TB', 16, 42, F(30), '#ffffff');
      text(ctx, '3.5" HDD · 7200 RPM', 16, 108, F(26), '#20242a');
      text(ctx, 'SATA 6Gb/s · 256MB 缓存', 16, 146, F(22, false), '#414a55');
      text(ctx, '⚠ 机械硬盘怕震动，请轻放', 16, 200, F(20, false), '#8a3a2a');
      text(ctx, 'S/N NV-8842-0031-XH', 16, 250, MONO(18), '#5a636e');
    });

    /* ---------------- 墙面教学海报 ---------------- */
    L('posterFlow', 700, 1000, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#101820');
      rect(ctx, 0, 0, w, 110, '#1b6fd6');
      text(ctx, '装机标准流程', w / 2, 74, F(56), '#ffffff', 'center');
      const steps = [
        '1. 台面除静电，主板放防静电垫',
        '2. 装 CPU：对准三角与缺口，零阻力落座',
        '3. 装内存：优先 A2 / B2 双通道',
        '4. 装 M.2 固态：斜插到底再压平上螺丝',
        '5. 涂硅脂：黄豆大小一点即可',
        '6. 扣散热器：对角均匀上力',
        '7. 机箱装铜柱 → 主板入箱上螺丝',
        '8. 装电源 → 装显卡 → 装硬盘',
        '9. 接线：24pin / EPS / PCIe / SATA / 前面板',
        '10. 理线合盖 → 点亮 → BIOS 开 XMP → 装系统',
      ];
      steps.forEach((s, i) => {
        text(ctx, s, 40, 190 + i * 78, F(30, false), i % 2 ? '#c9d6e4' : '#eaf2fb');
        rect(ctx, 40, 205 + i * 78, w - 80, 2, '#22303f');
      });
    });

    L('posterAirflow', 700, 520, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#0d1218');
      text(ctx, '机箱风道：前进后出', 30, 60, F(42), '#7fd2ff');
      rect(ctx, 120, 110, 460, 340, '#161d26');
      ctx.strokeStyle = '#39485a'; ctx.lineWidth = 3;
      ctx.strokeRect(120, 110, 460, 340);
      arrow(ctx, 90, 200, 260, 200, '#4ad6ff', 7);
      arrow(ctx, 90, 330, 260, 330, '#4ad6ff', 7);
      arrow(ctx, 420, 170, 610, 170, '#ff7a5a', 7);
      text(ctx, '冷风进', 60, 175, F(26), '#4ad6ff');
      text(ctx, '热风出', 470, 145, F(26), '#ff7a5a');
      text(ctx, '进风量 ≥ 出风量 → 正压，少积灰', 40, 490, F(26, false), '#a9b7c6');
    });

    L('posterStatic', 520, 700, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#f5c518');
      rect(ctx, 20, 20, w - 40, h - 40, '#141414');
      text(ctx, '⚠ 静电警告', w / 2, 120, F(52), '#f5c518', 'center');
      const lines = [
        '人体静电可达上千伏',
        '足以击穿芯片内部结构',
        '',
        '· 先摸金属水管/机箱放电',
        '· 佩戴防静电手环',
        '· 手持板卡只碰边缘',
        '· 不要在化纤地毯上装机',
      ];
      lines.forEach((l, i) => text(ctx, l, w / 2, 200 + i * 62, F(30, false), '#f0f0f0', 'center'));
    });

    L('shopSign', 900, 260, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#0a0f14');
      text(ctx, '星海电脑维修部', w / 2, 130, F(96), '#ffd479', 'center');
      text(ctx, '自 1998 年营业 · 装机 / 维修 / 数据恢复', w / 2, 200, F(34, false), '#9fb0c0', 'center');
    });

    L('whiteboard', 1000, 700, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#f7f9fa');
      text(ctx, '今日订单 #2026-08', 40, 74, F(44), '#1b6fd6');
      text(ctx, '客户：柯小雨（高一，编程竞赛）', 40, 134, F(30, false), '#2b3440');
      const rows = [
        ['CPU', 'NOVA X9-14900K'],
        ['主板', 'NOVA Z-990 ATX'],
        ['内存', 'DDR5-6400 16G × 2'],
        ['固态', 'M.2 PCIe5.0 2TB'],
        ['显卡', 'RTV-5080 16G'],
        ['电源', '850W 金牌全模组'],
        ['机箱', '星海 NOVA-01 侧透'],
      ];
      rows.forEach((r, i) => {
        text(ctx, r[0], 60, 200 + i * 62, F(28), '#5a6472');
        text(ctx, r[1], 260, 200 + i * 62, F(28, false), '#20262e');
        rect(ctx, 60, 214 + i * 62, w - 120, 1, '#dfe4ea');
      });
      text(ctx, '备注：务必开 XMP，跑分留档', 60, 660, F(26, false), '#c0392b');
    });

    L('plateBlank', 256, 64, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#0d1117');
    });

    L('skyline', 1024, 320, (ctx, w, h) => {
      const sky = grad(ctx, 0, 0, 0, h, [[0, '#8fb6e8'], [0.45, '#cfe0f2'], [0.78, '#f3d9bd'], [1, '#e8bf9a']]);
      rect(ctx, 0, 0, w, h, sky);
      // 云
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 14; i++) {
        const cx = (i * 137) % w, cy = 20 + (i * 53) % 70, r = 18 + (i % 4) * 12;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 2.2, r * 0.7, 0, 0, 7);
        ctx.fill();
      }
      // 远景楼群（两层，近处更深）
      const band = (baseY, colr, seed, minH, maxH) => {
        ctx.fillStyle = colr;
        let x = -20;
        let n = seed;
        while (x < w + 40) {
          n = (n * 9301 + 49297) % 233280;
          const r = n / 233280;
          const bw = 26 + r * 58;
          const bh = minH + ((n >> 4) % 100) / 100 * (maxH - minH);
          ctx.fillRect(x, baseY - bh, bw, bh);
          if (r > 0.7) ctx.fillRect(x + bw * 0.35, baseY - bh - 22, bw * 0.3, 22);
          x += bw + 6 + r * 10;
        }
      };
      band(h, 'rgba(120,140,168,0.55)', 7, 60, 150);
      band(h, 'rgba(72,88,112,0.85)', 91, 80, 200);
      // 窗户灯光
      ctx.fillStyle = 'rgba(255,226,160,0.75)';
      for (let i = 0; i < 420; i++) {
        const x = (i * 71) % w, y = h - 12 - ((i * 37) % 170);
        if ((i * 13) % 5 === 0) ctx.fillRect(x, y, 4, 6);
      }
    });

    L('bannerAd', 384, 960, (ctx, w, h) => {
      const g = grad(ctx, 0, 0, 0, h, [[0, '#0d1b34'], [0.55, '#14406b'], [1, '#0a1120']]);
      rect(ctx, 0, 0, w, h, g);
      ctx.textAlign = 'center';
      text(ctx, '星海电脑', w / 2, 130, F(64), '#ffffff', 'center');
      text(ctx, '整机定制 · 装机服务', w / 2, 186, F(30), '#7fd8ff', 'center');
      rect(ctx, 52, 226, w - 104, 3, '#2f7fb8');
      const items = ['· 免费装机指导', '· 原厂质保 3 年', '· 上门维修', '· 数据恢复', '· 二手回收'];
      items.forEach((t, i) => text(ctx, t, 66, 300 + i * 62, F(30), '#d8e8f8', 'left'));
      rect(ctx, 60, 640, w - 120, 190, 'rgba(255,255,255,0.07)');
      text(ctx, 'NOVA', w / 2, 720, F(58), '#8fe3ff', 'center');
      text(ctx, 'X9 平台', w / 2, 782, F(38), '#ffd580', 'center');
      text(ctx, '营业时间 09:00 - 21:00', w / 2, 900, F(26), '#9fb6cc', 'center');
    });

    L('tvAd', 768, 448, (ctx, w, h) => {
      const g = grad(ctx, 0, 0, w, h, [[0, '#0b1a2e'], [0.5, '#123a5c'], [1, '#2a1146']]);
      rect(ctx, 0, 0, w, h, g);
      ctx.textAlign = 'left';
      text(ctx, '星海电脑 · 整机定制', 46, 92, F(50), '#8fe3ff');
      text(ctx, 'NOVA X9 平台 · 高刷电竞', 46, 148, F(30), '#cfe6ff');
      // 柱状跑分图
      const bars = [[0.55, '#3fa7ff', '上代'], [0.78, '#5be0a0', '本机'], [0.42, '#ffb45b', '入门']];
      bars.forEach((b, i) => {
        const bh = b[0] * 190;
        const x = 90 + i * 150;
        rect(ctx, x, 380 - bh, 92, bh, b[1]);
        text(ctx, b[2], x + 12, 410, F(24), '#9fb6cc');
      });
      rect(ctx, 560, 190, 160, 190, 'rgba(255,255,255,0.06)');
      text(ctx, '4K', 596, 268, F(58), '#ffffff');
      text(ctx, '144Hz', 578, 330, F(34), '#7ff0ff');
      rect(ctx, 0, h - 42, w, 42, 'rgba(4,10,18,0.7)');
      text(ctx, '装机 · 维修 · 数据恢复    营业中', 40, h - 12, F(26), '#ffd580');
    });

    L('neonRepair', 512, 256, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#05060a');
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff3d7f';
      ctx.shadowBlur = 26;
      text(ctx, '维 修', w / 2, 150, F(110), '#ff86b5', 'center');
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff4f8b';
      ctx.lineWidth = 5;
      ctx.strokeRect(28, 28, w - 56, h - 56);
      text(ctx, '24H', w / 2, 210, F(34), '#7ff0ff', 'center');
    });

    L('photoGrandpa', 420, 320, (ctx, w, h) => {
      const g = grad(ctx, 0, 0, 0, h, [[0, '#c9b28a'], [1, '#8f7655']]);
      rect(ctx, 0, 0, w, h, g);
      rect(ctx, 0, h - 54, w, 54, 'rgba(20,16,12,0.55)');
      // 简笔画：老人 + 一台主机
      ctx.fillStyle = '#5a4632';
      ctx.beginPath(); ctx.arc(150, 130, 42, 0, 7); ctx.fill();
      ctx.fillRect(108, 178, 84, 96);
      ctx.fillStyle = '#3f3a34';
      ctx.fillRect(250, 150, 96, 124);
      ctx.fillStyle = '#6f8fa8';
      ctx.fillRect(262, 166, 72, 30);
      text(ctx, '1998 · 开店那天', w / 2, h - 18, F(26), '#f0e6d6', 'center');
    });

    L('calendar', 320, 420, (ctx, w, h) => {
      rect(ctx, 0, 0, w, h, '#f6f4ef');
      rect(ctx, 0, 0, w, 92, '#c0392b');
      ctx.textAlign = 'center';
      text(ctx, '2026 年 8 月', w / 2, 62, F(38), '#ffffff', 'center');
      ctx.font = F(22, false);
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      days.forEach((d, i) => text(ctx, d, 26 + i * 45, 128, F(20), '#8a8f96', 'center'));
      let day = 1;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          if (day > 31) break;
          const x = 26 + c * 45, y = 168 + r * 46;
          if (day === 20) {
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(x, y - 7, 18, 0, 7); ctx.fill();
          }
          text(ctx, String(day), x, y, F(21, false), day === 20 ? '#fff' : '#2c3038', 'center');
          day++;
        }
      }
      text(ctx, '今日：交付柯小雨的机器', w / 2, 400, F(19), '#7a5b3a', 'center');
    });

    /** 货架零件标签（按名称动态生成） */
    root.LABELS = {
      partPlate(name, sub) {
        return root.TEX.label('plate:' + name, 256, 64, (ctx, w, h) => {
          rect(ctx, 0, 0, w, h, '#0c1016');
          rect(ctx, 0, 0, 5, h, '#4ad6ff');
          text(ctx, name, 16, 30, F(24), '#e6eef7');
          text(ctx, sub || '', 16, 54, F(17, false), '#8ea0b6');
        });
      },
    };
  }

  root.LABELS_INIT = registerAll;
})(window);
