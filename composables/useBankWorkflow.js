import { computed, reactive, ref } from 'vue'

const formatNumber = (num) => Number(num || 0).toLocaleString()

export const useBankWorkflow = ({ banks, updateBank, deleteBank }) => {
  const showTransactionModal = ref(false)
  const transactionType = ref('income')
  const transactionForm = reactive({
    bankId: '',
    amount: null
  })

  const batchMode = ref(false)
  const selectedIds = ref(new Set())
  const showBatchAdjustModal = ref(false)
  const batchOperation = ref('set')
  const batchAdjustMode = ref('fixed')
  const batchAdjustType = ref('income')
  const batchFixedAmount = ref(null)
  const individualAdjustments = reactive({})

  const selectedTransactionBank = computed(() => {
    if (!transactionForm.bankId) return null
    return banks.value.find(bank => String(bank.id) === String(transactionForm.bankId)) || null
  })

  const selectedBanks = computed(() => banks.value.filter(bank => selectedIds.value.has(bank.id)))

  const projectedTransactionBalance = computed(() => {
    const bank = selectedTransactionBank.value
    if (!bank) return 0
    const amount = Number(transactionForm.amount) || 0
    return transactionType.value === 'income'
      ? (Number(bank.deposit) || 0) + amount
      : (Number(bank.deposit) || 0) - amount
  })

  const enterBatchMode = () => {
    batchMode.value = true
  }

  const exitBatchMode = () => {
    batchMode.value = false
    selectedIds.value = new Set()
    closeBatchAdjustModal()
  }

  const isAllSelected = computed(() => {
    return banks.value.length > 0 && banks.value.every(bank => selectedIds.value.has(bank.id))
  })

  const toggleSelect = (id) => {
    const nextSelectedIds = new Set(selectedIds.value)
    if (nextSelectedIds.has(id)) nextSelectedIds.delete(id)
    else nextSelectedIds.add(id)
    selectedIds.value = nextSelectedIds
  }

  const toggleSelectAll = () => {
    selectedIds.value = isAllSelected.value
      ? new Set()
      : new Set(banks.value.map(bank => bank.id))
  }

  const resetBatchAdjustForm = () => {
    batchOperation.value = 'set'
    batchAdjustMode.value = 'fixed'
    batchAdjustType.value = 'income'
    batchFixedAmount.value = null
    Object.keys(individualAdjustments).forEach(key => delete individualAdjustments[key])
  }

  const openBatchAdjustModal = () => {
    if (selectedIds.value.size === 0) {
      alert('請先選擇銀行')
      return
    }
    resetBatchAdjustForm()
    selectedBanks.value.forEach(bank => {
      individualAdjustments[bank.id] = null
    })
    showBatchAdjustModal.value = true
  }

  function closeBatchAdjustModal() {
    showBatchAdjustModal.value = false
    resetBatchAdjustForm()
  }

  const getRawBatchAmount = (bank) => {
    return batchAdjustMode.value === 'fixed'
      ? batchFixedAmount.value
      : individualAdjustments[bank.id]
  }

  const hasBatchInput = (bank) => {
    const rawAmount = getRawBatchAmount(bank)
    return rawAmount !== null && rawAmount !== ''
  }

  const getBatchAmount = (bank) => {
    const rawAmount = getRawBatchAmount(bank)
    const amount = Number(rawAmount)
    return Number.isFinite(amount) ? amount : 0
  }

  const hasValidBatchAmount = (bank) => {
    if (!hasBatchInput(bank)) return false
    const amount = Number(getRawBatchAmount(bank))
    if (!Number.isFinite(amount) || amount < 0) return false
    return batchOperation.value === 'set' || amount > 0
  }

  const getAdjustedDeposit = (bank) => {
    const currentDeposit = Number(bank.deposit) || 0
    if (!hasBatchInput(bank)) return currentDeposit
    const amount = getBatchAmount(bank)
    if (batchOperation.value === 'set') return amount
    return batchAdjustType.value === 'income'
      ? currentDeposit + amount
      : currentDeposit - amount
  }

  const totalBatchAdjustment = computed(() => {
    return selectedBanks.value.reduce((total, bank) => total + getBatchAmount(bank), 0)
  })

  const totalProjectedDeposit = computed(() => {
    return selectedBanks.value.reduce((total, bank) => total + getAdjustedDeposit(bank), 0)
  })

  const isBatchReady = computed(() => {
    return selectedBanks.value.length > 0 && selectedBanks.value.every(bank => hasValidBatchAmount(bank))
  })

  const submitBatchAdjust = async () => {
    const targets = selectedBanks.value.map(bank => ({ ...bank }))
    if (targets.length === 0) {
      alert('請先選擇銀行')
      return
    }

    const invalidBanks = targets.filter(bank => !hasValidBatchAmount(bank))
    if (invalidBanks.length > 0) {
      if (batchOperation.value === 'set') {
        alert(batchAdjustMode.value === 'fixed'
          ? '請輸入 0 或更大的固定存款數字'
          : '每家選中的銀行都要輸入 0 或更大的存款數字')
      } else {
        alert(batchAdjustMode.value === 'fixed'
          ? '請輸入大於 0 的固定金額'
          : '每家選中的銀行都要輸入大於 0 的金額')
      }
      return
    }

    const actionText = batchOperation.value === 'set'
      ? '設定存款數字'
      : `${batchAdjustType.value === 'income' ? '增加' : '減少'}金額`
    if (!confirm(`確定要為 ${targets.length} 家銀行${actionText}嗎？`)) return

    let ok = 0
    const failed = []

    for (const bank of targets) {
      const result = await updateBank(bank.id, {
        ...bank,
        deposit: getAdjustedDeposit(bank)
      })
      if (result.success) {
        ok++
      } else {
        failed.push(`${bank.name}: ${result.error}`)
      }
    }

    if (failed.length > 0) {
      alert(`已更新 ${ok} 筆，失敗 ${failed.length} 筆\n${failed.join('\n')}`)
    } else {
      alert(`已更新 ${ok} 家銀行金額`)
      closeBatchAdjustModal()
    }
  }

  const deleteSelected = async () => {
    const count = selectedIds.value.size
    if (count === 0) return
    if (count === banks.value.length) {
      const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE bank 確認：`)
      if (input !== 'DELETE bank') {
        alert('輸入不正確，已取消')
        return
      }
    } else if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) {
      return
    }

    let ok = 0
    for (const id of [...selectedIds.value]) {
      const result = await deleteBank(id)
      if (result.success) ok++
    }
    selectedIds.value = new Set()
    batchMode.value = false
    alert(`已刪除 ${ok} 筆`)
  }

  const resetTransactionForm = () => {
    transactionForm.bankId = ''
    transactionForm.amount = null
  }

  const openTransactionModal = (type) => {
    transactionType.value = type === 'expense' ? 'expense' : 'income'
    resetTransactionForm()
    showTransactionModal.value = true
  }

  const closeTransactionModal = () => {
    showTransactionModal.value = false
    resetTransactionForm()
  }

  const submitTransaction = async () => {
    const bank = selectedTransactionBank.value
    const amount = Number(transactionForm.amount)

    if (!bank) {
      alert('請先選擇銀行')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('請輸入正確金額')
      return
    }

    const nextDeposit = transactionType.value === 'income'
      ? (Number(bank.deposit) || 0) + amount
      : (Number(bank.deposit) || 0) - amount

    const result = await updateBank(bank.id, {
      ...bank,
      deposit: nextDeposit
    })

    if (result.success) {
      closeTransactionModal()
      alert(`${bank.name} 已更新為 NT$ ${formatNumber(nextDeposit)}`)
    } else {
      alert('更新失敗: ' + result.error)
    }
  }

  return {
    showTransactionModal,
    transactionType,
    transactionForm,
    selectedTransactionBank,
    projectedTransactionBalance,
    openTransactionModal,
    closeTransactionModal,
    submitTransaction,
    batchMode,
    selectedIds,
    showBatchAdjustModal,
    batchOperation,
    batchAdjustMode,
    batchAdjustType,
    batchFixedAmount,
    individualAdjustments,
    selectedBanks,
    totalBatchAdjustment,
    totalProjectedDeposit,
    isBatchReady,
    enterBatchMode,
    exitBatchMode,
    isAllSelected,
    toggleSelect,
    toggleSelectAll,
    openBatchAdjustModal,
    closeBatchAdjustModal,
    hasBatchInput,
    getBatchAmount,
    getAdjustedDeposit,
    submitBatchAdjust,
    deleteSelected
  }
}
