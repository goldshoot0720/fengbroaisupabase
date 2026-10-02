// utils/revealItem.js
// 新增 / 修改後把該筆資料捲到畫面上：停在黏頂表頭（鋒兄 Console 標題列＋選單）的「略下方」，
// 不會被表頭蓋住，並短暫描邊提示是哪一筆。
//
// 用法：列表每一列加上 `data-reveal-id="<id>"`，存檔成功後呼叫 revealItem(id)。
// 位移計算（computeRevealScrollTop）不碰 DOM，node --test 可直接測。

export const REVEAL_ATTR = 'data-reveal-id'
// 項目上緣與表頭下緣之間留的距離（px）。
export const REVEAL_GAP_PX = 16
const FLASH_CLASS = 'reveal-flash'
const FLASH_MS = 1600

// scrollY：目前捲動位置；itemTop：項目相對視窗的上緣；
// obstructionBottom：黏頂表頭在「黏住時」的下緣（相對視窗）。
export const computeRevealScrollTop = ({ scrollY, itemTop, obstructionBottom = 0, gap = REVEAL_GAP_PX }) =>
  Math.max(0, Math.round(scrollY + itemTop - Math.max(0, obstructionBottom) - gap))

// 黏頂表頭黏住時會蓋到的高度：sticky 的 top + 自身高度。
// 用「黏住後」的位置計算，捲動前表頭還在文件流中也不會算錯。
const stickyHeaderBottom = () => {
  const header = document.querySelector('.top-header')
  if (!header) return 0
  const style = window.getComputedStyle(header)
  if (style.position !== 'sticky' && style.position !== 'fixed') return 0
  const top = Number.parseFloat(style.top) || 0
  return top + header.getBoundingClientRect().height
}

const escapeId = (id) => {
  const text = String(id)
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(text)
  return text.replace(/["\\]/g, '\\$&')
}

const flash = (el) => {
  el.classList.remove(FLASH_CLASS)
  // 重新觸發動畫（同一列連續存檔時）。
  void el.offsetWidth
  el.classList.add(FLASH_CLASS)
  window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS)
}

const nextFrames = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve))
})

// 等 Vue 完成更新與瀏覽器重新排版（兩幀）後再量位置、捲動。
// 找不到項目（例如被搜尋條件過濾掉）時什麼都不做，回傳 false。
export const revealItem = async (id, { gap = REVEAL_GAP_PX, highlight = true } = {}) => {
  if (typeof window === 'undefined' || id === null || id === undefined || id === '') return false
  await nextFrames()
  const el = document.querySelector(`[${REVEAL_ATTR}="${escapeId(id)}"]`)
  if (!el) return false
  const target = computeRevealScrollTop({
    scrollY: window.scrollY,
    itemTop: el.getBoundingClientRect().top,
    obstructionBottom: stickyHeaderBottom(),
    gap
  })
  if (Math.abs(target - window.scrollY) > 4) {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' })
  }
  if (highlight) flash(el)
  return true
}
