# 氧气的一生

日文 Claude Artifact 游戏「オキシの一生」的**非官方中文学习改编**。交互与视觉按用户录屏观察重建，**不是**源码级 1:1。

试玩：https://davidliu12-code.github.io/oxygen-life/

## 玩法

拉开氧气分子再松手（反方向飞出）→ 撞钉子弹跳下落 → 撞上亲和力更强的元素则「换乘」→ 雷/云/植物/动物/电解铝厂/水泥窑可触发特殊事件 → 抵达地壳深处结算。

## 数据说明

- 元素方块上的亲和力数字：优先取自录屏可见值（如 H₂ 237、Fe 247、Si 428、Al 527、Ca 603 等）。
- 标注推断/近似的数值：参考公开氧化物生成 Gibbs/焓量级（kJ/mol·每氧原子），**非**原作内部表。
- 结算页「常见一生」概率：沿用录屏给出的玩法模拟口径（约 1 万次），**不是**真实中国统计。

## 未能从录屏核实

- 精确钉位布局与生成算法
- 完整元素表与全部 Gibbs 数值
- 精确分数公式与缓动曲线
- 「复活」的全部触发条件
- 全部结局分支与音效

## 本地运行

```bash
npx serve -l 5173 .
# 或 python3 -m http.server 5173
```

打开 `http://localhost:5173`。竖屏手机最佳。

## 测试钩子

- `window.render_game_to_text()` — 状态 JSON
- `window.advanceTime(ms)` — 确定性推进
- `window.__forceLaunch(vx, vy)` / `window.__forceFinish()` / `window.__reset()`

## 许可

学习改编演示；化学事实为公知知识。原 Artifact 归属其作者。
