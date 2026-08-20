/* 零件资料库与装机步骤定义（含知识卡片文案） */
(function (root) {
  'use strict';

  const PI = Math.PI;

  /** 物理零件：可拾取、可安装 */
  const PARTS = [
    {
      id: 'mb', kind: 'mb', name: '主板', full: 'NOVA Z-990 GAMING (ATX)', cat: '主板',
      model: 'motherboard', movable: true,
      shelf: [-3.86, 0.985, -1.60], shelfRot: [-PI / 2, 0.2, 0],
      hold: { pos: [0.02, -0.20, -0.52], rot: [-1.15, 0.25, 0] },
      spec: ['板型 ATX（305 × 244 mm）', '插槽 LGA1851 · Z990 芯片组',
        '内存 4 × DDR5，最高 192GB', '扩展 PCIe 5.0 x16 + 两个 M.2', '供电 16+1+2 相，8 层 PCB'],
      lesson: {
        title: '主板：整机的神经系统',
        body: '主板本身不产生算力，它的价值在于「连接」与「供电」。CPU 通过插座直连内存与 PCIe 通道，'
          + '其余低速设备（USB、SATA、网卡）走芯片组。板子上密密麻麻的走线就是这些通道，'
          + '因此高频内存和 PCIe 5.0 显卡对 PCB 层数、走线拓扑要求很高。',
        tips: ['板型决定机箱兼容：ATX > M-ATX > ITX。',
          'CPU 左上的散热片下面是 VRM 供电模块，相数越多、越厚的散热片越能撑高功耗 CPU。',
          '主板背面有裸露焊点，必须放在防静电垫或包装盒上，绝不能直接放桌面或金属上。'],
      },
    },
    {
      id: 'cpu', kind: 'cpu', name: 'CPU 处理器', full: 'NOVA CORE X9-14900K', cat: '核心部件',
      model: 'cpu', shelf: [-3.86, 1.502, -1.70], shelfRot: [-PI / 2, 0, 0],
      hold: { pos: [0.09, -0.10, -0.26], rot: [-0.9, 0.3, 0] },
      spec: ['24 核 32 线程 · 睿频 5.8GHz', '插座 LGA1851（1851 个触点）',
        '三级缓存 36MB', '基础功耗 125W，睿频可达 253W', '内存控制器 DDR5-6400 原生'],
      lesson: {
        title: 'CPU：负责“思考”的大脑',
        body: 'CPU 把内存里的指令取出来、译码、计算，再把结果写回。核心数决定能同时跑多少任务，'
          + '频率与 IPC 决定单个任务多快。现代 CPU 还集成了内存控制器和 PCIe 控制器，'
          + '所以它直连内存和显卡——这也是为什么 CPU 一换代，往往整个平台（插座）都得换。',
        tips: ['LGA 平台的针脚在主板上，CPU 底部是触点；千万别用手摸、别掉进插座里。',
          '安装靠自重落座：对准三角标与两侧缺口，放下去应该是「零阻力」的。',
          '压杆需要一点力气才能压到底，这是正常的——但如果放下去就顶住了，一定是方向错了。'],
      },
    },
    {
      id: 'ram1', kind: 'ram', name: '内存条 ①', full: 'NOVA VENOM DDR5-6400 16GB', cat: '内存',
      model: 'ram', modelOpts: { color: [0.16, 0.17, 0.20], rgb: [0.45, 0.78, 1.0] },
      shelf: [-3.86, 1.512, -1.42], shelfRot: [-PI / 2, 0.1, 0],
      hold: { pos: [0.10, -0.11, -0.30], rot: [-0.4, 0.5, 0.3] },
      spec: ['DDR5-6400 CL30 · 16GB', '工作电压 1.35V（XMP）', '带宽 51.2 GB/s（单条）', '带铝合金马甲与 RGB 导光条'],
      lesson: {
        title: '内存：CPU 的高速工作台',
        body: '内存是易失性存储，速度比固态硬盘快几十倍，用来存放正在运行的程序与数据。'
          + '容量不足时系统会把数据往硬盘上「换页」，帧率与响应就会断崖式下跌。'
          + 'DDR5 单条内部已经是双 32 位子通道设计，但平台层面仍需两条才能组成完整双通道。',
        tips: ['插两条时优先 A2 + B2（离 CPU 第 2、4 个槽），信号完整性最好。',
          '默认只跑 JEDEC 频率（如 4800），必须在 BIOS 开启 XMP / EXPO 才能跑到标称 6400。',
          '插入时先掰开卡扣，对准防呆缺口，两端均匀下压到「咔哒」一声。'],
      },
    },
    {
      id: 'ram2', kind: 'ram', name: '内存条 ②', full: 'NOVA VENOM DDR5-6400 16GB', cat: '内存',
      model: 'ram', modelOpts: { color: [0.16, 0.17, 0.20], rgb: [0.62, 0.55, 1.0] },
      shelf: [-3.86, 1.512, -1.27], shelfRot: [-PI / 2, -0.1, 0],
      hold: { pos: [0.10, -0.11, -0.30], rot: [-0.4, 0.5, 0.3] },
      spec: ['与 ①同一套装（同批次）', '双通道需两条同规格', 'CL30 时序 · 6400MT/s'],
      lesson: {
        title: '为什么内存要「成套买」',
        body: '同一套装的两条内存出自同一批颗粒，时序、电压曲线一致，能稳定跑在标称 XMP 下。'
          + '混用不同品牌/批次时，内存控制器只能按最保守的参数训练，容易出现开不了 XMP、'
          + '甚至随机蓝屏。若必须混插，请手动降频降压试稳定性。',
        tips: ['双通道相比单通道，集显性能可提升 40% 以上，游戏最低帧也更稳。',
          '四条满插会加重内存控制器负担，高频下反而更难点亮。'],
      },
    },
    {
      id: 'm2', kind: 'm2', name: 'M.2 固态硬盘', full: 'NOVA SSD 2TB PCIe 5.0', cat: '存储',
      model: 'ssdM2', shelf: [-3.86, 1.498, -1.02], shelfRot: [-PI / 2, 0, 0],
      hold: { pos: [0.08, -0.09, -0.24], rot: [-1.0, 0.3, 0] },
      spec: ['M.2 2280 · PCIe 5.0 x4 · NVMe', '顺序读取 14000 MB/s', '2TB TLC + 独立缓存', '主控温度上限 70℃，需散热马甲'],
      lesson: {
        title: 'NVMe 固态：直连 CPU 的高速通道',
        body: 'M.2 NVMe 盘直接走 PCIe 通道，队列深度远高于 SATA 的 AHCI 协议，'
          + '所以随机读写与响应延迟碾压机械硬盘。2280 表示 22mm 宽、80mm 长；'
          + '靠近 CPU 的那个 M.2 槽通常直连 CPU（速度最快），其余走芯片组。',
        tips: ['插入时约 30° 斜插到底，再压平，最后用螺丝或免工具卡扣固定。',
          '装散热马甲前记得撕掉导热垫上的透明保护膜——这是最常见的翻车点。',
          '系统盘建议选直连 CPU 的 M.2_1 插槽。'],
      },
    },
    {
      id: 'm2hs', kind: 'm2hs', name: 'M.2 散热马甲', full: '原装铝合金马甲 + 导热垫', cat: '存储',
      model: 'm2Heatsink', shelf: [-3.86, 1.502, -0.86], shelfRot: [-PI / 2, 0.15, 0],
      hold: { pos: [0.08, -0.09, -0.25], rot: [-1.0, 0.3, 0] },
      spec: ['铝合金鳍片 + 硅脂导热垫', '可降低主控温度 15~25℃'],
      lesson: {
        title: '为什么固态也要散热',
        body: 'PCIe 5.0 固态主控发热量接近小功率 CPU，温度过高会触发降速保护（Throttling），'
          + '连续写入速度可能从 12GB/s 掉到 2GB/s。马甲通过导热垫把主控与颗粒的热量导到鳍片，'
          + '再由机箱风道带走。',
        tips: ['导热垫两面都有保护膜，装前务必撕掉。', '不要拧太紧，压裂颗粒或主控是不可逆的。'],
      },
    },
    {
      id: 'paste', kind: 'paste', name: '导热硅脂', full: 'TG-12 高导热硅脂 4g', cat: '耗材',
      model: 'thermalPasteTube', shelf: [-3.86, 1.506, -0.62], shelfRot: [0, 0.4, 0],
      hold: { pos: [0.11, -0.10, -0.26], rot: [0.1, -0.4, 0.5] },
      spec: ['导热系数 12.5 W/m·K', '非导电、不固化', '用量：中心一点，约黄豆大小'],
      lesson: {
        title: '硅脂：填平肉眼看不见的缝隙',
        body: 'CPU 顶盖与散热器底座看着都很平，实际上都有微米级凹凸，直接贴合时中间夹的是空气——'
          + '而空气的导热系数只有硅脂的 1/500。硅脂的作用不是「导热」，而是「赶走空气」，'
          + '所以越薄越好，只要能被压力铺满即可。',
        tips: ['中心一点法最省心：扣上散热器后压力会自然铺开。',
          '不要涂满整个顶盖、不要涂厚，多余的会溢出到主板上。',
          '若拆下重装，必须清干净旧硅脂（无水酒精 + 无纺布）再重涂。'],
      },
    },
    {
      id: 'cooler', kind: 'cooler', name: 'CPU 散热器', full: 'NOVA FROST TOWER 6（6 热管风冷）', cat: '散热',
      model: 'coolerBody', shelf: [-3.86, 0.965, -0.95], shelfRot: [0, 0.3, 0],
      hold: { pos: [0.06, -0.22, -0.46], rot: [0.0, 0.4, 0] },
      children: [
        { model: 'fanCpuFrame', pos: [0.0715, 0.11, 0.048], rot: [0, PI / 2, 0] },
        { model: 'fanCpuRotor', pos: [0.0715, 0.11, 0.048], rot: [0, PI / 2, 0], spin: 2, speedIdle: 0 },
      ],
      spec: ['6 根 6mm 热管 · 直触底座', '压制 260W TDP', '120mm PWM 风扇（500~1800rpm）', '塔高 158mm，注意机箱限高'],
      lesson: {
        title: '散热器：把热量“搬”出去的接力赛',
        body: '热量从 CPU 顶盖 → 硅脂 → 铜底座 → 热管（内部工作液汽化-凝结循环）→ 鳍片 → 空气。'
          + '任何一环导热不良，前面做得再好也没用。风冷塔靠鳍片面积和风量，'
          + '一体式水冷（AIO）则用冷排把热量搬到机箱边缘，本质仍是风冷。',
        tips: ['对角线交替上力，每颗螺丝拧一点，避免单边压偏。',
          '风扇要吹向机箱后部出风口，形成「前进后出」的直线风道。',
          '装大塔前先确认内存马甲高度与机箱侧板限高。'],
      },
    },
    {
      id: 'gpu', kind: 'gpu', name: '显卡', full: 'NOVA RTV-5080 16GB', cat: '核心部件',
      model: 'gpuBody', shelf: [-3.84, 0.968, -0.20], shelfRot: [0, 0.15, 0],
      hold: { pos: [0.04, -0.20, -0.50], rot: [0.2, 0.5, 0] },
      children: [
        { model: 'fanGpuFrame', pos: [0.05, -0.0455, 0.055], rot: [PI / 2, 0, 0] },
        { model: 'fanGpuRotor', pos: [0.05, -0.0455, 0.055], rot: [PI / 2, 0, 0], spin: 2, speedIdle: 0 },
        { model: 'fanGpuFrame', pos: [0.16, -0.0455, 0.055], rot: [PI / 2, 0, 0] },
        { model: 'fanGpuRotor', pos: [0.16, -0.0455, 0.055], rot: [PI / 2, 0, 0], spin: 2, speedIdle: 0 },
      ],
      spec: ['16GB GDDR7 · 256bit', 'PCIe 5.0 x16 接口', '整卡功耗 320W，需 8pin × 1', '三风扇 · 2.5 槽厚 · 长 290mm'],
      lesson: {
        title: '显卡：并行计算的怪兽',
        body: 'CPU 擅长复杂分支，GPU 擅长成千上万个简单任务同时算——渲染、AI 推理都属于后者。'
          + '显存容量决定能装多大的贴图/模型，位宽×频率决定带宽。显卡插在直连 CPU 的第一根'
          + ' PCIe x16 槽上带宽最大，插到下面的槽可能只有 x4。',
        tips: ['插到底会听到卡扣「咔」的一声，装完务必上挡板螺丝，否则显卡会被自身重量压歪。',
          '独立供电必须插满，只插一半会触发保护、无法点亮。',
          '大显卡建议加装显卡支架，长期悬臂会让 PCIe 插槽变形。'],
      },
    },
    {
      id: 'psu', kind: 'psu', name: '电源', full: 'NOVA POWER 850W 金牌全模组', cat: '供电',
      model: 'psu', shelf: [-3.86, 0.478, -1.35], shelfRot: [0, 0.2, 0],
      hold: { pos: [0.05, -0.20, -0.46], rot: [0.15, 0.45, 0] },
      spec: ['额定 850W · 80 PLUS 金牌', 'ATX 3.1 / PCIe 5.1 支持', '+12V 单路 70.8A', '全模组线材 · 全日系电容'],
      lesson: {
        title: '电源：整机唯一直接接市电的部件',
        body: '电源把 220V 交流整流、变压成 +12V / +5V / +3.3V 直流。现代平台几乎所有大功率'
          + '负载（CPU、显卡）都吃 +12V，所以看电源要看 +12V 单路输出能力，而不是虚标的峰值总功率。'
          + '80 PLUS 认证描述的是转换效率，金牌约 90%，省下的电就是不会变成热的部分。',
        tips: ['风扇朝下安装（机箱底部有进风口 + 防尘网），散热更好。',
          '功率预算：整机峰值 × 1.3 左右留余量，长期满载会缩短寿命。',
          '模组线材不要跨品牌混用，同一接口的针脚定义可能完全不同，会烧硬件。'],
      },
    },
    {
      id: 'ssd', kind: 'ssd', name: 'SATA 固态硬盘', full: 'NOVA SATA SSD 1TB 2.5"', cat: '存储',
      model: 'ssdSata', shelf: [-3.86, 1.502, -0.34], shelfRot: [0, 0.1, 0],
      hold: { pos: [0.09, -0.11, -0.28], rot: [0.1, 0.5, 0] },
      spec: ['2.5 英寸 · SATA 6Gb/s', '顺序读取 560 MB/s', '1TB · 用作游戏仓库盘'],
      lesson: {
        title: 'SATA 与 NVMe 的差别',
        body: 'SATA 通道理论带宽只有 6Gb/s（约 600MB/s），而且走的是为机械盘设计的 AHCI 协议，'
          + '队列深度只有 32。NVMe 走 PCIe，队列深度 64K，延迟更低。'
          + '但 SATA SSD 便宜、够用，很适合当仓库盘。',
        tips: ['SATA 盘需要两根线：数据线接主板 SATA 口，供电线接电源。',
          'SATA 数据线插口是 L 形防呆，插不进去就是方向反了。'],
      },
    },
    {
      id: 'hdd', kind: 'hdd', name: '机械硬盘', full: 'NOVA ARCHIVE 8TB 7200rpm', cat: '存储',
      model: 'hdd', shelf: [-3.86, 1.508, -0.08], shelfRot: [0, -0.1, 0],
      hold: { pos: [0.07, -0.13, -0.32], rot: [0.1, 0.4, 0] },
      spec: ['3.5 英寸 · 7200 转', '256MB 缓存 · SATA 6Gb/s', '8TB 冷数据存储', '工作时禁止搬动'],
      lesson: {
        title: '机械硬盘：便宜的大容量仓库',
        body: '盘片以 7200 转旋转，磁头悬浮在几纳米高度读写，所以怕震动、怕跌落。'
          + '单位容量价格仍是所有存储里最低的，适合放录像、备份等冷数据。',
        tips: ['装在带减震胶垫的硬盘笼里，能明显降低噪音与共振。',
          '通电状态下绝对不要搬动机箱。',
          '重要数据要遵守 3-2-1 原则：3 份副本、2 种介质、1 份异地。'],
      },
    },
    {
      id: 'fan1', kind: 'fan', name: '机箱风扇 ①', full: '120mm ARGB PWM 风扇', cat: '散热',
      model: 'fan120Frame', shelf: [-3.86, 1.555, 0.26], shelfRot: [PI / 2, 0, 0],
      hold: { pos: [0.09, -0.13, -0.30], rot: [0.2, 0.4, 0] },
      children: [{ model: 'fan120Rotor', pos: [0, 0, 0], rot: [0, 0, 0], spin: 2, speedIdle: 0 }],
      spec: ['120 × 120 × 25 mm', '转速 500~1800rpm（PWM 4pin）', '风量 62 CFM · 噪音 22dBA', 'ARGB 导光环'],
      lesson: {
        title: '机箱风扇与风道',
        body: '机箱内的空气必须「有进有出」。前面板进冷风、后面板与顶部排热风，'
          + '形成从前下到后上的斜向直线风道，最短路径带走 CPU 与显卡的热量。'
          + '进风略大于出风（正压）能减少缝隙积灰。',
        tips: ['风扇外框的箭头指向出风方向；扇叶那一面是进风面。',
          '4pin PWM 可无级调速，3pin 只能电压调速。',
          '前面板装防尘网时，进风阻力会变大，建议前进风多加一把。'],
      },
    },
    {
      id: 'fan2', kind: 'fan', name: '机箱风扇 ②', full: '120mm ARGB PWM 风扇', cat: '散热',
      model: 'fan120Frame', shelf: [-3.86, 1.555, 0.46], shelfRot: [PI / 2, 0, 0],
      hold: { pos: [0.09, -0.13, -0.30], rot: [0.2, 0.4, 0] },
      children: [{ model: 'fan120Rotor', pos: [0, 0, 0], rot: [0, 0, 0], spin: 2, speedIdle: 0 }],
      spec: ['与 ①同型号', '用于前面板第二进风位'],
      lesson: {
        title: '为什么进风要两把',
        body: '前面板通常有防尘网与网孔，静压损失大。两把进风可以在同样转速下提供更充足的'
          + '冷空气，显卡这类「吸机箱内空气」的部件受益最明显。',
        tips: ['同一区域尽量用同型号风扇，避免转速不同互相抢风。'],
      },
    },
    {
      id: 'fan3', kind: 'fan', name: '机箱风扇 ③', full: '120mm ARGB PWM 风扇', cat: '散热',
      model: 'fan120Frame', shelf: [-3.86, 1.555, 0.66], shelfRot: [PI / 2, 0, 0],
      hold: { pos: [0.09, -0.13, -0.30], rot: [0.2, 0.4, 0] },
      children: [{ model: 'fan120Rotor', pos: [0, 0, 0], rot: [0, 0, 0], spin: 2, speedIdle: 0 }],
      spec: ['与 ①同型号', '用于机箱后部排风位'],
      lesson: {
        title: '后部排风：CPU 热量的出口',
        body: '后置风扇正对 CPU 散热器出风侧，把塔式散热器吹出来的热风直接排出机箱，'
          + '避免热空气在机箱内循环。若这把风扇装反（往里吹），CPU 温度通常会上升 5~10℃。',
        tips: ['排风位只需一把，重点是别装反。'],
      },
    },
    {
      id: 'standoff', kind: 'standoff', name: '主板铜柱', full: 'M3 六角铜柱 × 9 + 螺丝', cat: '安装件',
      model: 'standoffBag', shelf: [-3.86, 1.512, 0.95], shelfRot: [0, 0.2, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['M3 螺纹 · 高 6mm', 'ATX 需 9 颗', '黄铜材质，导电兼导热'],
      lesson: {
        title: '铜柱：主板与机箱之间的绝缘间距',
        body: '铜柱让主板背面的焊点与机箱钣金保持 6mm 距离。少装一颗，主板会因为受力不均而弯曲；'
          + '多装一颗（装在没有对应孔位的地方），它就会顶在主板背面的走线上——'
          + '通电瞬间短路，主板与 CPU 可能一起报废。',
        tips: ['先按板型（ATX/M-ATX）确认孔位，宁少勿多。',
          '装完主板轻轻按压四角，不应有明显下陷或异响。'],
      },
    },
    {
      id: 'screwdriver', kind: 'tool_screw', name: '十字螺丝刀', full: 'PH2 带磁螺丝刀', cat: '工具',
      model: 'screwdriver', shelf: [-1.15, 0.958, -2.72], shelfRot: [0, 0.6, 0],
      hold: { pos: [0.14, -0.14, -0.30], rot: [0.0, -0.8, 0.6] },
      keep: true,
      spec: ['PH2 十字头 · 带磁', '装机 90% 的螺丝都用它'],
      lesson: {
        title: '工具与手感',
        body: '装机只需一把带磁的 PH2 十字螺丝刀。带磁能吸住螺丝，避免掉进机箱缝隙；'
          + '拧螺丝的原则是「对角、分次、适度」——感觉到阻力明显增加就停，钣金和 PCB 都很软。',
        tips: ['不要用电动螺丝刀高扭矩硬拧主板螺丝。', '掉进机箱的螺丝一定要找出来再通电。'],
      },
    },
    {
      id: 'sidepanel', kind: 'sidepanel', name: '侧透玻璃侧板', full: '4mm 钢化玻璃侧板', cat: '机箱',
      model: 'sidePanel', shelf: [1.42, 0.30, -2.55], shelfRot: [0.12, 0.25, 0],
      hold: { pos: [0.03, -0.18, -0.50], rot: [0.1, 0.3, 0] },
      spec: ['4mm 钢化玻璃 · 手拧螺丝固定', '装上后机箱风道才成立'],
      lesson: {
        title: '合上侧板才算完工',
        body: '很多人裸机测试后就忘了装侧板。少了侧板，机箱内的定向风道就不存在了，'
          + '前进后出变成「各吹各的」，显卡与 CPU 温度反而可能更高（尤其是水冷/大塔）。'
          + '钢化玻璃怕点应力，四角手拧螺丝不要拧死。',
        tips: ['先理线再合盖，线材不要被侧板压住或卷进风扇。'],
      },
    },
    /* ------- 线材 ------- */
    {
      id: 'c24', kind: 'c24', name: '24pin 主板供电线', full: 'ATX 24-pin 主供电', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.052, pins: 12, strands: 8, color: [0.07, 0.07, 0.08] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, -1.30], shelfRot: [0, 0.3, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['24 针（20+4）· 主板全域供电', '提供 +12V / +5V / +3.3V 与 PS_ON 信号'],
      lesson: {
        title: '24pin：不只是供电，还是开机信号线',
        body: '24pin 里有一根绿色的 PS_ON#。主板把它拉低，电源才会启动——这就是「短接跳线开机」的原理。'
          + '还有一根 PWR_OK 用于告知主板电压已稳定。所以 24pin 没插好，按电源键会毫无反应。',
        tips: ['插到底会听到卡扣咔哒声，硬插不进请检查方向（卡扣一侧朝外）。',
          '拔的时候一定先按住卡扣，硬拔会把插座从主板上撕下来。'],
      },
    },
    {
      id: 'ceps', kind: 'ceps', name: 'CPU 供电线 (EPS 8pin)', full: 'EPS12V 8-pin', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.030, pins: 8, strands: 5, color: [0.07, 0.07, 0.08] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, -1.00], shelfRot: [0, -0.2, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['8 针 · 纯 +12V', '单口可承载约 300W'],
      lesson: {
        title: 'EPS 8pin：CPU 的专属供电',
        body: '高性能 CPU 睿频瞬间功耗可达 250W 以上，主板 24pin 无法单独承担，'
          + '因此主板顶部另设 EPS 8pin（部分高端板 8+8）。它长得像显卡 PCIe 8pin，但针脚定义不同，'
          + '插错会直接短路，所以线材上都标注了 CPU / PCIE。',
        tips: ['务必插满 8 针；只插 4 针在高负载下会掉电重启。',
          '看清线标：CPU 口不要插 PCIe 线。'],
      },
    },
    {
      id: 'cpcie', kind: 'cpcie', name: '显卡供电线 (PCIe 8pin)', full: 'PCIe 8-pin (6+2)', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.030, pins: 8, strands: 5, color: [0.08, 0.08, 0.09] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, -0.70], shelfRot: [0, 0.15, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['6+2 针可拆设计', '单口 150W（ATX 3.0 起可短时更高）'],
      lesson: {
        title: 'PCIe 供电：插槽给不够的那部分',
        body: 'PCIe x16 插槽本身最多只能提供 75W，因此显卡需要额外的 8pin/12VHPWR 供电。'
          + 'ATX 3.1 与 12V-2x6 接口能承载 600W，但对插入到底的要求更严——'
          + '接触不良会让电流集中在少数针脚上，从而烧毁接口。',
        tips: ['插到底、听到咔哒；线材不要在接口处强行弯折（至少留 35mm 直线段）。',
          '不要用「一线拖多卡」的转接口跑高功耗显卡。'],
      },
    },
    {
      id: 'csata', kind: 'csata', name: 'SATA 供电 + 数据线', full: 'SATA 15pin 电源 + 7pin 数据', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.024, pins: 7, strands: 4, color: [0.06, 0.10, 0.18] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, -0.40], shelfRot: [0, -0.25, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['15pin 供电（+12V/+5V/+3.3V）', '7pin 数据 · 6Gb/s'],
      lesson: {
        title: 'SATA 设备需要两根线',
        body: '和 M.2 不同，2.5/3.5 英寸盘的供电与数据是分开的：供电来自电源的 SATA 15pin，'
          + '数据线接到主板 SATA 端口。主板上编号越小的 SATA 口通常优先级越高，'
          + '注意部分主板「M.2 与 SATA 共享通道」，插满 M.2 会禁用某些 SATA 口。',
        tips: ['两个接口都是 L 形防呆，插反是插不进去的，别硬来。',
          '硬盘不识别时先换一条数据线——SATA 线是常见故障点。'],
      },
    },
    {
      id: 'cfp', kind: 'cfp', name: '前面板控制线', full: 'F_PANEL + USB3.0 + HD_AUDIO', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.020, pins: 9, strands: 7, color: [0.10, 0.10, 0.11] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, -0.10], shelfRot: [0, 0.2, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['POWER SW / RESET SW / HDD LED / POWER LED', 'USB3.0 19pin · HD_AUDIO 9pin'],
      lesson: {
        title: '前面板跳线：让机箱按钮能开机',
        body: 'F_PANEL 是一排 9 针的插针，其中 POWER SW 只是一个瞬时短接开关——'
          + '它把两根针短接一下，主板收到信号后拉低 PS_ON#，电源启动。'
          + '开关不分正负极，插反也能用；但 LED 分正负（彩色线为 +），插反只是灯不亮。',
        tips: ['针脚很细，插之前先看清主板丝印上的 PWR/RST/HDD_LED 标注。',
          '找不到跳线时，可用螺丝刀短接 POWER SW 两针来临时开机（裸机测试常用）。',
          'USB3.0 19pin 有防呆缺口，务必对准，暴力插会折断针脚。'],
      },
    },
    {
      id: 'cfan', kind: 'cfan', name: '风扇集线器与风扇线', full: 'PWM HUB + 4pin 风扇线', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.018, pins: 4, strands: 4, color: [0.06, 0.06, 0.07] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, 0.20], shelfRot: [0, -0.15, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['4pin PWM · 支持温控曲线', 'HUB 汇总多把风扇到一个主板接口'],
      lesson: {
        title: '风扇接线与温控曲线',
        body: '4pin 风扇的第 4 根线是 PWM 控制信号，主板据此按温度调速；第 3 根是转速反馈（TACH），'
          + '所以 BIOS 能读到 rpm。CPU_FAN 接口若读不到转速，主板会判定散热器缺失并报警甚至拒绝开机。',
        tips: ['CPU 散热器风扇必须接 CPU_FAN，不要接 SYS_FAN。',
          '多把风扇可用 PWM HUB 汇总，但 HUB 需要单独取电（SATA 供电）。',
          '在 BIOS 里把曲线调成「低温静音、高温给力」，比一直全速舒服得多。'],
      },
    },
    {
      id: 'cext', kind: 'cext', name: '外设线材套装', full: 'DP 1.4 线 + 键鼠 USB + 电源线', cat: '线材',
      model: 'cableCoil', modelOpts: { w: 0.026, pins: 6, strands: 5, color: [0.05, 0.05, 0.06] },
      installModel: 'cableRun', shelf: [-3.86, 2.01, 0.50], shelfRot: [0, 0.25, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['DisplayPort 1.4 · 支持 2K 165Hz', '键鼠 USB-A', 'C13 市电线'],
      lesson: {
        title: '显示线一定要插显卡，不是主板',
        body: '装了独立显卡后，显示器必须接在显卡的 DP/HDMI 口上。'
          + '插在主板视频输出上，画面走的是 CPU 集显（部分 CPU 甚至没有集显 → 黑屏），'
          + '会白白浪费独显性能。这是新手最常见的「装完没画面」原因之一。',
        tips: ['高刷新率优先用 DP；HDMI 版本不够时可能只能跑 60Hz。',
          '接市电前先确认电源开关在 O 档，插好后再拨到 I。'],
      },
    },
    {
      id: 'antenna', kind: 'antenna', name: 'Wi-Fi 天线', full: '双频磁吸外置天线', cat: '网络',
      model: 'wifiAntenna', shelf: [-3.86, 2.01, 0.80], shelfRot: [0, 0.1, 0],
      hold: { pos: [0.11, -0.12, -0.28], rot: [0.2, 0.3, 0] },
      spec: ['Wi-Fi 7 双频 · 磁吸底座', '接主板后置 SMA 接口'],
      lesson: {
        title: '别忘了拧上天线',
        body: '主板自带的 Wi-Fi 模块必须接天线才有可用信号，不接时可能只能在同一间屋子里勉强连上。'
          + '天线放高、远离机箱金属遮挡效果最好。',
        tips: ['两个 SMA 接口都要接，MIMO 才能正常工作。', '有网线时优先走有线：延迟更低更稳。'],
      },
    },
  ];

  /** 装机步骤：按章节推进 */
  const STEPS = [
    /* ===== 第 2 章：板外平台 ===== */
    {
      id: 'mb_mat', chapter: 2, accept: 'mb', title: '把主板放到防静电垫上',
      anchor: { parent: 'root', pos: [-1.95, 0.958, -2.90], rot: [-PI / 2, 0, 0] },
      approach: [0, 0.18, 0],
      hint: '主板背面有裸露焊点，必须放在防静电垫上作业',
      lessonKey: 'mb',
    },
    {
      id: 'cpu_in', chapter: 2, accept: 'cpu', title: '安装 CPU', requires: ['mb_mat'],
      anchor: { parent: 'mb', pos: [-0.045, 0.055, 0.006], rot: [0, 0, 0] },
      approach: [0, 0, 0.06], sound: 'seat',
      hint: '对齐左下角三角标，垂直落座，零阻力',
      lessonKey: 'cpu',
    },
    {
      id: 'ram_a2', chapter: 2, accept: 'ram', title: '安装内存到 A2 插槽', requires: ['mb_mat'],
      anchor: { parent: 'mb', pos: [0.064, 0.045, 0.0055], rot: [0, 0, 0] },
      approach: [0, 0, 0.05], sound: 'click',
      hint: '双通道优先 A2 / B2（离 CPU 第 2、4 个槽）',
      lessonKey: 'ram1',
      wrongSlots: [
        { pos: [0.052, 0.045, 0.0055], msg: '这是 A1。两条内存插 A1+A2 属于同一通道，会退化为单通道，请改插 A2 / B2。' },
      ],
    },
    {
      id: 'ram_b2', chapter: 2, accept: 'ram', title: '安装第二条内存到 B2 插槽', requires: ['ram_a2'],
      anchor: { parent: 'mb', pos: [0.088, 0.045, 0.0055], rot: [0, 0, 0] },
      approach: [0, 0, 0.05], sound: 'click',
      hint: '与 A2 配对组成双通道',
      lessonKey: 'ram2',
    },
    {
      id: 'm2_in', chapter: 2, accept: 'm2', title: '安装 M.2 固态硬盘', requires: ['mb_mat'],
      anchor: { parent: 'mb', pos: [-0.082, 0.004, 0.0025], rot: [0, 0, 0] },
      approach: [0.03, 0, 0.03], sound: 'click',
      hint: '斜插到底再压平，装在直连 CPU 的 M.2_1',
      lessonKey: 'm2',
    },
    {
      id: 'm2hs_in', chapter: 2, accept: 'm2hs', title: '盖上 M.2 散热马甲', requires: ['m2_in'],
      anchor: { parent: 'mb', pos: [-0.082, 0.004, 0.005], rot: [0, 0, 0] },
      approach: [0, 0, 0.05], sound: 'screw',
      hint: '别忘了撕掉导热垫保护膜',
      lessonKey: 'm2hs',
    },
    {
      id: 'paste_in', chapter: 2, accept: 'paste', title: '涂抹导热硅脂', requires: ['cpu_in'],
      anchor: { parent: 'mb', pos: [-0.045, 0.055, 0.0082], rot: [0, 0, 0] },
      approach: [0, 0, 0.05], sound: 'squeeze',
      spawn: { model: 'pasteBlob', parent: 'mb', pos: [-0.045, 0.055, 0.0082], rot: [0, 0, 0] },
      keepPart: true,
      hint: '中心一点，黄豆大小即可',
      lessonKey: 'paste',
    },
    {
      id: 'cooler_in', chapter: 2, accept: 'cooler', title: '安装 CPU 散热器', requires: ['paste_in', 'ram_b2'],
      anchor: { parent: 'mb', pos: [-0.045, 0.055, 0.0085], rot: [0, 0, 0] },
      approach: [0, 0, 0.10], sound: 'screw',
      hint: '对角线交替上力，风扇朝机箱后部',
      lessonKey: 'cooler',
    },
    /* ===== 第 3 章：主板入箱 ===== */
    {
      id: 'standoff_in', chapter: 3, accept: 'standoff', title: '在机箱内安装 9 颗铜柱',
      anchor: { parent: 'case', pos: [-0.054, 0.237, -0.100], rot: [0, 0, 0] },
      approach: [0, 0, 0.10], sound: 'screw',
      spawn: { model: 'standoffs', parent: 'case', pos: [-0.054, 0.237, -0.100], rot: [0, 0, 0] },
      hint: 'ATX 板型对应 9 个孔位，宁少勿多',
      lessonKey: 'standoff',
    },
    {
      id: 'mb_case', chapter: 3, accept: 'mb', title: '把主板装进机箱', requires: ['standoff_in', 'cooler_in'],
      anchor: { parent: 'case', pos: [-0.054, 0.237, -0.093], rot: [0, 0, 0] },
      approach: [0.02, 0, 0.16], sound: 'seat',
      hint: '先让 I/O 挡板对位，再落到铜柱上',
      lesson: {
        title: '主板入箱的顺序讲究',
        body: 'CPU、内存、M.2、散热器都在机箱外装好，是因为板外空间大、不容易压坏元件，'
          + '也不容易掉螺丝进机箱。入箱时先把主板的 I/O 挡板对进后窗，再平移落在铜柱上，'
          + '不要用主板去「压」铜柱，否则背面走线会被顶伤。',
        tips: ['大塔散热器 + 小机箱时，可能需要先入箱再装散热器，视机箱空间而定。',
          '入箱后先对光检查每个孔位是否都对上了铜柱。'],
      },
    },
    {
      id: 'mb_screw', chapter: 3, accept: 'tool_screw', title: '用螺丝固定主板', requires: ['mb_case'],
      anchor: { parent: 'mb', pos: [0, 0, 0.0], rot: [0, 0, 0] },
      approach: [0, 0, 0.08], sound: 'screw',
      spawn: { model: 'mbScrews', parent: 'mb', pos: [0, 0, 0], rot: [0, 0, 0] },
      keepPart: true,
      hint: '九颗螺丝对角线交替、分次拧紧',
      lesson: {
        title: '拧螺丝的力度',
        body: '主板螺丝只需「贴紧不晃」即可。拧太紧会让 PCB 局部受力，长期可能造成内层走线断裂；'
          + '按对角顺序分两轮拧，能让板子受力均匀。',
        tips: ['带磁螺丝刀能防止螺丝掉进机箱。', '掉进机箱的螺丝必须取出，否则通电可能短路。'],
      },
    },
    /* ===== 第 4 章：机箱内其他硬件 ===== */
    {
      id: 'psu_in', chapter: 4, accept: 'psu', title: '安装电源', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [-0.13, 0.058, 0], rot: [0, 0, 0] },
      approach: [0, 0.02, 0.14], sound: 'seat',
      hint: '风扇朝下（机箱底部有进风口）',
      lessonKey: 'psu',
    },
    {
      id: 'gpu_in', chapter: 4, accept: 'gpu', title: '安装显卡', requires: ['mb_screw'],
      anchor: { parent: 'mb', pos: [-0.100, -0.032, 0.002], rot: [0, 0, 0] },
      approach: [0, 0.05, 0.02], sound: 'seat',
      hint: '插入直连 CPU 的第一根 PCIe 5.0 x16',
      lessonKey: 'gpu',
    },
    {
      id: 'ssd_in', chapter: 4, accept: 'ssd', title: '安装 SATA 固态', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [0.16, 0.1555, -0.04], rot: [0, 0, 0] },
      approach: [0, 0.05, 0.06], sound: 'screw',
      hint: '固定在 2.5 寸托架上',
      lessonKey: 'ssd',
    },
    {
      id: 'hdd_in', chapter: 4, accept: 'hdd', title: '安装机械硬盘', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [0.155, 0.027, 0], rot: [0, 0, 0] },
      approach: [0, 0.04, 0.10], sound: 'screw',
      hint: '推入硬盘笼，注意减震胶垫',
      lessonKey: 'hdd',
    },
    {
      id: 'fan_f1', chapter: 4, accept: 'fan', title: '安装前部进风风扇 ①', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [0.198, 0.12, 0], rot: [0, PI / 2, 0] },
      approach: [-0.04, 0, 0.04], sound: 'screw',
      hint: '扇叶面朝前面板（往机箱内吹）',
      lessonKey: 'fan1',
    },
    {
      id: 'fan_f2', chapter: 4, accept: 'fan', title: '安装前部进风风扇 ②', requires: ['fan_f1'],
      anchor: { parent: 'case', pos: [0.198, 0.26, 0], rot: [0, PI / 2, 0] },
      approach: [-0.04, 0, 0.04], sound: 'screw',
      hint: '与 ①同方向',
      lessonKey: 'fan2',
    },
    {
      id: 'fan_r', chapter: 4, accept: 'fan', title: '安装后部排风风扇', requires: ['fan_f2'],
      anchor: { parent: 'case', pos: [-0.2055, 0.40, 0], rot: [0, -PI / 2, 0] },
      approach: [0.04, 0, 0.04], sound: 'screw',
      hint: '排风方向朝外，正对 CPU 散热器',
      lessonKey: 'fan3',
    },
    /* ===== 第 5 章：走线 ===== */
    {
      id: 'c24_in', chapter: 5, accept: 'c24', title: '接 24pin 主板供电', requires: ['psu_in', 'mb_screw'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [{
          a: [-0.046, 0.080, -0.045], c1: [0.06, 0.045, -0.02], c2: [0.12, 0.16, -0.055],
          b: [0.088, 0.297, -0.077], r: 0.0035, strands: 4, spread: 0.007, steps: 20,
          color: [0.06, 0.06, 0.07], plugB: [0.012, 0.05, 0.014],
        }],
      },
      hint: '从电源模组口走到主板右侧 24pin',
      lessonKey: 'c24',
    },
    {
      id: 'ceps_in', chapter: 5, accept: 'ceps', title: '接 CPU 供电 (EPS 8pin)', requires: ['psu_in', 'mb_screw'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [{
          a: [-0.046, 0.088, 0.02], c1: [-0.18, 0.20, 0.02], c2: [-0.20, 0.34, -0.02],
          b: [-0.136, 0.348, -0.075], r: 0.0033, strands: 3, spread: 0.007, steps: 20,
          color: [0.07, 0.07, 0.08], plugB: [0.032, 0.012, 0.014],
        }],
      },
      hint: '走机箱后侧上行，接主板顶部 8pin',
      lessonKey: 'ceps',
    },
    {
      id: 'cpcie_in', chapter: 5, accept: 'cpcie', title: '接显卡供电 (PCIe 8pin)', requires: ['psu_in', 'gpu_in'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [{
          a: [-0.046, 0.052, -0.02], c1: [0.00, 0.12, 0.02], c2: [0.03, 0.21, 0.01],
          b: [0.056, 0.222, -0.001], r: 0.0033, strands: 3, spread: 0.007, steps: 20,
          color: [0.08, 0.08, 0.09], plugB: [0.03, 0.014, 0.012],
        }],
      },
      hint: '接显卡顶部 8pin，插到底听咔哒',
      lessonKey: 'cpcie',
    },
    {
      id: 'csata_in', chapter: 5, accept: 'csata', title: '接硬盘供电与数据线', requires: ['psu_in', 'ssd_in', 'hdd_in'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [
          {
            a: [-0.046, 0.030, 0.03], c1: [0.05, 0.015, 0.02], c2: [0.10, 0.025, -0.02],
            b: [0.133, 0.019, -0.070], r: 0.0026, strands: 2, spread: 0.005, steps: 18,
            color: [0.05, 0.05, 0.06],
          },
          {
            a: [-0.046, 0.030, 0.05], c1: [0.02, 0.06, 0.04], c2: [0.14, 0.12, -0.05],
            b: [0.172, 0.152, -0.088], r: 0.0026, strands: 2, spread: 0.005, steps: 18,
            color: [0.05, 0.05, 0.06],
          },
          {
            a: [0.092, 0.189, -0.086], c1: [0.14, 0.19, -0.04], c2: [0.17, 0.17, -0.06],
            b: [0.148, 0.152, -0.088], r: 0.0022, strands: 1, steps: 16,
            color: [0.08, 0.14, 0.28], plugA: [0.012, 0.008, 0.008],
          },
        ],
      },
      hint: '供电从电源来，数据线接主板 SATA_1',
      lessonKey: 'csata',
    },
    {
      id: 'cfp_in', chapter: 5, accept: 'cfp', title: '接前面板控制线', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [
          {
            a: [0.214, 0.360, 0.040], c1: [0.21, 0.20, 0.02], c2: [0.13, 0.10, -0.05],
            b: [0.058, 0.121, -0.083], r: 0.0022, strands: 4, spread: 0.004, steps: 20,
            color: [0.10, 0.10, 0.12], plugB: [0.024, 0.008, 0.008],
          },
          {
            a: [0.214, 0.300, 0.030], c1: [0.20, 0.23, 0.01], c2: [0.15, 0.17, -0.05],
            b: [0.086, 0.149, -0.080], r: 0.003, strands: 1, steps: 18,
            color: [0.06, 0.10, 0.22], plugB: [0.021, 0.010, 0.01],
          },
        ],
      },
      hint: '看清主板丝印 PWR/RST/HDD_LED',
      lessonKey: 'cfp',
    },
    {
      id: 'cfan_in', chapter: 5, accept: 'cfan', title: '接风扇线到主板', requires: ['fan_r', 'mb_screw'],
      anchor: { parent: 'case', pos: [0, 0, 0], rot: [0, 0, 0] },
      approach: [0, 0, 0.1], sound: 'click',
      installOpts: {
        paths: [
          {
            a: [0.198, 0.12, 0.02], c1: [0.16, 0.08, 0.04], c2: [0.08, 0.10, 0.0],
            b: [0.008, 0.121, -0.083], r: 0.0022, strands: 1, steps: 16, color: [0.05, 0.05, 0.06],
          },
          {
            a: [0.198, 0.26, 0.02], c1: [0.16, 0.20, 0.05], c2: [0.06, 0.14, 0.0],
            b: [0.008, 0.121, -0.083], r: 0.0022, strands: 1, steps: 16, color: [0.05, 0.05, 0.06],
          },
          {
            a: [-0.2, 0.40, 0.02], c1: [-0.16, 0.34, 0.06], c2: [-0.06, 0.20, 0.0],
            b: [0.008, 0.121, -0.083], r: 0.0022, strands: 1, steps: 16, color: [0.05, 0.05, 0.06],
          },
          {
            a: [0.0, 0.325, -0.055], c1: [0.02, 0.34, -0.02], c2: [-0.02, 0.36, -0.02],
            b: [-0.066, 0.353, -0.078], r: 0.0022, strands: 1, steps: 14, color: [0.05, 0.05, 0.06],
          },
        ],
      },
      hint: 'CPU 风扇必须接 CPU_FAN',
      lessonKey: 'cfan',
    },
    {
      id: 'antenna_in', chapter: 5, accept: 'antenna', title: '拧上 Wi-Fi 天线', requires: ['mb_screw'],
      anchor: { parent: 'case', pos: [-0.245, 0.352, -0.05], rot: [0, 0, 0] },
      approach: [-0.06, 0, 0], sound: 'screw',
      hint: '接主板后置 SMA 接口',
      lessonKey: 'antenna',
    },
    {
      id: 'panel_in', chapter: 5, accept: 'sidepanel', title: '装回侧透玻璃侧板',
      requires: ['c24_in', 'ceps_in', 'cpcie_in', 'csata_in', 'cfp_in', 'cfan_in'],
      anchor: { parent: 'case', pos: [0, 0.24, 0.112], rot: [0, 0, 0] },
      approach: [0, 0, 0.14], sound: 'seat',
      hint: '理线完成后再合盖',
      lessonKey: 'sidepanel',
    },
    /* ===== 第 6 章：点亮 ===== */
    {
      id: 'cext_in', chapter: 6, accept: 'cext', title: '连接显示器、键鼠与市电', requires: ['panel_in'],
      anchor: { parent: 'root', pos: [0.60, 1.12, -2.92], rot: [0, 0, 0] },
      approach: [0, 0.05, 0], sound: 'click',
      externalCables: true,
      hint: '显示线一定要插显卡，不是主板',
      lessonKey: 'cext',
    },
  ];

  const partById = {};
  PARTS.forEach((p) => { partById[p.id] = p; });
  const stepById = {};
  STEPS.forEach((s) => { stepById[s.id] = s; });

  root.PARTS_DB = { PARTS, STEPS, partById, stepById };
})(window);
