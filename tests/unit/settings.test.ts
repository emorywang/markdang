import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultSettings, mergeSettings, normalizeSettings } from '../../src/shared/settings'

test('partial nested records retain all defaults and sibling plugin options', () => {
  const s = normalizeSettings({ mdPluginOptions: { Katex: { enableBareBlocks: true } } })
  assert.equal(s.mdPluginOptions.Katex.enableBareBlocks, true)
  assert.equal(s.mdPluginOptions.Katex.errorColor, '#cc0000')
  assert.equal(s.mdPluginOptions.TOC.listType, 'ul')
  assert.equal(s.mdPluginOptions.TaskLists.enabled, false)
})

test('invalid persisted values cannot break settings consumers', () => {
  const s = normalizeSettings({ enable: 'false', mdPlugins: null, mdPluginOptions: null, customContentData: null, textSize: {}, refreshInterval: NaN })
  assert.equal(s.enable, true)
  assert.equal(s.refreshInterval, 0.5)
  assert.equal(s.textSize, 'Medium')
  assert.ok(s.mdPlugins.length)
  assert.equal(s.mdPluginOptions.Mermaid.theme, 'auto')
})

test('numbers, enums and arrays are normalized to supported values', () => {
  const s = normalizeSettings({ refreshInterval: 900, pageTheme: 'broken', mdPlugins: ['Mermaid', 'Mermaid', 'unknown', null], customContentData: { maxWidth: -5, maxPercent: 800 }, mdPluginOptions: { TOC: { includeLevel: [3, 1, 0, 7, 3, '2'] }, Alert: { alertNames: ['note', 'unknown', 'note'] } } })
  assert.equal(s.refreshInterval, 600)
  assert.equal(s.pageTheme, 'auto')
  assert.deepEqual(s.mdPlugins, ['Mermaid'])
  assert.equal(s.customContentData.maxWidth, 500)
  assert.equal(s.customContentData.maxPercent, 100)
  assert.deepEqual(s.mdPluginOptions.TOC.includeLevel, [1, 3])
  assert.deepEqual(s.mdPluginOptions.Alert.alertNames, ['note'])
})

test('patches merge recursively without mutating their input', () => {
  const base = defaultSettings()
  const next = mergeSettings(base, { mdPluginOptions: { Katex: { enableFencedBlocks: true } }, textSize: 'Large' })
  assert.equal(next.mdPluginOptions.Katex.enableFencedBlocks, true)
  assert.equal(base.mdPluginOptions.Katex.enableFencedBlocks, false)
  assert.equal(next.mdPluginOptions.Katex.errorColor, '#cc0000')
  assert.equal(next.textSize, 'Large')
})

test('unknown and prototype-related keys do not enter the schema', () => {
  const s = normalizeSettings(JSON.parse('{"__proto__":{"polluted":true},"unknown":1}'))
  assert.equal(Object.hasOwn(s, '__proto__'), false)
  assert.equal(Object.hasOwn(s, 'unknown'), false)
  assert.equal(({} as { polluted?: boolean }).polluted, undefined)
})
