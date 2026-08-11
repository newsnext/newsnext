# NewsNow 用户 Source 需求汇总

## 文档目的

本文汇总 `ourongxing/newsnow` 仓库中用户提出过的 source（信息源）需求，用于 NewsNext 的 source 规划和优先级判断。

统计时间为 2026 年 8 月 11 日。统计范围包括仓库当时的全部 242 条 issue（包含 open 和 closed，排除 Pull Request）以及 issue 评论。本文将重复请求合并，并区分当前仍 open 的需求和已经关闭的历史需求。

Issue 关闭不一定表示对应 source 已经稳定可用，也可能表示请求已处理、已拒绝、已被其他 issue 覆盖或失去后续。因此，关闭状态只作为规划参考，不能直接等同于“已经实现”。

## 结论摘要

用户需求最集中的方向如下：

1. 小红书热点或爆款内容，是独立 issue 数量最多的明确 source 需求。
2. X/Twitter、Reddit、Instagram、TikTok、YouTube 等海外社交平台热点。
3. Reuters、AP News、Bloomberg、Google News 等国际新闻来源。
4. 微信公众号及微信生态内容。
5. Steam、任天堂、索尼、3DM、游侠网、小黑盒等游戏资讯。
6. 同花顺、雪球、淘股吧、开盘啦、韭研公社等财经投资来源。
7. 允许用户自定义 RSS、API 或网页 source，而不是完全依赖内置来源。

## 重复需求

### 小红书

小红书是最集中的明确需求，用户希望获取热搜、热点或爆款内容：

- [#19 oauth 登录，急缺小红书热搜](https://github.com/ourongxing/newsnow/issues/19)（closed）
- [#58 提议添加小红书的数据吗？](https://github.com/ourongxing/newsnow/issues/58)（open）
- [#199 后续能否增加微信公众号和小红书版块](https://github.com/ourongxing/newsnow/issues/199)（open）
- [#289 希望可以增加小红书热搜、热点](https://github.com/ourongxing/newsnow/issues/289)（open）
- [#366 希望增加一个小红书的热点或者爆款的？](https://github.com/ourongxing/newsnow/issues/366)（open）

### 海外社交平台

用户提出了 X/Twitter、Reddit、Instagram、TikTok、YouTube 和 Google 热点等来源：

- [#73 please add x, thanks~](https://github.com/ourongxing/newsnow/issues/73)（open）
- [#164 希望可以增加推特、reddit、ins、youtube 这些每日热点](https://github.com/ourongxing/newsnow/issues/164)（open）
- [#183 关于增加国外主要社交媒体热搜板的请求](https://github.com/ourongxing/newsnow/issues/183)（open）
- [#312 信息源补充](https://github.com/ourongxing/newsnow/issues/312)（open，提出抓取 Reddit 等媒体中的痛点讨论）

### 国际新闻媒体

Reuters 被重复提出，并经常与 AP News、Bloomberg 和 Google News 一同出现：

- [#53 添加美联社和路透社](https://github.com/ourongxing/newsnow/issues/53)（open）
- [#67 建议支持彭博社、路透社消息](https://github.com/ourongxing/newsnow/issues/67)（open）
- [#107 hope to add news source for google news and reuters news](https://github.com/ourongxing/newsnow/issues/107)（open）
- [#230 请求添加来源](https://github.com/ourongxing/newsnow/issues/230)（open，提出 Reuters 多语言镜像、两个至上和大纪元）
- [#231 对“实时”及“信息源”建议](https://github.com/ourongxing/newsnow/issues/231)（open，提出国际主流新闻平台和 Google News）
- [#235 请问大佬有新增世界主流新闻源的计划吗？](https://github.com/ourongxing/newsnow/issues/235)（open，未指定具体媒体）

### 微信生态

- [#199 后续能否增加微信公众号和小红书版块](https://github.com/ourongxing/newsnow/issues/199)（open）
- [#323 申请加入微信读书榜单](https://github.com/ourongxing/newsnow/issues/323)（open）
- [#364 没有微信公众号](https://github.com/ourongxing/newsnow/issues/364)（open）

### 游戏资讯

- [#139 游戏频道](https://github.com/ourongxing/newsnow/issues/139)（open）：Steam、任天堂、索尼、3DM、游侠网。
- [#240 请求订阅新源「小黑盒」「游侠网」等游戏资讯网站](https://github.com/ourongxing/newsnow/issues/240)（open）。

### mktnews.com

- [#62 建议增加 mktnews.com](https://github.com/ourongxing/newsnow/issues/62)（open）
- [#137 希望能增加 mktnews.com](https://github.com/ourongxing/newsnow/issues/137)（open）

### 已关闭的重复需求

以下来源曾被重复提出，但相关新增请求已经关闭：

- 36氪：[#48](https://github.com/ourongxing/newsnow/issues/48)、[#65](https://github.com/ourongxing/newsnow/issues/65)、[#271](https://github.com/ourongxing/newsnow/issues/271)。
- 少数派：[#42](https://github.com/ourongxing/newsnow/issues/42)、[#48](https://github.com/ourongxing/newsnow/issues/48)、[#130](https://github.com/ourongxing/newsnow/issues/130)。

## 当前 Open Issue 中的明确 Source

### 中文新闻与内容平台

| Source | 用户希望获取的内容 | Issue |
| --- | --- | --- |
| 观察者网 | 新闻或热点 | [#369](https://github.com/ourongxing/newsnow/issues/369) |
| 睡前消息 | 新闻或热点 | [#369](https://github.com/ourongxing/newsnow/issues/369) |
| 小红书 | 热搜、热点或爆款 | [#58](https://github.com/ourongxing/newsnow/issues/58)、[#199](https://github.com/ourongxing/newsnow/issues/199)、[#289](https://github.com/ourongxing/newsnow/issues/289)、[#366](https://github.com/ourongxing/newsnow/issues/366) |
| 微信公众号 | 公众号内容或热点版块 | [#199](https://github.com/ourongxing/newsnow/issues/199)、[#364](https://github.com/ourongxing/newsnow/issues/364) |
| 界面新闻 | 新闻内容 | [#108](https://github.com/ourongxing/newsnow/issues/108) |
| 红板报 | 新闻内容 | [#108](https://github.com/ourongxing/newsnow/issues/108) |
| 人民日报 | 新闻内容 | [#103](https://github.com/ourongxing/newsnow/issues/103) |
| 新华社 | 新闻内容 | [#103](https://github.com/ourongxing/newsnow/issues/103) |
| 凤凰网 | 新闻内容 | [#86](https://github.com/ourongxing/newsnow/issues/86) |
| 懂车帝 | 汽车热点 | [#57](https://github.com/ourongxing/newsnow/issues/57) |
| 驱动之家 | 科技资讯 | [#204](https://github.com/ourongxing/newsnow/issues/204) |
| 虫部落 | 虫部落热榜 | [#39](https://github.com/ourongxing/newsnow/issues/39) |
| cnBeta | RSS 新闻 | [#28](https://github.com/ourongxing/newsnow/issues/28) |

### 国际新闻、科技与研究

| Source | 用户希望获取的内容 | Issue |
| --- | --- | --- |
| Reuters | 国际新闻或最新报道 | [#53](https://github.com/ourongxing/newsnow/issues/53)、[#67](https://github.com/ourongxing/newsnow/issues/67)、[#107](https://github.com/ourongxing/newsnow/issues/107)、[#230](https://github.com/ourongxing/newsnow/issues/230) |
| AP News | 国际新闻、世界新闻和 Live 报道 | [#53](https://github.com/ourongxing/newsnow/issues/53) |
| Bloomberg | 财经和国际新闻 | [#67](https://github.com/ourongxing/newsnow/issues/67) |
| Google News | 国际新闻聚合 | [#107](https://github.com/ourongxing/newsnow/issues/107)、[#231](https://github.com/ourongxing/newsnow/issues/231) |
| Silicon Valley | AI 和科技新闻，issue 给出的地址为 `siliconvalley.com` | [#344](https://github.com/ourongxing/newsnow/issues/344) |
| TechCrunch | 科技新闻 | [#317](https://github.com/ourongxing/newsnow/issues/317) |
| 机器之心 | AI 和科技新闻 | [#317](https://github.com/ourongxing/newsnow/issues/317) |
| arXiv | 最近热门的计算机相关论文 | [#142](https://github.com/ourongxing/newsnow/issues/142) |
| qore.com | Issue 未说明具体栏目 | [#341](https://github.com/ourongxing/newsnow/issues/341) |
| 两个至上（2Firsts） | 行业新闻 | [#230](https://github.com/ourongxing/newsnow/issues/230) |
| 大纪元 | 新闻内容 | [#230](https://github.com/ourongxing/newsnow/issues/230) |

### 社交平台

| Source | 用户希望获取的内容 | Issue |
| --- | --- | --- |
| X/Twitter | 每日热点或全球趋势 | [#73](https://github.com/ourongxing/newsnow/issues/73)、[#164](https://github.com/ourongxing/newsnow/issues/164)、[#183](https://github.com/ourongxing/newsnow/issues/183) |
| Reddit | 每日热点、舆论或痛点讨论 | [#164](https://github.com/ourongxing/newsnow/issues/164)、[#183](https://github.com/ourongxing/newsnow/issues/183)、[#312](https://github.com/ourongxing/newsnow/issues/312) |
| Instagram | 每日热点 | [#164](https://github.com/ourongxing/newsnow/issues/164)、[#183](https://github.com/ourongxing/newsnow/issues/183) |
| TikTok | 热搜或舆论热点 | [#183](https://github.com/ourongxing/newsnow/issues/183) |
| YouTube | 每日热点 | [#164](https://github.com/ourongxing/newsnow/issues/164) |
| Google | 海外舆论或热点数据 | [#183](https://github.com/ourongxing/newsnow/issues/183) |

### 财经、投资与电商

| Source | 用户希望获取的内容 | Issue |
| --- | --- | --- |
| 同花顺 | 用户订阅内容 | [#362](https://github.com/ourongxing/newsnow/issues/362) |
| 雪球 | 精选用户内容 | [#362](https://github.com/ourongxing/newsnow/issues/362) |
| 淘股吧 | 热门股票列表 | [#246](https://github.com/ourongxing/newsnow/issues/246) |
| 开盘啦 | 热门股票列表 | [#246](https://github.com/ourongxing/newsnow/issues/246) |
| 韭研公社 | 财经资讯 | [#233](https://github.com/ourongxing/newsnow/issues/233) |
| mktnews.com | 外媒财经信息 | [#62](https://github.com/ourongxing/newsnow/issues/62)、[#137](https://github.com/ourongxing/newsnow/issues/137) |
| AMZ123 | 跨境电商快讯 | [#297](https://github.com/ourongxing/newsnow/issues/297) |
| 未指定加密货币来源 | 加密货币信息推送 | [#136](https://github.com/ourongxing/newsnow/issues/136) |

### 阅读、小说与图书榜单

- 微信读书榜单：[#323](https://github.com/ourongxing/newsnow/issues/323)。
- 起点、番茄、晋江、纵横、17K、飞卢、书旗、微信、掌阅、QQ、咪咕、豆瓣、当当、网易和京东等阅读网站热点：[#316](https://github.com/ourongxing/newsnow/issues/316)。其中部分名称在原 issue 中没有明确到具体产品，实施前需要再次确认目标页面。

### 游戏

- Steam、任天堂、索尼、3DM、游侠网：[#139](https://github.com/ourongxing/newsnow/issues/139)。
- 小黑盒、游侠网及其他游戏资讯网站：[#240](https://github.com/ourongxing/newsnow/issues/240)。

### 百科与其他榜单

| Source | 用户希望获取的内容 | Issue |
| --- | --- | --- |
| Wikipedia | 动态热门、首页典范条目、“你知道吗”、“历史上的今天”和优良条目 | [#66](https://github.com/ourongxing/newsnow/issues/66) |
| Wikinews | 维基新闻 | [#66](https://github.com/ourongxing/newsnow/issues/66) |
| Kickstarter | 众筹项目排行榜 | [#371](https://github.com/ourongxing/newsnow/issues/371) |

## 已关闭 Issue 中的历史 Source 需求

以下来源曾被用户提出，但对应 issue 已关闭：

| Source | Issue |
| --- | --- |
| B 站热搜 | [#5](https://github.com/ourongxing/newsnow/issues/5) |
| B 站热门视频 | [#89](https://github.com/ourongxing/newsnow/issues/89) |
| 百度热搜 | [#13](https://github.com/ourongxing/newsnow/issues/13) |
| 360 热搜 | [#22](https://github.com/ourongxing/newsnow/issues/22) |
| 小红书 | [#19](https://github.com/ourongxing/newsnow/issues/19) |
| 少数派 | [#42](https://github.com/ourongxing/newsnow/issues/42)、[#48](https://github.com/ourongxing/newsnow/issues/48)、[#130](https://github.com/ourongxing/newsnow/issues/130) |
| 36氪 | [#48](https://github.com/ourongxing/newsnow/issues/48)、[#65](https://github.com/ourongxing/newsnow/issues/65)、[#271](https://github.com/ourongxing/newsnow/issues/271) |
| 牛客热榜 | [#81](https://github.com/ourongxing/newsnow/issues/81) |
| 掘金排行榜文章 | [#118](https://github.com/ourongxing/newsnow/issues/118) |
| FreeBuf | [#239](https://github.com/ourongxing/newsnow/issues/239) |
| CVE 漏洞情报 `cve.imfht.com` | [#270](https://github.com/ourongxing/newsnow/issues/270) |
| OpenCVE | [#270 的评论](https://github.com/ourongxing/newsnow/issues/270#issuecomment-3625210042) |

## 自定义 Source 能力

除具体网站外，一个反复出现的产品需求是允许用户自行添加或管理 source，包括：

- 添加任意 RSS。
- 填写新闻网站或 API 地址。
- 自定义解析规则。
- 替换、隐藏或禁用内置 source。
- 将自定义 source 和用户账号同步。
- 允许用户提交 source，并通过投票决定是否加入内置列表。

相关 issue：

- [#12 关于自定义添加热点问题](https://github.com/ourongxing/newsnow/issues/12)（closed）
- [#25 希望能开发自定义 RSS 源放进区块的能力](https://github.com/ourongxing/newsnow/issues/25)（closed）
- [#44 Docker 部署是否可以修改、添加、禁用某些源](https://github.com/ourongxing/newsnow/issues/44)（open）
- [#83 可以提交自定义站点](https://github.com/ourongxing/newsnow/issues/83)（open）
- [#187 自定义网站、地区和频道](https://github.com/ourongxing/newsnow/issues/187)（open）
- [#227 信息源自主增加](https://github.com/ourongxing/newsnow/issues/227)（open）
- [#292 请求可以自定义添加一些新闻网站](https://github.com/ourongxing/newsnow/issues/292)（open）
- [#311 可以自定义吗？](https://github.com/ourongxing/newsnow/issues/311)（open）

由于不同网站的数据格式、认证方式和反爬策略并不统一，“输入任意网址即可使用”通常不可行。NewsNext 若实现该能力，应优先考虑 RSS、标准 JSON API 和可声明的抓取规则，而不是承诺自动解析所有网页。

## 建议优先级

### P0：需求明确且重复出现

1. 小红书热点或爆款。
2. X/Twitter 和 Reddit 热点。
3. Reuters、AP News、Google News 等国际新闻。
4. 微信公众号。

### P1：垂直领域需求明确

1. 游戏资讯：Steam、任天堂、索尼、3DM、游侠网、小黑盒。
2. 财经投资：同花顺、雪球、淘股吧、开盘啦、韭研公社。
3. 科技研究：机器之心、TechCrunch、arXiv。
4. 中文媒体：观察者网、睡前消息、界面新闻、人民日报、新华社。

### P2：单个请求或目标仍需确认

1. 阅读和小说平台榜单。
2. Kickstarter 众筹榜。
3. Wikipedia 和 Wikinews 栏目。
4. AMZ123、mktnews.com、两个至上、大纪元和 qore.com。
5. 未指定具体平台的加密货币资讯。

### 平台能力

自定义 RSS/API/source 是独立于单个来源的长期能力。它不能完全替代内置 source，但可以降低长尾来源的维护压力。建议先限定支持范围和安全边界，再决定是否进入正式路线图。
