<template>
  <section class="page-loading-state" role="status" aria-live="polite" aria-label="正在載入頁面">
    <div class="page-loading-state__bar" aria-hidden="true"></div>
    <div class="page-loading-state__line page-loading-state__line--wide" aria-hidden="true"></div>
    <div class="page-loading-state__line" aria-hidden="true"></div>
    <span>正在載入內容…</span>
  </section>
</template>

<style scoped>
.page-loading-state {
  display: grid;
  gap: 0.75rem;
  min-height: 13rem;
  align-content: center;
  justify-items: start;
  padding: clamp(1.5rem, 4vw, 3rem);
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.page-loading-state__bar,
.page-loading-state__line {
  height: 0.75rem;
  width: min(100%, 19rem);
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--bg-muted), var(--bg-elevated), var(--bg-muted));
  background-size: 220% 100%;
  animation: page-loading-shimmer 1.4s ease-in-out infinite;
}

.page-loading-state__bar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-sm);
}

.page-loading-state__line--wide {
  width: min(100%, 28rem);
}

.page-loading-state span {
  margin-top: 0.25rem;
  font-size: var(--text-sm);
}

@keyframes page-loading-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .page-loading-state__bar,
  .page-loading-state__line { animation: none; }
}
</style>
