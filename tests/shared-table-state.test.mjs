import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { after, describe, it } from 'node:test'

// Resolve app imports as Vite does (extension-less relative specifiers in composables/).
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/composables/') && /^\.\/[^.]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

const { useSharedTableState, loadSharedTable } = await import('../composables/useSharedTableState.js')

after(() => hooks.deregister())

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('shared table state', () => {
  it('shares one in-flight request between concurrent callers', async () => {
    const state = useSharedTableState('concurrent')
    const gate = deferred()
    let calls = 0

    const fetcher = () => {
      calls += 1
      return gate.promise
    }

    const first = loadSharedTable(state, fetcher, { label: 'concurrent' })
    const second = loadSharedTable(state, fetcher, { label: 'concurrent' })

    assert.equal(calls, 1, 'the second caller must reuse the pending request')
    assert.equal(first, second, 'both callers get the same promise')
    assert.equal(state.loading.value, true)

    gate.resolve([{ id: 1 }])
    await first

    assert.equal(state.items.value.length, 1)
    assert.equal(state.loading.value, false)
    assert.equal(state.inflight, null, 'the pending request is cleared once settled')
  })

  it('returns the same state object for the same table key', () => {
    assert.equal(useSharedTableState('shared-key'), useSharedTableState('shared-key'))
    assert.notEqual(useSharedTableState('shared-key'), useSharedTableState('other-key'))
  })

  it('refreshes silently when cached rows are already on screen', async () => {
    const state = useSharedTableState('silent')

    await loadSharedTable(state, async () => [{ id: 1 }], { label: 'silent' })
    assert.equal(state.items.value.length, 1)

    const gate = deferred()
    const refresh = loadSharedTable(state, () => gate.promise, { label: 'silent' })

    // Cached rows stay visible, so the page must not flip back to its loading state.
    assert.equal(state.loading.value, false)
    assert.deepEqual(state.items.value, [{ id: 1 }])

    gate.resolve([{ id: 1 }, { id: 2 }])
    await refresh
    assert.equal(state.items.value.length, 2)
  })

  it('keeps the previous rows and records the message when a refresh fails', async () => {
    const state = useSharedTableState('failing')

    await loadSharedTable(state, async () => [{ id: 1 }], { label: 'failing' })
    await loadSharedTable(state, async () => {
      throw new Error('boom')
    }, { label: 'failing' })

    assert.deepEqual(state.items.value, [{ id: 1 }], 'a failed refresh must not blank the page')
    assert.equal(state.error.value, 'boom')
    assert.equal(state.loading.value, false)
  })
})
