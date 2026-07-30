# Source Loader 全链路问题评审

本文记录 Newsnext 当前 Source Loader 从前端卡片到扩展 Background 执行链路中已经确认的问题、潜在影响和建议改进方向，供后续架构研究和实施排期使用。

本文是现状评审，不代表已经确定的改造方案。Source 的公开配置语义仍以 [Source Authoring Guide](SOURCE_GUIDELINE.md) 为准，内部实现仍以 [Source Architecture](SOURCE_ARCHITECTURE.md) 为准。

## 评审范围

本文覆盖以下链路：

```text
Provider 配置
  → registry 构建与 RuntimeSource 恢复
  → 前端读取 SourceDescriptor
  → 卡片权限和参数处理
  → React Query
  → IndexedDB 缓存与请求去重
  → Background RPC
  → Secret 和 Request Rule
  → JSON / HTML / RSS / Custom Loader
  → 结果缓存与卡片渲染
```

这里的“后端”指浏览器扩展的 Manifest V3 Background Service Worker，不是独立的 HTTP 服务。

## 总体判断

当前链路的职责划分基本清晰：

- `packages/registry` 负责 Provider 定义和构建产物。
- `packages/source` 负责类型、校验、解析和 Loader Runtime。
- `apps/extension` 负责权限、Secret、缓存和浏览器内执行。

当前最值得优先处理的不是 Loader 的解析能力，而是执行边界不够统一：

1. 参数在不同入口中的规范化次数不一致。
2. 缓存没有区分用户或账号身份。
3. 用户主动刷新不一定绕过持久缓存。
4. 缓存和并发去重位于前端，而真正执行发生在 Background。
5. Custom Loader 的 capabilities 不是严格的运行时安全边界。

## 高优先级问题

### 1. 参数可能被重复规范化

正常卡片路径中，参数会经过以下处理：

```text
raw params
  → useSourceQuery.normalizeSourceParams()       第一次转换
  → normalized params #1
      ├─ loadSource.normalizeSourceParams()      第二次转换，用于 Cache Key
      └─ RPC 发送 normalized params #1
           → Background.prepareSourceRequest()
           → normalizeSourceParams()             第二次转换，用于 Loader
```

从具体数据传递看，卡片路径的 Cache Key 和 Loader 最终参数通常都是经过两次参数转换后的值。直接调用 `loadSource(rawParams)`、CLI 执行和临时 Provider 执行则通常只转换一次。

trim、数字转换等操作通常是幂等的，但参数 Liquid 模板不保证幂等。例如：

```liquid
{{ scope.value | append: "-suffix" }}
```

用户输入 `foo` 在卡片路径中可能变为 `foo-suffix-suffix`，而在其他入口中只变为 `foo-suffix`。

影响：

- 同一个 Source 在不同入口中可能得到不同参数。
- Cache Key 可能基于已经重复转换的值。
- Source 作者需要无意中依赖“参数模板必须幂等”这一未声明约束。
- 后续新增参数 transform 时容易引入隐蔽错误。

建议方向：

```text
raw params
  → 唯一一次 canonicalize
  → canonical params 同时用于 Cache Key、RPC 和 Loader
```

需要明确 Raw Params 和 Canonical Params 的类型或接口边界，避免调用方重复处理。

### 2. Source 缓存没有账号身份

当前结果缓存键只包含：

```text
sourceId
  + cache.version
  + stableStringify(normalizedParams)
```

它不包含 Cookie、Secret、登录账号或其他用户身份。

典型问题：

```text
账号 A 加载个性化 Source 并写入缓存
  → 用户切换到账号 B
  → sourceId 和 params 没有变化
  → 账号 B 命中账号 A 的缓存
```

影响：

- 推荐流、关注流和个人数据可能短时间显示为旧账号内容。
- 这是正确性问题，也可能成为本地隐私问题。
- Secret 更新不会自动使 Source 结果缓存失效。

建议研究显式的缓存作用域：

```ts
type SourceCacheScope = "public" | "provider" | "account"
```

可能的实现方向：

- 为认证 Source 使用不可逆的身份指纹。
- 登录身份变化时失效对应 Provider 或 Source 的缓存。
- 允许账号相关 Source 禁用持久结果缓存。
- 将 Account Scope 纳入 Cache Key，但不能直接持久化 Token 或 Cookie。

### 3. 卡片刷新按钮不保证请求最新数据

单个卡片的刷新按钮调用普通 React Query `refetch()`。Query Function 会重新执行，但 `loadSource()` 仍然读取 IndexedDB：

```text
点击 Refresh
  → React Query 重新执行
  → IndexedDB 缓存仍在有效期
  → 返回旧缓存
  → 不发生实际 Loader 请求
```

目前只有通过 `useSourceRefetch()` 或全局刷新进入的路径会设置 `forceFresh` 标记。

影响：

- 用户看到加载动画，但数据并未真正刷新。
- 单卡刷新和全局刷新语义不同。
- 调试 Source 时容易误判 Loader 没有执行或远端数据没有变化。

建议：

- 所有明确由用户触发的刷新都绕过持久缓存。
- 强制刷新仍然参与相同 Cache Key 的 In-Flight 去重。
- 自动刷新、窗口聚焦刷新和普通挂载可以继续遵守 Source Cache Policy。

### 4. Custom Loader 的 capabilities 不是严格安全边界

JSON、HTML 和 RSS Loader 会在最终 URL 完成模板渲染和 `baseUrl` 解析后调用网络 capability 检查。

Custom Loader 则直接执行打包进扩展的 TypeScript 函数，Runtime 无法拦截其内部的 `fetch` 或 Browser API 调用。

当前 Custom Loader capabilities 实际主要用于：

- 前端权限提示。
- Host Permission 和 Browser Permission 请求。
- Provider 配置声明与构建期校验。

Browser Permission 是整个扩展共享的。如果其他 Source 已经获得某个域名权限，Custom Loader 可能使用该全局权限，即使它自身没有声明该域名。

因此当前真实的信任模型是：

```text
Structured Loader
  → Source 级网络 Runtime 检查

Custom Loader
  → 信任打包进扩展的 Provider 代码
```

建议在架构上明确二选一：

1. 将 Custom Loader 定义为可信的 Bundled Code，capabilities 只负责权限发现和声明，不宣称它是执行沙箱。
2. 为 Custom Loader 提供受控的 Fetch 和 Browser Adapter，并逐步禁止直接访问全局能力。

## 中高优先级问题

### 5. Request Rule 初始化存在首次加载竞态

Background 当前先注册 RPC Service，再异步调用 Request Rule 同步：

```text
registerService()
  → syncConfiguredSourceRequestRules() 异步执行
```

Source Load 没有等待同步完成。因此 Service Worker 冷启动时可能出现：

```text
前端发起 Source Load
  → Loader 先执行
  → DNR Session Rules 尚未安装
  → 首次请求失败
  → 稍后刷新又成功
```

需要 Header Rewrite、Referer 或其他 DNR 规则的 Source 风险最高。

此外，所有 Source 的 Request Rules 都是全局同时启用的。若多个 Source 请求相同域名或 URL 范围，一个 Source 的规则可能影响另一个 Source，缺少 Source 执行级隔离。

建议：

- 建立 Background Ready Promise。
- 需要 Request Rules 的 Loader 在首次执行前等待同步完成。
- 分析并约束不同 Source 之间重叠的 Rule Condition。
- 构建期检测明显冲突的规则。

### 6. 缓存和 In-Flight 去重不在真正的执行中心

当前职责分布是：

```text
Frontend Context
  → IndexedDB Result Cache
  → inFlightSourceLoads Map

Background
  → Secret
  → Loader Execution
  → 无 Result Cache
  → 无 In-Flight Deduplication
```

同一个页面内可以去重，但不同扩展上下文之间无法共享 In-Flight Promise，例如：

- 两个 Dashboard Tab。
- Dashboard 和其他扩展页面。
- Service Worker 重启前后的执行。

这些上下文可以同时要求 Background 执行相同的 Source Loader。

建议将以下职责下沉到 Background：

```text
Background
  → Canonical Params
  → Cache Key
  → Persistent Result Cache
  → In-Flight Deduplication
  → Secret Resolution
  → Loader Execution
```

前端 React Query 只保留 UI 状态、占位数据和短期视图缓存。

### 7. 每次加载都会重新读取整个 Descriptor 列表

`useSourceQuery()` 已经通过 `useSourceDescriptors()` 找到了目标 Source，但 `loadSource()` 又会执行：

```text
loadSourceDescriptor(sourceId)
  → loadSourceDescriptors()
  → background.registry.list()
  → 返回完整 SourceDescriptor[]
  → 前端 find(sourceId)
```

RuntimeSource Map 虽然在 Background 内缓存，但每次 RPC 仍然需要重新创建、序列化和传输整个 Descriptor 数组。

影响：

- 多张卡片同时加载时产生重复全量 RPC。
- Source 数量越多，序列化成本越明显。
- 前端已有 Descriptor Cache 却没有被复用。

可能的改进：

- `loadSource()` 接收已经解析过的 Descriptor。
- Background 提供按 Source ID 查询的接口。
- 更彻底地把 Cache Key 和 Cache Policy 判断下沉到 Background，使前端不再需要为执行重新获取 Descriptor。

## 缓存系统问题

### 8. IndexedDB 缓存没有清理机制

Cache Entry 保存 `cachedAt` 和 `usedAt`，但当前：

- 过期 Entry 只被视为 Cache Miss，不会删除。
- `usedAt` 会更新，但没有用于 LRU。
- Source 被删除或 Cache Version 更新后，旧 Entry 仍然保留。

随着参数组合、Source 数量和版本增加，数据库会持续累积不可再使用的数据。

建议至少增加一种清理机制：

- 按概率在读写时触发清理。
- 按 `usedAt` 实施 LRU。
- 限制 Entry 数量或估算后的总大小。
- 删除明显过期、旧版本或已经不存在的 Source Entry。

### 9. Cache Version 完全依赖作者手动更新

Source Loader、字段选择器、模板或返回结构变化后，如果作者没有提高 `cache.version`，旧结果会继续使用到 `maxAge` 结束。

大部分 Source 使用：

```ts
cache: "5m"
```

该简写会固定解析成 Version 1。

建议研究：

- 声明式 Loader 根据影响结果的配置生成短 Hash。
- 保留手写 Version 作为显式破坏性升级机制。
- 构建期提醒 Loader 发生变化但 Cache Version 未变化。

Custom Loader 的代码 Hash 较难稳定处理，可以继续以显式 Version 为主。

### 10. Cache 故障完全不可观察

IndexedDB 的读取和写入异常都会被吞掉。这保证了 Cache 不会阻塞 Source Load，但也意味着：

- Cache 持续失效时没有诊断信息。
- Schema 或浏览器兼容问题难以排查。
- 用户只会感受到重复请求或加载变慢。

建议保持 Fail-Open，同时在开发环境输出日志，或提供轻量的诊断状态。

## Secret 相关问题

### 11. Secret Cache 可能长期覆盖真实 Cookie

当前 Secret 解析顺序是：

```text
读取 Provider Secret Cache
  → 如果存在则直接使用
  → 否则读取 Cookie 或 LocalStorage
```

如果 Cookie 已经轮换而 Secret Cache 仍保存旧值：

- 系统不会读取最新 Cookie。
- Loader 可能持续认证失败。
- 只有 Loader 主动调用 `updateSecrets()` 才可能恢复。
- 缺少统一的认证失败后重新解析和重试机制。

建议：

- Cookie 类型优先读取浏览器当前值。
- 或在明确的认证失败后清理缓存、重新解析一次并受控重试。
- Secret Cache 需要失效时间或来源版本。

### 12. Provider 级 Secret Namespace 可能发生 Key 碰撞

当前 Secret Cache 结构是：

```text
providerId
  → secret.key
    → value
```

它不包含：

- Source ID
- Secret Type
- Origin
- Cookie Name 或 LocalStorage Item Key

如果同一个 Provider 的两个 Source 使用相同 `secret.key`，但定义不同，可能互相读取缓存值。

如果 Provider 级共享是预期行为，建议增加构建期约束：

```text
同一 Provider 内，相同 Secret Key 的 Type、Origin、Item Key
和 Cache Policy 必须保持一致
```

## Loader 结果语义问题

### 13. 空结果被无条件视为错误

任何 Loader 正常返回空数组，前端都会转换成：

```text
No source items. Refresh to try again.
```

系统目前无法区分：

- 请求成功但当前没有内容。
- 网络请求失败。
- 返回格式错误。
- 登录失效。

这也意味着只返回动态 Metadata、暂时没有 Items 的结果无法正常展示。

建议为成功空结果提供独立 Empty State，仅将真正的异常视为 Error State。

### 14. 时间排序依赖第一条 Item

JSON 和 HTML Loader 当前只有在第一条 Item 的 `timestamp` 为真值时才排序：

```ts
if (type !== "hottest" && news.length > 0 && news[0].timestamp) {
  news.sort(...)
}
```

可能的问题：

- 第一条没有 Timestamp，但后续都有时完全不排序。
- Timestamp 为 `0` 时不排序。
- 第一条有 Timestamp、后续缺失时，比较器可能产生 `NaN`。
- 排序行为由第一条数据决定，而不是明确的 Source 配置。

建议明确缺失 Timestamp 的排序位置，并根据有效 Timestamp 集合决定排序行为。

## 边缘执行路径问题

### 15. Current-Context Fallback 与 Background 路径不等价

没有 Extension Runtime 时，`loadSource()` 会尝试直接执行：

```ts
runtimeSource.loader(params)
```

该路径不具备完整的：

- Secret Resolution
- `updateSecrets`
- Background Browser API
- Request Rule Ready State
- 权限交互流程

正常前端上下文也没有自动注册 Bundled Registry Loader，因此它更像测试或特殊宿主的兼容路径，而不是完整的备用执行路径。

建议明确其支持范围：

- 如果只用于测试，应改名并限制调用入口。
- 如果需要成为正式的非 Background 执行方式，应抽取统一 Execution Adapter。

## 其他架构约束

### Registry 更新需要重新构建扩展

Source Registry 完全来自扩展 Bundled Artifacts，不从远程服务或扩展存储读取。Source 更新需要：

```text
修改 Provider
  → 重新构建 registry.json 和 loaders.ts
  → 重新构建或发布扩展
```

这不是当前实现 Bug，但限制了 Source 的独立更新能力。未来若引入远程 Registry，需要重新设计：

- 签名和完整性校验。
- Declarative Loader 与 Executable Loader 的版本兼容。
- Capability 和权限变更确认。
- Registry 回滚。
- Custom Code 的信任边界。

在这些问题解决前，保持 Bundled Registry 更安全。

## 建议实施顺序

### 第一阶段：修复明确的正确性问题

1. 将参数规范化收敛为唯一一次。
2. 让用户主动刷新统一绕过持久缓存。
3. 区分 Empty Result 和 Loader Error。
4. 修复 Timestamp 排序规则。
5. 让首次 Source Load 等待 Request Rules Ready。

### 第二阶段：调整执行职责

1. 将 Result Cache 下沉到 Background。
2. 将 In-Flight Deduplication 下沉到 Background。
3. 让 Background 统一生成 Canonical Params 和 Cache Key。
4. 移除每次加载时的全量 Descriptor RPC。
5. 为 IndexedDB 增加清理和容量限制。

### 第三阶段：完善身份和安全模型

1. 定义 `public`、`provider`、`account` Cache Scope。
2. 解决 Secret Freshness 和 Provider Key 碰撞。
3. 明确 Custom Loader 是 Trusted Code 还是受控执行环境。
4. 分析并约束跨 Source Request Rule 冲突。

## 需要先做出的架构决策

实施前建议先确认以下问题：

1. Background 是否应该成为 Source Execution 的唯一权威入口？
2. 账号相关缓存由 Source 作者显式声明，还是由 Secret 定义自动推断？
3. Custom Loader 是否被正式定义为完全可信的 Bundled Code？
4. 用户点击刷新是否无条件绕过所有持久缓存？
5. 空结果是正常状态，还是所有现有 Source 都要求至少返回一条内容？
6. Provider 级 Secret Key 是否允许跨 Source 共享？
7. Request Rules 是否允许多个 Source 对同一请求范围产生叠加影响？

这些决策会直接影响类型设计、缓存迁移、兼容策略和 Source 作者文档，不宜在实现阶段临时决定。
