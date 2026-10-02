import { useEffect, useMemo, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import {
  loadSettings,
  saveSettings,
  defaultSettings,
  mergeSettings,
  onSettingsChanged,
  DEFAULT_MD_PLUGINS,
  TEXT_SIZES,
  FONTS,
  type Settings,
  type MdPluginOptions,
  type DeepPartial,
} from '../shared/settings'

const GEAR_SVG =
  '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19.4 13a7.6 7.6 0 0 0 .1-1 7.6 7.6 0 0 0-.1-1l2.1-1.7a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4L9.4 5a7.7 7.7 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.7a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1a7.7 7.7 0 0 0 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.2 0 .5-.2.5-.4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13z"/><circle cx="12" cy="12" r="3.2"/></g></svg>'

/* -------------------------------------------------- primitives */

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" class={`switch${checked ? ' on' : ''}`} role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}>
      <span class="knob" />
    </button>
  )
}

function Field(props: { title: string; desc?: string; wide?: boolean; children: ComponentChildren }) {
  return (
    <div class={`field${props.wide ? ' wide' : ''}`}>
      <div class="field-text">
        <div class="field-title">{props.title}</div>
        {props.desc && <div class="field-desc">{props.desc}</div>}
      </div>
      <div class="field-control">{props.children}</div>
    </div>
  )
}

function ToggleField(props: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field title={props.title} desc={props.desc}>
      <Switch label={props.title} checked={props.checked} onChange={props.onChange} />
    </Field>
  )
}

function Group(props: { title?: string; children: ComponentChildren }) {
  return (
    <section class="group">
      {props.title && <div class="group-title">{props.title}</div>}
      <div class="group-card">{props.children}</div>
    </section>
  )
}

function Segmented<T extends string>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="segmented">
      {props.options.map(o => (
        <button key={o.value} class={o.value === props.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------- app */

type Section = 'general' | 'appearance' | 'plugins' | 'about'

export function App({ variant = 'page' }: { variant?: 'page' | 'popup' } = {}) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [section, setSection] = useState<Section>('general')
  const [expanded, setExpanded] = useState<string[]>([])
  const [cssDraft, setCssDraft] = useState('')
  const [error, setError] = useState('')
  const [fileAccess, setFileAccess] = useState<boolean | null>(null)

  useEffect(() => {
    void loadSettings().then(s => {
      setSettings(s)
      setCssDraft(s.customCSS)
    }).catch(error => setError(String(error)))
    chrome.extension.isAllowedFileSchemeAccess(allowed => setFileAccess(allowed))
    return onSettingsChanged(setSettings)
  }, [])

  const patch = useMemo(() => {
    return (p: DeepPartial<Settings>) => {
      setSettings(prev => (prev ? mergeSettings(prev, p) : prev))
      void saveSettings(p).then(() => setError('')).catch(error => setError(`保存失败：${String(error)}`))
    }
  }, [])

  const toggleGear = (name: string) =>
    setExpanded(x => (x.includes(name) ? x.filter(n => n !== name) : [...x, name]))

  if (!settings) return <div class="loading" role="status">{error || '加载中…'}</div>
  const s = settings
  const md = s.mdPluginOptions
  const pluginOn = (name: string) => s.mdPlugins.includes(name)
  const setPlugin = (name: string, on: boolean) =>
    patch({ mdPlugins: on ? [...new Set([...s.mdPlugins, name])] : s.mdPlugins.filter(n => n !== name) })

  const gearOptions = (name: string, node: ComponentChildren) =>
    expanded.includes(name) ? <div class="plugin-options">{node}</div> : null

  return (
    <div class={`options${variant === 'popup' ? ' popup-mode' : ''}`}>
      <aside class="rail">
        <div class="brand">
          <img class="brand-logo" src="/brand/markdang-symbol-primary.svg" alt="MarkDang" />
        </div>
        <nav class="rail-nav">
          {(
            [
              ['general', '通用'],
              ['appearance', '外观'],
              ['plugins', '插件'],
              ['about', '关于'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} class={section === key ? 'on' : ''} onClick={() => setSection(key)}>
              {label}
            </button>
          ))}
        </nav>
        {variant === 'popup' && (
          <button class="rail-open" title="在独立页面打开设置" onClick={() => chrome.runtime.openOptionsPage()}>
            ↗ 独立窗口
          </button>
        )}
      </aside>

      <main class="content">
        {error && <p role="alert">{error}</p>}
        {section === 'general' && (
          <>
            <h1>通用</h1>
            <Group>
              <ToggleField title="启用" desc="开启 MarkDang" checked={s.enable} onChange={v => patch({ enable: v })} />
              <Field title="本地文件访问" desc={fileAccess === null ? '正在读取权限…' : fileAccess ? '已允许访问本地文件与文件夹' : '未允许；请在扩展详情开启「允许访问文件网址」'}>
                <button class="btn" onClick={() => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })}>
                  打开扩展详情
                </button>
              </Field>
              <ToggleField title="换行风格" desc="开启时保留换行；关闭时遵循 CommonMark 规范" checked={pluginOn('Breaks')} onChange={v => setPlugin('Breaks', v)} />
              <ToggleField title="开启大纲折叠" desc="在大纲中显示折叠箭头" checked={s.isOutlineExpandable} onChange={v => patch({ isOutlineExpandable: v })} />
              <ToggleField title="渲染文件夹路径" desc="在打开文件夹时渲染文件浏览页" checked={s.enableFolderUrl} onChange={v => patch({ enableFolderUrl: v })} />
              <ToggleField title="将 .txt 文件视为 Markdown 渲染" checked={s.enableTxtExt} onChange={v => patch({ enableTxtExt: v })} />
            </Group>

            <Group title="自动刷新">
              <ToggleField
                title="自动刷新文档"
                desc="频繁访问文档源可能会受到目标服务器的请求限制，请在必要时启用"
                checked={s.refresh}
                onChange={v => patch({ refresh: v })}
              />
              {s.refresh && (
                <Field title="刷新间隔" desc="0.5 秒 – 600 秒">
                  <span class="inline-input">
                    <input
                      type="number"
                      min="0.5"
                      max="600"
                      step="0.5"
                      value={s.refreshInterval}
                      onChange={e => patch({ refreshInterval: Number((e.target as HTMLInputElement).value) || 0.5 })}
                    />
                    秒
                  </span>
                </Field>
              )}
            </Group>

            <div class="danger-row">
              <button
                class="btn danger"
                onClick={() => {
                  const d = defaultSettings()
                  void saveSettings(d).then(() => {
                    setSettings(d)
                    setCssDraft(d.customCSS)
                  }).catch(error => setError(`重置失败：${String(error)}`))
                }}
              >
                恢复默认设置
              </button>
            </div>
          </>
        )}

        {section === 'appearance' && (
          <>
            <h1>外观</h1>
            <Group title="主题">
              <Field title="页面主题">
                <Segmented
                  value={s.pageTheme}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  onChange={v => patch({ pageTheme: v })}
                />
              </Field>
              <Field title="浅色模式的代码块主题" desc="在浅色模式时激活">
                <Segmented
                  value={s.codeBlockDayTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  onChange={v => patch({ codeBlockDayTheme: v })}
                />
              </Field>
              <Field title="深色模式的代码块主题" desc="在深色模式时激活">
                <Segmented
                  value={s.codeBlockNightTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  onChange={v => patch({ codeBlockNightTheme: v })}
                />
              </Field>
              <ToggleField title="代码自动换行" checked={s.codeWrap} onChange={v => patch({ codeWrap: v })} />
            </Group>

            <Group title="排版">
              <Field title="字体大小">
                <div class="size-slider">
                  {TEXT_SIZES.map(size => (
                    <button
                      key={size}
                      class={`size-dot${s.textSize === size ? ' on' : ''}`}
                      style={`width:${10 + TEXT_SIZES.indexOf(size) * 3}px;height:${10 + TEXT_SIZES.indexOf(size) * 3}px`}
                      title={size}
                      onClick={() => patch({ textSize: size })}
                    />
                  ))}
                </div>
              </Field>
              <Field title="字体">
                <select value={s.textFont} onChange={e => patch({ textFont: (e.target as HTMLSelectElement).value as Settings['textFont'] })}>
                  {FONTS.map(f => (
                    <option key={f} value={f}>
                      {f === 'Default' ? 'Default（默认）' : f}
                    </option>
                  ))}
                </select>
              </Field>
            </Group>

            <Group title="布局">
              <ToggleField title="禅模式" desc="隐藏侧栏和所有控制界面，进入沉浸式阅读；Esc 退出" checked={s.zenMode} onChange={v => patch({ zenMode: v })} />
              <ToggleField title="内容居中" desc="利于阅读的居中布局" checked={s.centered} onChange={v => patch({ centered: v })} />
              <ToggleField title="自定义内容最大宽度" checked={s.enableCustomContentWidth} onChange={v => patch({ enableCustomContentWidth: v })} />
              {s.enableCustomContentWidth && (
                <div class="width-config">
                  <input
                    type="range"
                    min={s.customContentData.unit === 'px' ? 500 : 10}
                    max={s.customContentData.unit === 'px' ? 3000 : 100}
                    value={s.customContentData.unit === 'px' ? s.customContentData.maxWidth : s.customContentData.maxPercent}
                    onInput={e =>
                      patch({
                        customContentData: {
                          [s.customContentData.unit === 'px' ? 'maxWidth' : 'maxPercent']: Number((e.target as HTMLInputElement).value),
                        } as Partial<Settings['customContentData']>,
                      })
                    }
                  />
                  <input
                    type="number"
                    value={s.customContentData.unit === 'px' ? s.customContentData.maxWidth : s.customContentData.maxPercent}
                    onInput={e =>
                      patch({
                        customContentData: {
                          [s.customContentData.unit === 'px' ? 'maxWidth' : 'maxPercent']: Number((e.target as HTMLInputElement).value),
                        } as Partial<Settings['customContentData']>,
                      })
                    }
                  />
                  <select
                    value={s.customContentData.unit}
                    onChange={e =>
                      patch({ customContentData: { unit: (e.target as HTMLSelectElement).value as 'px' | '%' } })
                    }
                  >
                    <option value="px">px</option>
                    <option value="%">%</option>
                  </select>
                </div>
              )}
              <ToggleField title="自定义 CSS" checked={s.enableCustomCSS} onChange={v => patch({ enableCustomCSS: v })} />
              {s.enableCustomCSS && (
                <div class="css-config">
                  <textarea
                    rows={7}
                    spellcheck={false}
                    placeholder={'将自定义CSS粘贴到这里，例如:\narticle {\n  --text-base: #373737;\n}'}
                    value={cssDraft}
                    onInput={e => setCssDraft((e.target as HTMLTextAreaElement).value)}
                  />
                  <div class="css-actions">
                    <button class="btn" onClick={() => setCssDraft(s.customCSS)}>
                      取消
                    </button>
                    <button class="btn primary" onClick={() => patch({ customCSS: cssDraft })}>
                      应用 CSS
                    </button>
                  </div>
                </div>
              )}
            </Group>
          </>
        )}

        {section === 'plugins' && (
          <>
            <h1>插件</h1>
            <Group>
              <ToggleField title="本地渲染插件" desc="一键开启或关闭；需网络的 PlantUML 必须单独开启" checked={DEFAULT_MD_PLUGINS.every(name => s.mdPlugins.includes(name))} onChange={on => patch({ mdPlugins: [...(on ? DEFAULT_MD_PLUGINS : []), ...(pluginOn('PlantUML') ? ['PlantUML'] : [])] })} />
            </Group>

            <div class="group-card">
            {(
              [
                ['Breaks', '换行风格', '开启时保留换行；关闭时遵循 CommonMark 规范'],
                ['Linkify', '自动识别链接', '将 URL 转为可点击链接'],
                ['Typographer', '排版字符替换', '自动替换排版字符 (c) → ©, TM → ™'],
                ['Emoji', '表情', '启用表情语法 :smile: :+1: :sparkles:'],
                ['Sup', '上标', '启用上标 19^th^'],
                ['Sub', '下标', '启用下标 H~2~O'],
                ['TOC', '目录', '显示目录 [[TOC]]'],
                ['Ins', '插入', '启用插入 ++Inserted text++'],
                ['Mark', '标记', '启用标记 ==Marked text=='],
                ['Katex', '数学公式', '启用数学公式 $\\sqrt(3x-1)+(1+x)^2$'],
                ['Mermaid', 'Mermaid 图表（流程图、时序图、甘特图）', '启用 Mermaid 图表 flowchart, sequence diagram, Gantt chart'],
                ['PlantUML', 'PlantUML 图表（需网络）', '开启后将图表源码发送到 www.plantuml.com；请勿用于敏感内容'],
                ['Abbr', '缩写', '启用缩写 *[HTML]: Hyper Text Markup Language'],
                ['Deflist', '释义', '启用释义 <dl>'],
                ['Footnote', '脚注', '启用脚注语法 [^first]'],
                ['FrontMatter', '元数据', '启用元数据 --- \\n title: Hi \\n ---'],
                ['MultimdTable', '表格扩展语法', '启用 Multi-Markdown 表格'],
                ['TaskLists', '复选框', '启用任务列表语法 - [x] Todo'],
                ['Alert', '警告框', '强调警告信息 > [!NOTE | !TIP | !IMPORTANT | !WARNING | !CAUTION]'],
              ] as const
            ).map(([name, title, desc]) => (
              <section key={name} class="plugin-block">
                <div class="plugin-head">
                  {name in md ? (
                    <button
                      type="button"
                      class={`gear${expanded.includes(name) ? ' open' : ''}`}
                      title="插件选项"
                      aria-label={`${title}选项`}
                      aria-expanded={expanded.includes(name)}
                      onClick={() => toggleGear(name)}
                      dangerouslySetInnerHTML={{ __html: GEAR_SVG }}
                    />
                  ) : (
                    <span class="gear placeholder" />
                  )}
                  <Field title={title} desc={desc}>
                    <Switch label={title} checked={pluginOn(name)} onChange={v => setPlugin(name, v)} />
                  </Field>
                </div>
                {name === 'Linkify' && gearOptions('Linkify', <LinkifyOptions options={md.Linkify} patch={p => patch({ mdPluginOptions: { Linkify: p } })} />)}
                {name === 'TOC' && gearOptions('TOC', <TocOptions options={md.TOC} patch={p => patch({ mdPluginOptions: { TOC: p } })} />)}
                {name === 'Katex' && gearOptions('Katex', <KatexOptions options={md.Katex} patch={p => patch({ mdPluginOptions: { Katex: p } })} />)}
                {name === 'Mermaid' && gearOptions('Mermaid', <MermaidOptions options={md.Mermaid} patch={p => patch({ mdPluginOptions: { Mermaid: p } })} />)}
                {name === 'FrontMatter' && gearOptions('FrontMatter', <FrontMatterOptions options={md.FrontMatter} patch={p => patch({ mdPluginOptions: { FrontMatter: p } })} />)}
                {name === 'MultimdTable' && gearOptions('MultimdTable', <MultimdOptions options={md.MultimdTable} patch={p => patch({ mdPluginOptions: { MultimdTable: p } })} />)}
                {name === 'TaskLists' && gearOptions('TaskLists', <TaskListOptions options={md.TaskLists} patch={p => patch({ mdPluginOptions: { TaskLists: p } })} />)}
                {name === 'Alert' && gearOptions('Alert', <AlertOptions options={md.Alert} patch={p => patch({ mdPluginOptions: { Alert: p } })} />)}
              </section>
            ))}
            </div>
          </>
        )}

        {section === 'about' && (
          <>
            <h1>关于</h1>
            <div class="about">
              <img class="about-logo" src="/brand/markdang-horizontal-bilingual-primary.svg" alt="MarkDang / 码刻档" />
              <p>
                <b>MarkDang / 码刻档 {chrome.runtime.getManifest().version}</b>
              </p>
              <p>浏览器 Markdown 阅读器。无账号、无订阅、无遥测；个人与非商业用途免费，商业用途需另行授权。</p>
              <p><a href="https://github.com/emorywang/markdang" target="_blank" rel="noopener noreferrer">项目主页</a> · <a href="https://github.com/emorywang/markdang/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer">隐私声明</a></p>
              <p class="muted">基于 Vite · TypeScript · Preact · markdown-it · KaTeX · Mermaid · highlight.js 等优秀开源组件构建。</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* -------------------------------------------------- plugin option panels */

type Patcher<T> = (p: Partial<T>) => void

function LinkifyOptions({ options, patch }: { options: MdPluginOptions['Linkify']; patch: Patcher<MdPluginOptions['Linkify']> }) {
  return (
    <>
      <ToggleField title="模糊链接" desc="自动将类 http:// 或 https:// 的域名文本识别为链接" checked={options.fuzzyLink} onChange={v => patch({ fuzzyLink: v })} />
      <ToggleField title="模糊 IP 地址" desc="自动将 IP 地址识别为链接" checked={options.fuzzyIP} onChange={v => patch({ fuzzyIP: v })} />
      <ToggleField title="模糊邮箱地址" desc="自动将 foo@bar 邮箱地址识别为链接" checked={options.fuzzyEmail} onChange={v => patch({ fuzzyEmail: v })} />
    </>
  )
}

function TocOptions({ options, patch }: { options: MdPluginOptions['TOC']; patch: Patcher<MdPluginOptions['TOC']> }) {
  const toggleLevel = (level: number) => {
    const has = options.includeLevel.includes(level)
    patch({ includeLevel: has ? options.includeLevel.filter(l => l !== level) : [...options.includeLevel, level].sort() })
  }
  return (
    <>
      <Field wide title="标题层级">
        <div class="level-row">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <label key={level}>
              <input type="checkbox" checked={options.includeLevel.includes(level)} onChange={() => toggleLevel(level)} />
              {level}
            </label>
          ))}
        </div>
      </Field>
      <Field wide title="容器的 CSS 类名">
        <input type="text" value={options.containerClass} onChange={e => patch({ containerClass: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field wide title="匹配 TOC 的正则">
        <input type="text" value={options.markerPattern} onChange={e => patch({ markerPattern: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field wide title="忽略标题的注释标签">
        <input type="text" value={options.omitTag} onChange={e => patch({ omitTag: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field title="列表类型">
        <Segmented
          value={options.listType}
          options={[
            { value: 'ul', label: '无序' },
            { value: 'ol', label: '有序' },
          ]}
          onChange={v => patch({ listType: v })}
        />
      </Field>
    </>
  )
}

function KatexOptions({ options, patch }: { options: MdPluginOptions['Katex']; patch: Patcher<MdPluginOptions['Katex']> }) {
  return (
    <>
      <ToggleField title="启用裸数学公式" desc="渲染无 $$ 包裹的 \\begin 和 \\end 数学公式块" checked={options.enableBareBlocks} onChange={v => patch({ enableBareBlocks: v })} />
      <ToggleField title="启用围栏数学公式" checked={options.enableFencedBlocks} onChange={v => patch({ enableFencedBlocks: v })} />
      <ToggleField title="渲染在 HTML 中的行内数学公式" desc="渲染在 HTML 元素中的行内数学公式" checked={options.enableMathInlineInHtml} onChange={v => patch({ enableMathInlineInHtml: v })} />
      <ToggleField title="渲染在 HTML 中的块数学公式" desc="渲染在 HTML 元素中的块级 $$ 包裹的数学公式块" checked={options.enableMathBlockInHtml} onChange={v => patch({ enableMathBlockInHtml: v })} />
      <ToggleField title="显示解析错误" desc="公式解析失败时显示原文，并在标准公式解析路径中记录错误；关闭时由 KaTeX 使用错误颜色标记" checked={options.throwOnError} onChange={v => patch({ throwOnError: v })} />
      <Field title="错误颜色">
        <input type="color" value={options.errorColor.trim()} onChange={e => patch({ errorColor: (e.target as HTMLInputElement).value })} />
      </Field>
    </>
  )
}

function MermaidOptions({ options, patch }: { options: MdPluginOptions['Mermaid']; patch: Patcher<MdPluginOptions['Mermaid']> }) {
  return (
    <>
      <Field title="主题">
        <select value={options.theme} onChange={e => patch({ theme: (e.target as HTMLSelectElement).value as MdPluginOptions['Mermaid']['theme'] })}>
          {['auto', 'default', 'dark', 'neutral', 'forest'].map(t => (
            <option key={t} value={t}>
              {t === 'auto' ? 'Auto（跟随页面）' : t}
            </option>
          ))}
        </select>
      </Field>
      <Field wide title="mermaid.initialize 的配置项" desc="JSON 对象；无效内容使用默认配置。主题由上方控制，安全设置固定为 strict">
        <textarea rows={6} spellcheck={false} value={options.json} onInput={e => patch({ json: (e.target as HTMLTextAreaElement).value })} />
      </Field>
    </>
  )
}

function FrontMatterOptions({ options, patch }: { options: MdPluginOptions['FrontMatter']; patch: Patcher<MdPluginOptions['FrontMatter']> }) {
  return <ToggleField title="显示元数据" desc="在文档顶部将 Front Matter 渲染为表格" checked={options.showMetadata} onChange={v => patch({ showMetadata: v })} />
}

function MultimdOptions({ options, patch }: { options: MdPluginOptions['MultimdTable']; patch: Patcher<MdPluginOptions['MultimdTable']> }) {
  return (
    <>
      <ToggleField title="跨行合并单元格" desc="行内 ^^ 标记与上方单元格纵向合并" checked={options.rowspan} onChange={v => patch({ rowspan: v })} />
      <ToggleField title="跨行在单元格内换行" desc="行尾 \\ 使下一行并入本行单元格" checked={options.multiline} onChange={v => patch({ multiline: v })} />
      <ToggleField title="无表头模式" checked={options.headerless} onChange={v => patch({ headerless: v })} />
      <ToggleField title="多级表体" desc="空行分隔出多个表体区块" checked={options.multibody} onChange={v => patch({ multibody: v })} />
      <ToggleField title="自动生成标题标签" desc="为表格下方的 [标签] 行生成锚点 id（建议标签用英文）" checked={options.autolabel} onChange={v => patch({ autolabel: v })} />
    </>
  )
}

function TaskListOptions({ options, patch }: { options: MdPluginOptions['TaskLists']; patch: Patcher<MdPluginOptions['TaskLists']> }) {
  return (
    <>
      <ToggleField title="允许勾选" desc="复选框变为可点击" checked={options.enabled} onChange={v => patch({ enabled: v })} />
      <ToggleField title="将任务项渲染在标签内" desc="文字被 <label> 包裹（开启后其余标签选项才有意义）" checked={options.label} onChange={v => patch({ label: v, ...(v ? {} : { labelAfter: false }) })} />
      <ToggleField
        title="将文字显示在复选框之前"
        desc="默认复选框在文字前；开启后文字移到复选框之前（需先开启「将任务项渲染在标签内」，开启本项会自动补开）"
        checked={options.labelAfter}
        onChange={v => patch({ labelAfter: v, ...(v ? { label: true } : {}) })}
      />
    </>
  )
}

function AlertOptions({ options, patch }: { options: MdPluginOptions['Alert']; patch: Patcher<MdPluginOptions['Alert']> }) {
  const NAMES = ['important', 'note', 'tip', 'warning', 'caution', 'info', 'danger']
  const toggleName = (name: string) => {
    const has = options.alertNames.includes(name)
    patch({ alertNames: has ? options.alertNames.filter(n => n !== name) : [...options.alertNames, name] })
  }
  return (
    <>
      <Field wide title="Alert 类型" desc="GitHub [!类型] 引用语法支持的名称">
        <div class="level-row">
          {NAMES.map(name => (
            <label key={name}>
              <input type="checkbox" checked={options.alertNames.includes(name)} onChange={() => toggleName(name)} />
              {name}
            </label>
          ))}
        </div>
      </Field>
      <ToggleField title="嵌套 Alert" desc="允许警告框内部再嵌套警告框" checked={options.deep} onChange={v => patch({ deep: v })} />
      <ToggleField title="信息容器" desc="::: info" checked={options.infoContainer} onChange={v => patch({ infoContainer: v })} />
      <ToggleField title="提示容器" desc="::: tip" checked={options.tipContainer} onChange={v => patch({ tipContainer: v })} />
      <ToggleField title="成功容器" desc="::: success" checked={options.successContainer} onChange={v => patch({ successContainer: v })} />
      <ToggleField title="警告容器" desc="::: warning" checked={options.warningContainer} onChange={v => patch({ warningContainer: v })} />
      <ToggleField title="危险容器" desc="::: danger" checked={options.dangerContainer} onChange={v => patch({ dangerContainer: v })} />
    </>
  )
}
