import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extensionDetailsUrl } from '../../src/shared/browser'

test('extension details use the correct browser page and installed extension ID', () => {
  assert.equal(extensionDetailsUrl('store-id', 'Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0'), 'edge://extensions/?id=store-id')
  assert.equal(extensionDetailsUrl('unpacked-id', 'Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36'), 'chrome://extensions/?id=unpacked-id')
  assert.equal(extensionDetailsUrl('android-id', 'Mozilla/5.0 Chrome/148.0.0.0 EdgA/148.0.0.0'), 'edge://extensions/?id=android-id')
})
