import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { after, it } from 'node:test'

// Keep the real upload and usage scan; replace browser/runtime dependencies.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      vue: 'export const ref = value => ({ value }); export const computed = fn => ({ get value() { return fn() } });',
      './useSettings': 'export const resolveSupabaseBucket = () => "test-bucket";',
      './useSupabaseBrowserClient': 'export const getSupabaseBrowserClient = () => globalThis.storageTestClient;',
      './useToast': 'export const useToast = () => ({ warning: message => globalThis.storageTestWarnings.push(message) });',
      '../utils/mediaTraffic': 'export const recordMediaTraffic = () => {};',
    }
    if (context.parentURL?.includes('/composables/')) {
      if (specifier in stubs) return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true }
      if (/^\.\/[^.]+$/.test(specifier)) return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => {
  hooks.deregister()
  delete globalThis.storageTestClient
  delete globalThis.storageTestWarnings
})
const { useStorage } = await import('../composables/useStorage.js')
const MB = 1024 * 1024

for (const [name, currentBytes, size, allowed, warned] of [
  ['below warning threshold', 898 * MB, MB, true, false],
  ['exactly 900 MB warns', 899 * MB, MB, true, true],
  ['reported 906 MB + 5.71 MB upload', 906 * MB, Math.round(5.71 * MB), true, true],
  ['reported 906 MB + 2.72 MB upload', 906 * MB, Math.round(2.72 * MB), true, true],
  ['reported 906 MB + 752 KB upload', 906 * MB, 752 * 1024, true, true],
  ['exactly 999 MB is allowed', 998 * MB, MB, true, true],
  ['one byte above 999 MB is blocked', 998 * MB, MB + 1, false, false],
  ['already above limit is blocked', 1000 * MB, 1, false, false],
]) {
  it(name, async () => {
    let uploads = 0
    globalThis.storageTestWarnings = []
    globalThis.storageTestClient = { storage: { from: () => ({
      list: async () => ({ data: [{ id: 'existing', name: 'existing', metadata: { size: currentBytes } }], error: null }),
      upload: async () => { uploads++; return { data: {}, error: null } },
      getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file' } }),
    }) } }
    const result = await useStorage().uploadFile({ name: 'file.bin', size, type: 'application/octet-stream' })
    assert.equal(result.success, allowed, result.error)
    assert.equal(uploads, allowed ? 1 : 0)
    assert.equal(globalThis.storageTestWarnings.length, warned ? 1 : 0)
    if (!allowed) {
      assert.match(result.error, /999 MB 上傳上限/)
      assert.doesNotMatch(result.error, /低於 900/)
    }
  })
}
