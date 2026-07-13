# Quick Setup — Resend Email 通知（21 組）

## 快速設定步驟

### 1. 取得 Resend API Key

前往 [https://resend.com](https://resend.com) 申請帳號並建立 API Key。

> 免費方案每月可發送 3,000 封，每天上限 100 封。

### 2. 開啟 鋒兄設定（Settings）頁面

點選側邊欄 **鋒兄設定** → **Resend Email 通知** 區塊。

### 3. 選擇顯示組數

可從 **3 / 6 / 9 / 12 / 15 / 18 / 21** 中選擇要顯示的組數，最多支援 **21 組**收件人。

### 4. 填寫通知組別

每組填寫：

| 欄位 | 說明 | 範例 |
|------|------|------|
| `RESEND_API_KEY` | Resend 平台的 API Key | `re_xxxxxxxx` |
| `RESEND_TO_EMAIL` | 接收通知的 Email | `you@example.com` |

- 至少完整填寫 **第 1 組** 即可啟用通知
- 未完整填寫的組別會自動略過

### 5. 設定發送人 Email（可選）

`RESEND_FROM_EMAIL` 預設為 `FengBro AI <onboarding@resend.dev>`

> 若要使用自訂 domain，需先在 Resend 後台驗證網域。

### 6. 測試寄發

點擊 **測試寄發** 按鈕，確認所有已填寫的組別都能正常收信。

### 7. 儲存設定

點擊 **儲存設定** 按鈕保存。

---

## 通知觸發時機

| 通知類型 | 觸發條件 |
|----------|----------|
| 訂閱到期提醒 | 訂閱 `nextdate` 距今 **2 天** |
| 食品到期提醒 | 食品 `todate` 距今 **8 天** |

通知在每次開啟儀表板時自動檢查，每個項目每個到期日只通知一次（防重複）。

---

## GitHub

- 分支：`main`
- Repository: https://github.com/goldshoot0720/fengbroaisupabase
