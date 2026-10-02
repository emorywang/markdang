import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, renderFrontMatterTable } from '../../src/content/markdown'
import { defaultSettings } from '../../src/shared/settings'

const render = (source: string) => createRenderer(defaultSettings()).render(source).html

test('front matter values remain text rather than executable HTML', () => {
  const html = renderFrontMatterTable('title: <img src=x onerror=alert(1)>\nauthor: <script>bad</script>')
  assert.ok(html.includes('&lt;img'))
  assert.ok(!html.includes('<script>'))
})

test('disabled front matter does not discard source content', () => {
  const settings = defaultSettings()
  settings.mdPlugins = []
  const result = createRenderer(settings).render('---\ntitle: Visible\n---\n# Heading')
  assert.ok(result.html.includes('Visible'))
})

test('a horizontal rule beginning with four hyphens is not treated as front matter', () => {
  const result = createRenderer(defaultSettings()).render('----\nVisible\n---\n')
  assert.ok(result.html.includes('Visible'))
  assert.equal(result.frontMatter, '')
})

test('fence language names cannot escape HTML attributes', () => {
  const html = render('```foo"onclick="alert(1)\ntext\n```')
  assert.ok(html.includes('&quot;'))
  assert.ok(!html.includes('class="foo"onclick='))
})

test('TOC links use the actual ids of all headings, including omitted levels', () => {
  const settings = defaultSettings()
  settings.mdPluginOptions.TOC.includeLevel = [2]
  const html = createRenderer(settings).render('[[TOC]]\n\n# Same\n\n## Same\n\n## **Bold** `code`\n').html
  assert.ok(html.includes('id="same-1"'))
  assert.ok(html.includes('href="#same-1"'))
  assert.ok(html.includes('href="#bold-code"'))
  assert.ok(!html.includes('>**Bold**'))
})

test('duplicate headings and literal suffixes receive distinct ids', () => {
  const html = render('# A\n\n# A-1\n\n# A\n\n# A')
  const ids = [...html.matchAll(/<h1 id="([^"]+)"/g)].map(match => match[1])
  assert.deepEqual(ids, ['a', 'a-1', 'a-2', 'a-3'])
})

test('Unicode ids and fragments stay compatible', () => {
  const html = render('[[TOC]]\n\n# 中文标题')
  assert.ok(html.includes('id="中文标题"'))
  assert.ok(html.includes(`href="#${encodeURIComponent('中文标题')}"`))
})

test('TOC handles skipped levels and replaces multiple markers with valid nesting', () => {
  const settings = defaultSettings()
  settings.mdPluginOptions.TOC.includeLevel = [1, 3, 5]
  const html = createRenderer(settings).render('[[TOC]]\n\n# A\n\n##### B\n\n### C\n\n[[TOC]]').html
  assert.equal([...html.matchAll(/class="table-of-contents"/g)].length, 2)
  assert.ok(!html.includes('<ul><ul>'))
  assert.ok(html.includes('<li><a href="#b">B</a></li>'))
})

test('invalid TOC regex falls back instead of breaking document rendering', () => {
  const settings = defaultSettings()
  settings.mdPluginOptions.TOC.markerPattern = '/[/'
  const html = createRenderer(settings).render('[[TOC]]\n\n# A').html
  assert.ok(html.includes('table-of-contents'))
})

test('KaTeX error color applies to ordinary inline and display math', () => {
  const settings = defaultSettings()
  settings.mdPluginOptions.Katex.errorColor = '#123456'
  const html = createRenderer(settings).render('$\\unknowncommand$\n\n$$\\unknowncommand$$').html
  assert.ok(html.includes('#123456'))
})

test('labels before task checkboxes retain parsed emphasis, code, and links once', () => {
  const settings = defaultSettings()
  settings.mdPluginOptions.TaskLists = { enabled: true, label: true, labelAfter: true }
  const html = createRenderer(settings).render('- [x] **Bold** `code` [link](https://example.com)').html
  assert.equal([...html.matchAll(/<strong>Bold<\/strong>/g)].length, 1)
  assert.equal([...html.matchAll(/<code>code<\/code>/g)].length, 1)
  assert.equal([...html.matchAll(/>link<\/a>/g)].length, 1)
  assert.ok(!html.includes('**Bold**'))
  const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
  assert.ok(id && html.includes(`id="${id}"`))
  assert.ok(html.indexOf('</label>') < html.indexOf('<input'))
})

test('task options do not leak between independently constructed renderers', () => {
  const disabled = createRenderer(defaultSettings())
  const settings = defaultSettings()
  settings.mdPluginOptions.TaskLists = { enabled: true, label: true, labelAfter: true }
  const enabled = createRenderer(settings)
  assert.ok(disabled.render('- [ ] Task').html.includes(' disabled'))
  assert.ok(!enabled.render('- [ ] Task').html.includes(' disabled'))
})

test('nested task lists retain their structure and mark the correct parent lists', () => {
  const html = render('- [ ] Parent\n  - [x] Child')
  assert.equal([...html.matchAll(/contains-task-list/g)].length, 2)
  assert.equal([...html.matchAll(/class="task-list-item"/g)].length, 2)
  assert.ok(html.includes('Child'))
  assert.ok(html.indexOf('<ul', html.indexOf('Parent')) < html.indexOf('Child'))
})
