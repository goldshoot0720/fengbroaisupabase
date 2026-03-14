# 使用官方Node.js 24 LTS镜像作为基础镜像
FROM node:24-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS build

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:24-alpine AS production

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nuxt -u 1001

# 复制package文件并安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=build --chown=nuxt:nodejs /app/.output ./.output

# 切换到非root用户
USER nuxt

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# 启动应用
CMD ["node", ".output/server/index.mjs"]