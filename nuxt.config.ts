// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SSR模式 (服务器端渲染)
  ssr: true,

  // 應用程式配置
  app: {
    head: {
      title: '鋒兄AI Supabase',
      titleTemplate: '%s - 鋒兄AI Supabase',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: '鋒兄AI Supabase - 專業的訂閱、食物、影片和圖片管理平台' },
        { name: 'keywords', content: '鋒兄,Nuxt,資訊管理,訂閱管理,食物管理,影片庫,圖片庫' },
        { name: 'author', content: '鋒兄塗哥公關資訊' },
        { property: 'og:title', content: '鋒兄AI Supabase' },
        { property: 'og:description', content: '專業的資訊管理系統，整合訂閱、食物、影片和圖片管理功能' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: '鋒兄AI Supabase' },
        { name: 'twitter:description', content: '專業的資訊管理系統，整合訂閱、食物、影片和圖片管理功能' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa-192x192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'shortcut icon', href: '/favicon.ico' }
      ]
    }
  },

  // 模組
  modules: ['@nuxtjs/supabase', '@vite-pwa/nuxt'],

  // PWA 設定
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '鋒兄AI Supabase',
      short_name: '鋒兄AI',
      description: '鋒兄AI Supabase - 專業的訂閱、食物、影片和圖片管理平台',
      theme_color: '#3b82f6',
      background_color: '#f5f7fa',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon'
        },
        {
          src: 'favicon-16x16.png',
          sizes: '16x16',
          type: 'image/png'
        },
        {
          src: 'favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png'
        },
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      importScripts: ['/custom-sw.js'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 1 day
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true
    }
  },

  // Supabase 配置
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/*'],
    }
  },

  // 全域 CSS
  css: ['~/assets/css/variables.css'],

  // Netlify部署配置
  nitro: {
    preset: 'netlify'
  },

  components: [
    {
      path: '~/components',
      global: true,
      pathPrefix: false
    }
  ],

  runtimeConfig: {
    // Private keys (only available on server-side)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
    NETLIFY_AUTH_TOKEN: process.env.NETLIFY_AUTH_TOKEN,
    // Public keys (exposed to client-side)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseBucket: process.env.SUPABASE_BUCKET || 'uploads',
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    }
  }
})
