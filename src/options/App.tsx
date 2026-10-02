import { useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { createContext, type ComponentChildren } from 'preact'
import { createTranslator, resolveLocale, type MessageKey } from '../shared/i18n'
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

const I18nContext = createContext(createTranslator())
const FONT_LABELS: Record<Settings['textFont'], MessageKey> = {
  Default: 'fontDefault', System: 'fontSystem', Serif: 'fontSerif', Monospace: 'fontMonospace',
}
const SIZE_LABELS: Record<Settings['textSize'], MessageKey> = {
  Tiny: 'sizeTiny', Small: 'sizeSmall', Normal: 'sizeNormal', Medium: 'sizeMedium', Large: 'sizeLarge', 'Extra Large': 'sizeExtraLarge',
}

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
  const locale = resolveLocale(settings?.language)
  const t = useMemo(() => createTranslator(locale), [locale])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = variant === 'page' ? t('settingsTitle') : 'MarkDang'
  }, [locale, t, variant])

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
      void saveSettings(p).then(() => setError('')).catch(error => setError(String(error)))
    }
  }, [])

  const toggleGear = (name: string) =>
    setExpanded(x => (x.includes(name) ? x.filter(n => n !== name) : [...x, name]))

  if (!settings) return <div class="loading" role="status">{error || t('loading')}</div>
  const s = settings
  const md = s.mdPluginOptions
  const pluginOn = (name: string) => s.mdPlugins.includes(name)
  const setPlugin = (name: string, on: boolean) =>
    patch({ mdPlugins: on ? [...new Set([...s.mdPlugins, name])] : s.mdPlugins.filter(n => n !== name) })

  const gearOptions = (name: string, node: ComponentChildren) =>
    expanded.includes(name) ? <div class="plugin-options">{node}</div> : null

  return (
    <I18nContext.Provider value={t}>
      <div class={`options${variant === 'popup' ? ' popup-mode' : ''}`}>
        <aside class="rail">
          <div class="brand">
            <img class="brand-logo" src="/brand/markdang-symbol-primary.svg" alt="MarkDang" />
          </div>
          <nav class="rail-nav">
            {(
              [
                ['general', t('general')],
                ['appearance', t('appearance')],
                ['plugins', t('plugins')],
                ['about', t('about')],
              ] as const
            ).map(([key, label]) => (
              <button key={key} class={section === key ? 'on' : ''} onClick={() => setSection(key)}>
                {label}
              </button>
            ))}
          </nav>
          {variant === 'popup' && (
            <button class="rail-open" title={t('openOptions')} onClick={() => chrome.runtime.openOptionsPage()}>
              ↗ {t('openTab')}
            </button>
          )}
        </aside>

        <main class="content">
          {error && <p role="alert">{t('settingsError', { error })}</p>}
          {section === 'general' && (
            <>
              <h1>{t('general')}</h1>
              <Group>
                <ToggleField title={t('enable')} desc={t('enableDesc')} checked={s.enable} onChange={v => patch({ enable: v })} />
                <Field title={t('language')} desc={t('languageDesc')}>
                  <select aria-label={t('language')} value={s.language} onChange={e => patch({ language: (e.target as HTMLSelectElement).value as Settings['language'] })}>
                    <option value="auto">{t('auto')}</option>
                    <option value="zh-CN">简体中文</option>
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field title={t('fileAccess')} desc={fileAccess === null ? t('fileAccessLoading') : fileAccess ? t('fileAccessAllowed') : t('fileAccessDenied')}>
                  <button class="btn" onClick={() => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })}>
                    {t('extensionDetails')}
                  </button>
                </Field>
                <ToggleField title={t('breaks')} desc={t('breaksDesc')} checked={pluginOn('Breaks')} onChange={v => setPlugin('Breaks', v)} />
                <ToggleField title={t('outlineExpandable')} desc={t('outlineExpandableDesc')} checked={s.isOutlineExpandable} onChange={v => patch({ isOutlineExpandable: v })} />
                <ToggleField title={t('folderUrl')} desc={t('folderUrlDesc')} checked={s.enableFolderUrl} onChange={v => patch({ enableFolderUrl: v })} />
                <ToggleField title={t('txt')} checked={s.enableTxtExt} onChange={v => patch({ enableTxtExt: v })} />
              </Group>

              <Group title={t('autoRefresh')}>
                <ToggleField
                  title={t('refreshDocument')}
                  desc={t('refreshDesc')}
                  checked={s.refresh}
                  onChange={v => patch({ refresh: v })}
                />
                {s.refresh && (
                  <Field title={t('refreshInterval')} desc={t('refreshRange')}>
                    <span class="inline-input">
                      <input
                        type="number"
                        min="0.5"
                        max="600"
                        step="0.5"
                        value={s.refreshInterval}
                        onChange={e => patch({ refreshInterval: Number((e.target as HTMLInputElement).value) || 0.5 })}
                      />
                      {t('seconds')}
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
                    }).catch(error => setError(String(error)))
                  }}
                >
                  {t('reset')}
                </button>
              </div>
            </>
          )}

          {section === 'appearance' && (
            <>
              <h1>{t('appearance')}</h1>
              <Group title={t('theme')}>
                <Field title={t('pageTheme')}>
                  <Segmented
                    value={s.pageTheme}
                    options={[
                      { value: 'auto', label: t('auto') },
                      { value: 'light', label: t('light') },
                      { value: 'dark', label: t('dark') },
                    ]}
                    onChange={v => patch({ pageTheme: v })}
                  />
                </Field>
                <Field title={t('dayCodeTheme')} desc={t('dayCodeThemeDesc')}>
                  <Segmented
                    value={s.codeBlockDayTheme}
                    options={[
                      { value: 'light', label: t('light') },
                      { value: 'dark', label: t('dark') },
                    ]}
                    onChange={v => patch({ codeBlockDayTheme: v })}
                  />
                </Field>
                <Field title={t('nightCodeTheme')} desc={t('nightCodeThemeDesc')}>
                  <Segmented
                    value={s.codeBlockNightTheme}
                    options={[
                      { value: 'light', label: t('light') },
                      { value: 'dark', label: t('dark') },
                    ]}
                    onChange={v => patch({ codeBlockNightTheme: v })}
                  />
                </Field>
                <ToggleField title={t('codeWrap')} checked={s.codeWrap} onChange={v => patch({ codeWrap: v })} />
              </Group>

              <Group title={t('typography')}>
                <Field title={t('textSize')}>
                  <div class="size-slider">
                    {TEXT_SIZES.map(size => (
                      <button
                        key={size}
                        class={`size-dot${s.textSize === size ? ' on' : ''}`}
                        style={`width:${10 + TEXT_SIZES.indexOf(size) * 3}px;height:${10 + TEXT_SIZES.indexOf(size) * 3}px`}
                        title={t(SIZE_LABELS[size])}
                        aria-label={t(SIZE_LABELS[size])}
                        onClick={() => patch({ textSize: size })}
                      />
                    ))}
                  </div>
                </Field>
                <Field title={t('font')}>
                  <select value={s.textFont} onChange={e => patch({ textFont: (e.target as HTMLSelectElement).value as Settings['textFont'] })}>
                    {FONTS.map(f => (
                      <option key={f} value={f}>
                        {t(FONT_LABELS[f])}
                      </option>
                    ))}
                  </select>
                </Field>
              </Group>

              <Group title={t('layout')}>
                <ToggleField title={t('zen')} desc={t('zenDesc')} checked={s.zenMode || s.mode === 'zen'} onChange={v => patch({ zenMode: v, mode: 'normal' })} />
                <ToggleField title={t('centered')} desc={t('centeredDesc')} checked={s.centered} onChange={v => patch({ centered: v })} />
                <ToggleField title={t('customWidth')} checked={s.enableCustomContentWidth} onChange={v => patch({ enableCustomContentWidth: v })} />
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
                <ToggleField title={t('customCSS')} checked={s.enableCustomCSS} onChange={v => patch({ enableCustomCSS: v })} />
                {s.enableCustomCSS && (
                  <div class="css-config">
                    <textarea
                      rows={7}
                      spellcheck={false}
                      placeholder={t('cssPlaceholder')}
                      value={cssDraft}
                      onInput={e => setCssDraft((e.target as HTMLTextAreaElement).value)}
                    />
                    <div class="css-actions">
                      <button class="btn" onClick={() => setCssDraft(s.customCSS)}>
                        {t('cancel')}
                      </button>
                      <button class="btn primary" onClick={() => patch({ customCSS: cssDraft })}>
                        {t('applyCSS')}
                      </button>
                    </div>
                  </div>
                )}
              </Group>
            </>
          )}

          {section === 'plugins' && (
            <>
              <h1>{t('plugins')}</h1>
              <Group>
                <ToggleField title={t('localPlugins')} desc={t('localPluginsDesc')} checked={DEFAULT_MD_PLUGINS.every(name => s.mdPlugins.includes(name))} onChange={on => patch({ mdPlugins: [...(on ? DEFAULT_MD_PLUGINS : []), ...(pluginOn('PlantUML') ? ['PlantUML'] : [])] })} />
              </Group>

              <div class="group-card">
              {(
                [
                  ['Breaks', t('breaks'), t('breaksDesc')],
                  ['Linkify', t('linkify'), t('linkifyDesc')],
                  ['Typographer', t('typographer'), t('typographerDesc')],
                  ['Emoji', t('emoji'), t('emojiDesc')],
                  ['Sup', t('sup'), t('supDesc')],
                  ['Sub', t('sub'), t('subDesc')],
                  ['TOC', t('toc'), t('tocDesc')],
                  ['Ins', t('ins'), t('insDesc')],
                  ['Mark', t('mark'), t('markDesc')],
                  ['Katex', t('katex'), t('katexDesc')],
                  ['Mermaid', t('mermaid'), t('mermaidDesc')],
                  ['PlantUML', t('plantuml'), t('plantumlDesc')],
                  ['Abbr', t('abbr'), t('abbrDesc')],
                  ['Deflist', t('deflist'), t('deflistDesc')],
                  ['Footnote', t('footnote'), t('footnoteDesc')],
                  ['FrontMatter', t('frontMatter'), t('frontMatterDesc')],
                  ['MultimdTable', t('multimd'), t('multimdDesc')],
                  ['TaskLists', t('tasks'), t('tasksDesc')],
                  ['Alert', t('alerts'), t('alertsDesc')],
                ] as const
              ).map(([name, title, desc]) => (
                <section key={name} class="plugin-block">
                  <div class="plugin-head">
                    {name in md ? (
                      <button
                        type="button"
                        class={`gear${expanded.includes(name) ? ' open' : ''}`}
                        title={t('pluginOptions')}
                        aria-label={t('optionsFor', { title })}
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
              <h1>{t('about')}</h1>
              <div class="about">
                <img class="about-logo" src="/brand/markdang-horizontal-bilingual-primary.svg" alt="MarkDang / 码刻档" />
                <p>
                  <b>MarkDang / 码刻档 {chrome.runtime.getManifest().version}</b>
                </p>
                <p>{t('aboutDesc')}</p>
                <p><a href="https://github.com/emorywang/markdang" target="_blank" rel="noopener noreferrer">{t('projectHome')}</a> · <a href={`https://github.com/emorywang/markdang/blob/main/PRIVACY${locale === 'zh-CN' ? '.zh-CN' : ''}.md`} target="_blank" rel="noopener noreferrer">{t('privacy')}</a></p>
                <div class="support">
                  <p>{t('supportText')}</p>
                  <div class="support-links">
                    {locale === 'zh-CN' && <a class="btn" href="https://afdian.com/a/emory" target="_blank" rel="noopener noreferrer">{t('afdian')}</a>}
                    <a class="btn" href="https://ko-fi.com/emorywang" target="_blank" rel="noopener noreferrer">Ko-fi</a>
                  </div>
                </div>
                <p class="muted">{t('noncommercial')}</p>
              </div>
            </>
          )}
        </main>
      </div>
    </I18nContext.Provider>
  )
}

/* -------------------------------------------------- plugin option panels */

type Patcher<T> = (p: Partial<T>) => void

function LinkifyOptions({ options, patch }: { options: MdPluginOptions['Linkify']; patch: Patcher<MdPluginOptions['Linkify']> }) {
  const t = useContext(I18nContext)
  return (
    <>
      <ToggleField title={t('fuzzyLink')} desc={t('fuzzyLinkDesc')} checked={options.fuzzyLink} onChange={v => patch({ fuzzyLink: v })} />
      <ToggleField title={t('fuzzyIP')} desc={t('fuzzyIPDesc')} checked={options.fuzzyIP} onChange={v => patch({ fuzzyIP: v })} />
      <ToggleField title={t('fuzzyEmail')} desc={t('fuzzyEmailDesc')} checked={options.fuzzyEmail} onChange={v => patch({ fuzzyEmail: v })} />
    </>
  )
}

function TocOptions({ options, patch }: { options: MdPluginOptions['TOC']; patch: Patcher<MdPluginOptions['TOC']> }) {
  const t = useContext(I18nContext)
  const toggleLevel = (level: number) => {
    const has = options.includeLevel.includes(level)
    patch({ includeLevel: has ? options.includeLevel.filter(l => l !== level) : [...options.includeLevel, level].sort() })
  }
  return (
    <>
      <Field wide title={t('headingLevels')}>
        <div class="level-row">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <label key={level}>
              <input type="checkbox" checked={options.includeLevel.includes(level)} onChange={() => toggleLevel(level)} />
              {level}
            </label>
          ))}
        </div>
      </Field>
      <Field wide title={t('tocClass')}>
        <input type="text" value={options.containerClass} onChange={e => patch({ containerClass: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field wide title={t('tocPattern')}>
        <input type="text" value={options.markerPattern} onChange={e => patch({ markerPattern: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field wide title={t('tocOmit')}>
        <input type="text" value={options.omitTag} onChange={e => patch({ omitTag: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field title={t('listType')}>
        <Segmented
          value={options.listType}
          options={[
            { value: 'ul', label: t('unordered') },
            { value: 'ol', label: t('ordered') },
          ]}
          onChange={v => patch({ listType: v })}
        />
      </Field>
    </>
  )
}

function KatexOptions({ options, patch }: { options: MdPluginOptions['Katex']; patch: Patcher<MdPluginOptions['Katex']> }) {
  const t = useContext(I18nContext)
  return (
    <>
      <ToggleField title={t('bareMath')} desc={t('bareMathDesc')} checked={options.enableBareBlocks} onChange={v => patch({ enableBareBlocks: v })} />
      <ToggleField title={t('fencedMath')} checked={options.enableFencedBlocks} onChange={v => patch({ enableFencedBlocks: v })} />
      <ToggleField title={t('htmlInlineMath')} desc={t('htmlInlineMathDesc')} checked={options.enableMathInlineInHtml} onChange={v => patch({ enableMathInlineInHtml: v })} />
      <ToggleField title={t('htmlBlockMath')} desc={t('htmlBlockMathDesc')} checked={options.enableMathBlockInHtml} onChange={v => patch({ enableMathBlockInHtml: v })} />
      <ToggleField title={t('mathErrors')} desc={t('mathErrorsDesc')} checked={options.throwOnError} onChange={v => patch({ throwOnError: v })} />
      <Field title={t('errorColor')}>
        <input type="color" value={options.errorColor.trim()} onChange={e => patch({ errorColor: (e.target as HTMLInputElement).value })} />
      </Field>
    </>
  )
}

function MermaidOptions({ options, patch }: { options: MdPluginOptions['Mermaid']; patch: Patcher<MdPluginOptions['Mermaid']> }) {
  const t = useContext(I18nContext)
  return (
    <>
      <Field title={t('theme')}>
        <select value={options.theme} onChange={e => patch({ theme: (e.target as HTMLSelectElement).value as MdPluginOptions['Mermaid']['theme'] })}>
          {['auto', 'default', 'dark', 'neutral', 'forest'].map(theme => (
            <option key={theme} value={theme}>
              {theme === 'auto' ? t('followPage') : theme}
            </option>
          ))}
        </select>
      </Field>
      <Field wide title={t('mermaidConfig')} desc={t('mermaidConfigDesc')}>
        <textarea rows={6} spellcheck={false} value={options.json} onInput={e => patch({ json: (e.target as HTMLTextAreaElement).value })} />
      </Field>
    </>
  )
}

function FrontMatterOptions({ options, patch }: { options: MdPluginOptions['FrontMatter']; patch: Patcher<MdPluginOptions['FrontMatter']> }) {
  const t = useContext(I18nContext)
  return <ToggleField title={t('showMetadata')} desc={t('showMetadataDesc')} checked={options.showMetadata} onChange={v => patch({ showMetadata: v })} />
}

function MultimdOptions({ options, patch }: { options: MdPluginOptions['MultimdTable']; patch: Patcher<MdPluginOptions['MultimdTable']> }) {
  const t = useContext(I18nContext)
  return (
    <>
      <ToggleField title={t('rowspan')} desc={t('rowspanDesc')} checked={options.rowspan} onChange={v => patch({ rowspan: v })} />
      <ToggleField title={t('multiline')} desc={t('multilineDesc')} checked={options.multiline} onChange={v => patch({ multiline: v })} />
      <ToggleField title={t('headerless')} checked={options.headerless} onChange={v => patch({ headerless: v })} />
      <ToggleField title={t('multibody')} desc={t('multibodyDesc')} checked={options.multibody} onChange={v => patch({ multibody: v })} />
      <ToggleField title={t('autolabel')} desc={t('autolabelDesc')} checked={options.autolabel} onChange={v => patch({ autolabel: v })} />
    </>
  )
}

function TaskListOptions({ options, patch }: { options: MdPluginOptions['TaskLists']; patch: Patcher<MdPluginOptions['TaskLists']> }) {
  const t = useContext(I18nContext)
  return (
    <>
      <ToggleField title={t('tasksEnabled')} desc={t('tasksEnabledDesc')} checked={options.enabled} onChange={v => patch({ enabled: v })} />
      <ToggleField title={t('tasksLabel')} desc={t('tasksLabelDesc')} checked={options.label} onChange={v => patch({ label: v, ...(v ? {} : { labelAfter: false }) })} />
      <ToggleField
        title={t('tasksLabelBefore')}
        desc={t('tasksLabelBeforeDesc')}
        checked={options.labelAfter}
        onChange={v => patch({ labelAfter: v, ...(v ? { label: true } : {}) })}
      />
    </>
  )
}

function AlertOptions({ options, patch }: { options: MdPluginOptions['Alert']; patch: Patcher<MdPluginOptions['Alert']> }) {
  const t = useContext(I18nContext)
  const NAMES = ['important', 'note', 'tip', 'warning', 'caution', 'info', 'danger']
  const toggleName = (name: string) => {
    const has = options.alertNames.includes(name)
    patch({ alertNames: has ? options.alertNames.filter(n => n !== name) : [...options.alertNames, name] })
  }
  return (
    <>
      <Field wide title={t('alertTypes')} desc={t('alertTypesDesc')}>
        <div class="level-row">
          {NAMES.map(name => (
            <label key={name}>
              <input type="checkbox" checked={options.alertNames.includes(name)} onChange={() => toggleName(name)} />
              {name}
            </label>
          ))}
        </div>
      </Field>
      <ToggleField title={t('nestedAlerts')} desc={t('nestedAlertsDesc')} checked={options.deep} onChange={v => patch({ deep: v })} />
      <ToggleField title={t('infoContainer')} desc="::: info" checked={options.infoContainer} onChange={v => patch({ infoContainer: v })} />
      <ToggleField title={t('tipContainer')} desc="::: tip" checked={options.tipContainer} onChange={v => patch({ tipContainer: v })} />
      <ToggleField title={t('successContainer')} desc="::: success" checked={options.successContainer} onChange={v => patch({ successContainer: v })} />
      <ToggleField title={t('warningContainer')} desc="::: warning" checked={options.warningContainer} onChange={v => patch({ warningContainer: v })} />
      <ToggleField title={t('dangerContainer')} desc="::: danger" checked={options.dangerContainer} onChange={v => patch({ dangerContainer: v })} />
    </>
  )
}
