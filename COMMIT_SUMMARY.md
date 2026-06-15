# Commit Summary — Resend Email 通知 拓展至 21 組

## 更新日期：2026-06-15

## 功能說明

### Resend Email 通知系統（21 組）

本次確認並記錄 Resend Email 通知系統已完整支援 **21 組** API Key / To Email 設定。

#### 核心檔案

| 檔案 | 說明 |
|------|------|
| `composables/useSettings.js` | `RESEND_PAIR_COUNT = 21`，`RESEND_GROUP_OPTIONS = [3, 6, 9, 12, 15, 18, 21]` |
| `composables/useExpiryEmailNotifications.js` | 自動偵測到期項目，批次發送通知給所有已設定收件人 |
| `server/api/notifications/resend.post.ts` | 後端 Resend API 代理，支援 Idempotency-Key |
| `components/pages/SettingsPage.vue` | 前端可選擇顯示 3/6/9/12/15/18/21 組設定 UI |

#### 21 組 Resend 通知機制

- **訂閱到期提醒**：提前 2 天自動發送（每組設定的 toEmail 都會收到）
- **食品到期提醒**：提前 8 天自動發送
- **冪等性保護**：使用 `Idempotency-Key` 防止重複發送
- **Log 記錄**：localStorage 保存發送記錄，避免同一項目重複通知
- **測試寄發**：設定頁可一鍵測試所有已完整填寫的組別
- **分組顯示**：可選擇顯示 3 / 6 / 9 / 12 / 15 / 18 / 21 組

#### 設定說明

每組需填寫：
- `RESEND_API_KEY` — 從 [resend.com](https://resend.com) 取得
- `RESEND_TO_EMAIL` — 接收通知的 Email 地址

發送人：
- `RESEND_FROM_EMAIL` — 預設 `FengBro AI <onboarding@resend.dev>`

## 技術架構

```
[瀏覽器 onMounted]
    └── runExpiryEmailNotifications()
            ├── 讀取 Supabase subscription 資料
            ├── 讀取 Supabase food 資料
            ├── 篩選 daysUntil === 2 的訂閱
            ├── 篩選 daysUntil === 8 的食品
            └── 批次 POST /api/notifications/resend (×21組)
                    └── fetch https://api.resend.com/emails
```

## GitHub

- 使用 `main` 分支
- Repository: https://github.com/goldshoot0720/fengbroaisupabase
