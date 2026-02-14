# 静态站点部署指南

## 概述

此项目现在支持静态站点生成(SSG)，可以部署到任何静态托管服务。

## 构建静态站点

### 本地构建

```bash
# 生成静态文件
npm run generate

# 预览静态站点
npm run preview:static
```

生成的文件位于 `.output/public/` 目录。

### Docker构建

```bash
# 构建静态站点镜像
docker build -f Dockerfile.static -t nuxt-static .

# 运行静态站点容器
docker run -p 8080:80 nuxt-static

# 或使用docker-compose
docker-compose --profile static up nuxt-static
```

## 部署选项

### 1. Netlify (推荐)
- 自动从GitHub部署
- 构建命令：`npm run generate`
- 发布目录：`.output/public`

### 2. Vercel
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### 3. GitHub Pages
```bash
# 生成静态文件
npm run generate

# 将.output/public内容推送到gh-pages分支
```

### 4. 其他静态托管
- AWS S3 + CloudFront
- Firebase Hosting
- Surge.sh
- Render

## 配置说明

### nuxt.config.ts
```typescript
export default defineNuxtConfig({
  // 启用静态生成
  nitro: {
    prerender: {
      routes: ['/']
    }
  },
  
  // 确保SSR启用以支持预渲染
  ssr: true
})
```

### 环境变量
静态站点中的环境变量必须在构建时可用：

```bash
# 构建时设置环境变量
SUPABASE_URL=your_url SUPABASE_ANON_KEY=your_key npm run generate
```

## 注意事项

1. **客户端渲染**: 由于使用了Supabase等外部服务，部分功能需要在客户端运行
2. **路由**: 确保托管服务支持SPA路由回退到index.html
3. **API调用**: 所有API调用都在客户端执行
4. **环境变量**: 只有public环境变量在静态站点中可用

## 性能优化

- 启用了Gzip压缩
- 静态资源缓存1年
- 图片和字体优化
- 代码分割和懒加载

## 故障排除

### 构建失败
```bash
# 清理缓存重新构建
rm -rf .nuxt .output node_modules
npm install
npm run generate
```

### 路由问题
确保nginx或托管服务配置了SPA回退规则。