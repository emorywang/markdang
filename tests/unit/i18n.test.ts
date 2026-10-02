import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTranslator, normalizeLanguage, resolveLocale } from '../../src/shared/i18n'
import { defaultSettings, normalizeSettings } from '../../src/shared/settings'

test('automatic language follows Chinese browsers and falls back to English', () => {
  for (const browser of ['zh', 'zh-CN', 'zh-TW', 'ZH_hant_HK']) assert.equal(resolveLocale('auto', browser), 'zh-CN')
  for (const browser of ['en', 'en-GB', 'ja', 'fr-FR', 'ar', '']) assert.equal(resolveLocale('auto', browser), 'en')
  assert.equal(defaultSettings().language, 'auto')
})

test('manual language overrides the browser and legacy tags normalize safely', () => {
  assert.equal(resolveLocale('en', 'zh-CN'), 'en')
  assert.equal(resolveLocale('zh-CN', 'en-US'), 'zh-CN')
  assert.equal(normalizeSettings({ language: 'zh_TW' }).language, 'zh-CN')
  assert.equal(normalizeSettings({ language: 'en-AU' }).language, 'en')
  for (const value of [null, {}, 7, 'de', 'unknown', 'auto']) assert.equal(normalizeLanguage(value), 'auto')
})

test('translated UI labels and dynamic text use the selected language', () => {
  const en = createTranslator('en')
  const zh = createTranslator('zh-CN')
  assert.equal(en('general'), 'General')
  assert.equal(zh('general'), '通用')
  assert.equal(en('directoryCounts', { files: 2, folders: 1 }), 'Files: 2 · Folders: 1')
  assert.equal(zh('foldHeading', { title: '<b>标题</b>' }), '折叠/展开 <b>标题</b>')
})
