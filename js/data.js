/** 《氧气的一生》— 形态 / 元素 / 事件数据
 * 亲和力数字优先取自录屏可见值；标注 *approx 的为公开热力学近似（氧化物生成焓/Gibbs，kJ/mol·每氧原子量级），非官方源码。
 */
export const FORMS = {
  O2:   { id: 'O2',   formula: 'O₂',   name: '氧气分子',           affinity: 0,   color: '#e53935' },
  O3:   { id: 'O3',   formula: 'O₃',   name: '臭氧',               affinity: 50,  color: '#ab47bc' }, // approx
  H2O:  { id: 'H2O',  formula: 'H₂O',  name: '水',                 affinity: 237, color: '#1e88e5' },
  CO2:  { id: 'CO2',  formula: 'CO₂',  name: '二氧化碳',           affinity: 197, color: '#546e7a' },
  Fe2O3:{ id: 'Fe2O3',formula: 'Fe₂O₃',name: '氧化铁（铁锈）',     affinity: 247, color: '#bf360c' },
  SiO2: { id: 'SiO2', formula: 'SiO₂', name: '二氧化硅（石英）',   affinity: 428, color: '#78909c' },
  Al2O3:{ id: 'Al2O3',formula: 'Al₂O₃',name: '氧化铝',             affinity: 527, color: '#5c6bc0' },
  CaO:  { id: 'CaO',  formula: 'CaO',  name: '氧化钙',             affinity: 603, color: '#eceff1' },
  TiO2: { id: 'TiO2', formula: 'TiO₂', name: '二氧化钛',           affinity: 444, color: '#455a64' }, // approx from Ti tile
  Na2O: { id: 'Na2O', formula: 'Na₂O', name: '氧化钠',             affinity: 375, color: '#7e57c2' }, // approx from Na tile
};

/** 元素方块：affinity 为对氧吸引强度；null = 不反应 */
export const ELEMENT_DEFS = [
  { symbol: 'H₂', Z: 1,  affinity: 237, form: 'H2O',  color: '#bbdefb', text: '#0d47a1',
    transferMsg: '氢气燃烧变成水蒸气！', equation: '2H₂ + O₂ → 2H₂O',
    weakMsg: '氢太弱，换乘不了' },
  { symbol: 'C',  Z: 6,  affinity: 197, form: 'CO2',  color: '#424242', text: '#fff',
    transferMsg: '碳把氧带走，变成二氧化碳', equation: 'C + O₂ → CO₂',
    weakMsg: '碳太弱，换乘不了' },
  { symbol: 'N₂', Z: 7,  affinity: null, form: null, color: '#fafafa', text: '#333',
    noReact: true, transferMsg: 'N₂几乎不反应（空气的78%）', equation: null, weakMsg: null },
  { symbol: 'Na', Z: 11, affinity: 375, form: 'Na2O', color: '#ce93d8', text: '#4a148c',
    transferMsg: '钠把氧抢走了', equation: '4Na + O₂ → 2Na₂O',
    weakMsg: '钠太弱，换乘不了' },
  { symbol: 'Al', Z: 13, affinity: 527, form: 'Al2O3', color: '#90caf9', text: '#0d47a1',
    transferMsg: '换乘到铝上', equation: '4Al + 3O₂ → 2Al₂O₃',
    fromMsg: (from) => `${from}换乘到铝`, 
    weakMsg: '铝太弱，换乘不了' },
  { symbol: 'Si', Z: 14, affinity: 428, form: 'SiO2', color: '#b0bec5', text: '#263238',
    transferMsg: '换乘到硅上，变成石英', equation: 'Si + O₂ → SiO₂',
    weakMsg: '硅太弱，换乘不了' },
  { symbol: 'Ar', Z: 18, affinity: null, form: null, color: '#e1bee7', text: '#4a148c',
    noReact: true, transferMsg: '氩是惰性气体，不反应', equation: null },
  { symbol: 'Ca', Z: 20, affinity: 603, form: 'CaO',  color: '#fff9c4', text: '#f57f17',
    transferMsg: '换乘到钙上', equation: '2Ca + O₂ → 2CaO',
    weakMsg: '钙……等等，钙应该很强才对', },
  { symbol: 'Ti', Z: 22, affinity: 444, form: 'TiO2', color: '#78909c', text: '#fff',
    transferMsg: '换乘到钛上', equation: 'Ti + O₂ → TiO₂',
    weakMsg: '钛太弱，换乘不了' },
  { symbol: 'Fe', Z: 26, affinity: 247, form: 'Fe2O3', color: '#a1887f', text: '#3e2723',
    transferMsg: '雨滴换乘到铁上', equation: '4Fe + 3O₂ → 2Fe₂O₃',
    weakMsg: '铁太弱，换乘不了' },
  { symbol: 'Cu', Z: 29, affinity: 130, form: 'CuO',  color: '#ffcc80', text: '#e65100',
    transferMsg: '换乘到铜上', equation: '2Cu + O₂ → 2CuO',
    weakMsg: '铜太弱，换乘不了' },
  { symbol: 'Zn', Z: 30, affinity: 318, form: 'ZnO',  color: '#bdbdbd', text: '#212121', // approx
    transferMsg: '换乘到锌上', equation: '2Zn + O₂ → 2ZnO',
    weakMsg: '锌太弱，换乘不了' },
  { symbol: 'Ag', Z: 47, affinity: 11,  form: 'Ag2O', color: '#eeeeee', text: '#424242',
    transferMsg: '银勉强氧化了一点', equation: '4Ag + O₂ → 2Ag₂O',
    weakMsg: '银太弱，换乘不了', noReactLabel: false },
  { symbol: 'Au', Z: 79, affinity: null, form: null, color: '#ffd54f', text: '#e65100',
    noReact: true, transferMsg: '金不会生锈！', equation: null },
  { symbol: 'Pb', Z: 82, affinity: 189, form: 'PbO',  color: '#9e9e9e', text: '#212121',
    transferMsg: '换乘到铅上', equation: '2Pb + O₂ → 2PbO',
    weakMsg: '铅太弱，换乘不了' },
];

// CuO / ZnO / PbO / Ag2O forms used above
FORMS.CuO  = { id: 'CuO',  formula: 'CuO',  name: '氧化铜', affinity: 130, color: '#6d4c41' };
FORMS.ZnO  = { id: 'ZnO',  formula: 'ZnO',  name: '氧化锌', affinity: 318, color: '#f5f5f5' };
FORMS.PbO  = { id: 'PbO',  formula: 'PbO',  name: '氧化铅', affinity: 189, color: '#757575' };
FORMS.Ag2O = { id: 'Ag2O', formula: 'Ag₂O', name: '氧化银', affinity: 11,  color: '#bdbdbd' };

/** 特殊事件圆标 */
export const EVENT_DEFS = [
  { id: 'lightning', label: '雷', emoji: '⚡', color: '#fff59d',
    trigger: (state) => {
      if (state.formId === 'O2') {
        return { formId: 'O3', msg: '雷击！氧气变成臭氧', equation: '3O₂ → 2O₃（放电）', kind: 'transfer' };
      }
      return { msg: '打雷了！空气被电离了一下', kind: 'flavor' };
    }},
  { id: 'cloud', label: '云', emoji: '☁️', color: '#e3f2fd',
    trigger: (state) => {
      if (state.formId === 'H2O') {
        return { msg: '被雪一冻，变成雨滴', kind: 'flavor', phase: 'rain' };
      }
      if (state.formId === 'O2' || state.formId === 'O3') {
        return { formId: 'H2O', msg: '云里的水汽裹住了氧', equation: null, kind: 'transfer' };
      }
      return { msg: '穿过了一朵云', kind: 'flavor' };
    }},
  { id: 'plant', label: '植物', emoji: '🌳', color: '#c8e6c9',
    trigger: (state) => {
      if (state.formId === 'CO2') {
        return { formId: 'O2', msg: '光合作用！植物释放出氧气', equation: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', kind: 'transfer', revive: true };
      }
      return { msg: '路过一片树林', kind: 'flavor' };
    }},
  { id: 'animal', label: '动物', emoji: '🐇', color: '#ffe0b2',
    trigger: (state) => {
      if (state.formId === 'O2' || state.formId === 'O3') {
        return { formId: 'CO2', msg: '动物呼吸，氧变成了二氧化碳', equation: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O', kind: 'transfer' };
      }
      return { msg: '小兔子跑过去了', kind: 'flavor' };
    }},
  { id: 'al_smelter', label: '电解铝', emoji: '🏭', color: '#bbdefb',
    trigger: (state) => {
      if (state.formId === 'Al2O3') {
        return { formId: 'CO2', msg: '电解铝！碳阳极让氧以 CO₂ 逃出', equation: '2Al₂O₃ + 3C → 4Al + 3CO₂（电解）', kind: 'transfer', revive: true };
      }
      return { msg: '路过电解铝厂', kind: 'flavor' };
    }},
  { id: 'cement', label: '水泥窑', emoji: '🏗️', color: '#d7ccc8',
    trigger: (state) => {
      if (state.formId === 'CaO' || state.affinity >= 500) {
        return { msg: '在水泥窑里被煅烧，但仍以 CaO 留下（石灰石里三个氧有一个留下）', kind: 'flavor' };
      }
      if (state.affinity < 603) {
        return { formId: 'CaO', msg: '水泥窑煅烧：氧留在了氧化钙里', equation: 'CaCO₃ → CaO + CO₂', kind: 'transfer' };
      }
      return { msg: '路过水泥窑', kind: 'flavor' };
    }},
];

/** 结局「常见度」——玩法模拟口径（沿用录屏：30 日课程×约 1 万次），非真实中国统计 */
export const END_RARITY = {
  CaO:   { endPct: 41, crustPct: 3.5, label: '常见一生' },
  SiO2:  { endPct: 28, crustPct: 28,  label: '很常见的一生' },
  Al2O3: { endPct: 12, crustPct: 8,   label: '还算常见' },
  Fe2O3: { endPct: 8,  crustPct: 2,   label: '少见一生' },
  H2O:   { endPct: 6,  crustPct: 0.5, label: '水循环里的一生' },
  CO2:   { endPct: 4,  crustPct: 0.04,label: '大气里的一生' },
  TiO2:  { endPct: 3,  crustPct: 0.3, label: '少见一生' },
  Na2O:  { endPct: 2,  crustPct: 0.2, label: '少见一生' },
  O2:    { endPct: 2,  crustPct: 21,  label: '还在天上飘' },
  O3:    { endPct: 1,  crustPct: 0.001,label: '稀有的臭氧一生' },
  CuO:   { endPct: 1,  crustPct: 0.01,label: '稀有一生' },
  ZnO:   { endPct: 1,  crustPct: 0.01,label: '稀有一生' },
  PbO:   { endPct: 1,  crustPct: 0.01,label: '稀有一生' },
  Ag2O:  { endPct: 0.5,crustPct: 0.001,label: '极稀有' },
};

export function formAffinity(formId) {
  return (FORMS[formId] && FORMS[formId].affinity) || 0;
}

export function layerName(depth) {
  if (depth < 30) return '上空的顶点';
  if (depth < 1000) return '上空';
  if (depth < 2000) return '地表';
  return '地中';
}

export function todayCourse() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
