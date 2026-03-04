# 🦞 龙虾小队监控面板 - Dockerfile
# Issue #014: Docker 部署配置

FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和安装依赖
COPY package.json ./
RUN npm install --production

# 复制应用文件
COPY server.js ./
COPY index.html ./
COPY github-client.js ./

# 暴露端口
EXPOSE 3456

# 启动命令
CMD ["node", "server.js"]
