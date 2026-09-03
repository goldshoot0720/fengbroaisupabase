import { computed, ref } from 'vue'

// About 頁「銀行最高存款／銀行最低存款」指「總存款」的極值，並與
// 「上次使用網站」的紀錄比對。做法：每次開啟關於頁載入銀行資料後，
// 呼叫 captureBankSnapshot() 把目前總存款記到 localStorage，累積歷史
// 最高／最低總存款，並保留上一次總存款供顯示「比上次多／少」。

const SNAPSHOT_STORAGE_KEY = 'fengbro:bank-deposit-snapshot'

const readSnapshot = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useBankSessionCompare = (banks) => {
  // 「上次使用網站」留下的快照，capture 時讀一次後不再更動。
  const prevSnapshot = ref(readSnapshot())
  const currentTotal = computed(() =>
    (banks.value || []).reduce((total, bank) => total + (Number(bank.deposit) || 0), 0),
  )
  const sorted = computed(() =>
    [...(banks.value || [])].sort(
      (a, b) => (Number(b.deposit) || 0) - (Number(a.deposit) || 0),
    ),
  )

  const highestAccount = computed(() => {
    const first = sorted.value[0]
    return first && (Number(first.deposit) || 0) > 0
      ? { name: first.name, deposit: Number(first.deposit) || 0 }
      : null
  })
  const lowestAccount = computed(() => {
    const withBalance = sorted.value.filter((bank) => (Number(bank.deposit) || 0) > 0)
    const last = withBalance[withBalance.length - 1]
    return last ? { name: last.name, deposit: Number(last.deposit) || 0 } : null
  })

  const prev = computed(() => prevSnapshot.value)

  const maxTotal = computed(() => {
    const base = prev.value ? Number(prev.value.maxTotal) || 0 : currentTotal.value
    return Math.max(base, currentTotal.value)
  })
  const minTotal = computed(() => {
    const base = prev.value && Number.isFinite(Number(prev.value.minTotal))
      ? Number(prev.value.minTotal)
      : currentTotal.value
    return Math.min(base, currentTotal.value)
  })
  const delta = computed(() =>
    prev.value ? currentTotal.value - (Number(prev.value.lastTotal) || 0) : null,
  )

  /** 銀行資料載入完成後呼叫一次：以目前總存款寫入本次快照。 */
  const captureBankSnapshot = () => {
    if (!banks.value || banks.value.length === 0) return
    if (typeof localStorage === 'undefined') return
    const next = {
      maxTotal: maxTotal.value,
      minTotal: minTotal.value,
      lastTotal: currentTotal.value,
      lastCapturedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage 不可用時略過。
    }
  }

  return {
    currentTotal,
    maxTotal,
    minTotal,
    lastTotal: computed(() => prev.value?.lastTotal ?? null),
    lastCapturedAt: computed(() => prev.value?.lastCapturedAt ?? null),
    delta,
    highestAccount,
    lowestAccount,
    captureBankSnapshot,
  }
}
