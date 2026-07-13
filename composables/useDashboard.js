// composables/useDashboard.js
// 儀表板到期提醒邏輯
import { computed } from 'vue'
import { useSubscriptions } from './useSubscriptions'
import { useFoods } from './useFoods'

export const useDashboard = () => {
  const { subscriptions } = useSubscriptions()
  const { foods } = useFoods()

  // 計算剩餘天數
  const calculateDaysRemaining = (targetDate) => {
    if (!targetDate) return null
    
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  // 訂閱到期提醒 - 3天和7天內
  const subscriptionAlerts = computed(() => {
    const alerts = {
      critical: [], // 3天內
      warning: []   // 7天內
    }

    subscriptions.value.forEach(subscription => {
      if (!subscription.nextdate) return
      
      const daysRemaining = calculateDaysRemaining(subscription.nextdate)
      
      if (daysRemaining !== null) {
        const alertItem = {
          id: subscription.id,
          name: subscription.name,
          daysRemaining,
          date: subscription.nextdate,
          type: 'subscription'
        }

        if (daysRemaining <= 3 && daysRemaining >= 0) {
          alerts.critical.push(alertItem)
        } else if (daysRemaining <= 7 && daysRemaining >= 0) {
          alerts.warning.push(alertItem)
        }
      }
    })

    // 按剩餘天數排序
    alerts.critical.sort((a, b) => a.daysRemaining - b.daysRemaining)
    alerts.warning.sort((a, b) => a.daysRemaining - b.daysRemaining)

    return alerts
  })

  // 食品到期提醒 - 7天和30天內
  const foodAlerts = computed(() => {
    const alerts = {
      critical: [], // 7天內
      warning: []   // 30天內
    }

    foods.value.forEach(food => {
      if (!food.todate) return
      
      const daysRemaining = calculateDaysRemaining(food.todate)
      
      if (daysRemaining !== null) {
        const alertItem = {
          id: food.id,
          name: food.name,
          daysRemaining,
          date: food.todate,
          type: 'food',
          amount: food.amount
        }

        if (daysRemaining <= 7 && daysRemaining >= 0) {
          alerts.critical.push(alertItem)
        } else if (daysRemaining <= 30 && daysRemaining >= 0) {
          alerts.warning.push(alertItem)
        }
      }
    })

    // 按剩餘天數排序
    alerts.critical.sort((a, b) => a.daysRemaining - b.daysRemaining)
    alerts.warning.sort((a, b) => a.daysRemaining - b.daysRemaining)

    return alerts
  })

  // 統計數據
  const alertStats = computed(() => {
    return {
      subscriptions: {
        critical: subscriptionAlerts.value.critical.length,
        warning: subscriptionAlerts.value.warning.length,
        total: subscriptionAlerts.value.critical.length + subscriptionAlerts.value.warning.length
      },
      foods: {
        critical: foodAlerts.value.critical.length,
        warning: foodAlerts.value.warning.length,
        total: foodAlerts.value.critical.length + foodAlerts.value.warning.length
      }
    }
  })

  // 格式化剩餘天數顯示
  const formatDaysRemaining = (days) => {
    if (days === 0) return '今天'
    if (days === 1) return '明天'
    if (days < 0) return `已過期 ${Math.abs(days)} 天`
    return `${days} 天後`
  }

  // 取得優先級顏色
  const getPriorityColor = (days, type) => {
    if (days < 0) return 'expired' // 已過期
    
    if (type === 'subscription') {
      if (days <= 3) return 'critical'
      if (days <= 7) return 'warning'
    } else if (type === 'food') {
      if (days <= 7) return 'critical'
      if (days <= 30) return 'warning'
    }
    
    return 'normal'
  }

  return {
    subscriptionAlerts,
    foodAlerts,
    alertStats,
    formatDaysRemaining,
    getPriorityColor,
    calculateDaysRemaining
  }
}