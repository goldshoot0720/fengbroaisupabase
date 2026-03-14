# Docker 部署指南

## 文件说明

- `Dockerfile` - 生产环境镜像构建文件
- `Dockerfile.dev` - 开发环境镜像构建文件
- `docker-compose.yml` - Docker Compose配置文件
- `.dockerignore` - Docker构建忽略文件

## 快速开始

### 1. 生产环境部署

```bash
# 构建并启动生产环境
docker-compose up -d

# 查看日志
docker-compose logs -f nuxt-app
```

### 2. 开发环境

```bash
# 启动开发环境
docker-compose --profile dev up nuxt-dev

# 或者直接使用Docker
docker build -f Dockerfile.dev -t nuxt-dev .
docker run -p 3001:3000 --env-file .env nuxt-dev
```

### 3. 单独构建镜像

```bash
# 构建生产镜像
docker build -t nuxt-app .

# 运行容器
docker run -p 3000:3000 --env-file .env nuxt-app
```

## 环境变量

确保在 `.env` 文件中设置以下变量：

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 常用命令

```bash
# 停止所有服务
docker-compose down

# 重新构建镜像
docker-compose build

# 查看运行状态
docker-compose ps

# 进入容器
docker-compose exec nuxt-app sh
```

## 注意事项

1. 生产环境使用多阶段构建，优化镜像大小
2. 使用非root用户运行应用，提高安全性
3. 包含健康检查，确保服务正常运行
4. 开发环境支持热重载