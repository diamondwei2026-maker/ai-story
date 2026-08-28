#!/usr/bin/env bash
# ============================================================================
# novelcraft-pro 一键部署脚本 (阿里云 99 元服务器 · Alibaba Cloud Linux 3)
# ============================================================================
# 【部署教程 —— 沉淀于此脚本, 按注释章节逐步执行】
#
# 0. 前置(阿里云控制台, 一次性):
#    - 轻量应用服务器 → 本机防火墙 → 放行 80(HTTP)、443(HTTPS)、22(SSH)
#      (ECS 则在「安全组」里放行同样端口; 控制台防火墙与系统防火墙是两回事,
#       必须两边都放行)
#    - 确认服务器系统为 Alibaba Cloud Linux 3.x (本脚本只支持 RHEL 系)
#
# 1. 上传代码到服务器(任选其一):
#    - scp 打包上传: 本地打包后 scp 到 /root, 解压后进入仓库根目录运行本脚本
#    - git clone 仓库, 进入仓库根目录运行本脚本
#
# 2. 运行:  bash deploy.sh
#    - 首次运行会自动: 装 Node 20 / PM2 / nginx, 建 2G 交换分区,
#      开系统防火墙端口, 安装依赖并构建前后端, 初始化 MongoDB 集合,
#      启动后端(PM2 守护+开机自启), 配置 nginx(静态托管+反代 /api)
#    - 若 server/.env 不存在会交互式询问 DATABASE_URL(Atlas 连接串)
#      和 DEEPSEEK_API_KEY; 也可提前 export 这两个变量免交互
#    - 非交互运行: DATABASE_URL=... DEEPSEEK_API_KEY=... bash deploy.sh
#
# 3. 部署完成访问 http://<服务器公网IP> 即可
#    - 日志:  pm2 logs novelcraft-server
#    - 重启:  pm2 restart novelcraft-server
#    - 更新:  git pull 后重新运行 bash deploy.sh (幂等)
#
# 4. (可选)域名 + HTTPS:
#    - export DOMAIN=你的域名 后运行本脚本, 会自动写入 server_name
#    - 再执行: dnf install -y certbot python3-certbot-nginx
#              certbot --nginx -d 你的域名
#    - 或用阿里云免费 SSL 证书手动配置
#
# 【架构】
#   用户 → nginx(:80) ─┬─ 静态页面 frontend/dist
#                      └─ /api → 127.0.0.1:3000 (PM2 守护的 NestJS)
#   数据库 → MongoDB Atlas 云库 (服务器上无需安装 MongoDB)
# ============================================================================

set -euo pipefail

# ---------- 0. 前置检查 ----------
echo "==> [0/10] 前置检查"
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ 请用 root 运行: sudo bash deploy.sh"; exit 1
fi
if ! grep -qiE 'alibaba|anolis|rhel|centos|rocky' /etc/os-release; then
  echo "❌ 本脚本仅支持 RHEL 系(Alibaba Cloud Linux 3 / CentOS / Rocky)"; exit 1
fi
if [ "$(uname -m)" != "x86_64" ]; then
  echo "❌ 仅支持 x86_64 架构"; exit 1
fi

# ---------- 1. 系统: 防火墙端口 + 2G 交换分区(防构建 OOM) ----------
echo "==> [1/10] 系统准备: 防火墙 + 交换分区"
systemctl enable --now firewalld >/dev/null 2>&1 || true
firewall-cmd --permanent --add-service=http  >/dev/null 2>&1 || true
firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
firewall-cmd --reload >/dev/null 2>&1 || true

if [ "$(free -g | awk '/^Swap:/{print $2}')" -lt 2 ]; then
  echo "   创建 2G 交换分区..."
  if ! swapon --show | grep -q /swapfile; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

# ---------- 2. Node.js 20 (官方二进制, 不依赖 dnf 源) ----------
echo "==> [2/10] 安装 Node.js 20"
NODE_VER="v20.19.4"
if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 18 ]; then
  cd /tmp
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" -o node.tar.xz
  tar -xf node.tar.xz -C /usr/local
  ln -sf "/usr/local/node-${NODE_VER}-linux-x64/bin/node" /usr/local/bin/node
  ln -sf "/usr/local/node-${NODE_VER}-linux-x64/bin/npm"  /usr/local/bin/npm
  ln -sf "/usr/local/node-${NODE_VER}-linux-x64/bin/npx"  /usr/local/bin/npx
  rm -f /tmp/node.tar.xz
fi
node -v && npm -v

# 国内加速: npm 源 + Prisma 引擎下载源
npm config set registry https://registry.npmmirror.com >/dev/null 2>&1 || true
export PRISMA_ENGINES_MIRROR="${PRISMA_ENGINES_MIRROR:-https://registry.npmmirror.com/-/binary/prisma}"

# ---------- 3. PM2 ----------
echo "==> [3/10] 安装 PM2"
command -v pm2 >/dev/null || npm i -g pm2 --no-audit --no-fund
# 修复: tarball 安装的 Node 全局目录(如 /usr/local/node-v20.x-linux-x64/bin)不在 PATH,
# 全局装的 pm2 命令行找不到, 这里自动补个软链到 /usr/local/bin
PM2_BIN="$(npm prefix -g)/bin/pm2"
if [ -f "$PM2_BIN" ] && ! command -v pm2 >/dev/null 2>&1; then
  ln -sf "$PM2_BIN" /usr/local/bin/pm2
  echo "   已为 pm2 创建软链: /usr/local/bin/pm2"
fi
command -v pm2 >/dev/null 2>&1 || { echo "❌ pm2 安装失败"; exit 1; }

# ---------- 4. nginx ----------
echo "==> [4/10] 安装 nginx"
command -v nginx >/dev/null || dnf install -y nginx

# ---------- 5. 代码位置 ----------
echo "==> [5/10] 定位代码目录"
APP_DIR="${1:-$(cd "$(dirname "$0")" && pwd)}"
if [ ! -f "$APP_DIR/package.json" ]; then
  GIT_REPO="${GIT_REPO:?仓库根目录无 package.json: 请传入路径 bash deploy.sh /path/to/repo, 或设置 GIT_REPO=仓库地址}"
  APP_DIR=/opt/novelcraft
  [ -d "$APP_DIR" ] || git clone "$GIT_REPO" "$APP_DIR"
fi
cd "$APP_DIR"
echo "   代码目录: $APP_DIR"

# ---------- 6. 环境变量 server/.env ----------
echo "==> [6/10] 配置 server/.env"
ENV_FILE="$APP_DIR/server/.env"
IP=$(hostname -I | awk '{print $1}')
if [ ! -f "$ENV_FILE" ]; then
  DB_URL="${DATABASE_URL:-}"
  DS_KEY="${DEEPSEEK_API_KEY:-}"
  if [ -z "$DB_URL" ]; then
    read -r -p "   DATABASE_URL (MongoDB Atlas 连接串): " DB_URL
  fi
  if [ -z "$DS_KEY" ]; then
    read -r -p "   DEEPSEEK_API_KEY: " DS_KEY
  fi
  CORS_ORIGIN="${CORS_ORIGIN:-http://${DOMAIN:-$IP}}"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL="$DB_URL"
DEEPSEEK_API_KEY="$DS_KEY"
CORS_ORIGIN="$CORS_ORIGIN"
PORT=3000
EOF
  echo "   已生成 $ENV_FILE"
else
  echo "   已存在, 跳过 (如需修改请编辑 $ENV_FILE)"
fi

# ---------- 7. 安装依赖 + 构建 (前后端) ----------
echo "==> [7/10] 安装依赖并构建 (约 3-8 分钟)"
export NODE_OPTIONS="--max-old-space-size=1536"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npm run build   # server: prisma generate + nest build; frontend: vue-tsc + vite build

# ---------- 8. 初始化数据库 (MongoDB Atlas 建集合) ----------
echo "==> [8/10] 初始化数据库 (prisma db push)"
( cd "$APP_DIR/server" && npx prisma db push --skip-generate )

# ---------- 9. 启动后端 (PM2) ----------
echo "==> [9/10] 启动后端 (PM2 守护 + 开机自启)"
cd "$APP_DIR/server"
pm2 startOrRestart ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------- 10. 配置 nginx (静态 + /api 反代) ----------
echo "==> [10/10] 配置 nginx"
[ -f /etc/nginx/conf.d/default.conf ] && mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
cat > /etc/nginx/conf.d/novelcraft.conf <<'NGINX'
server {
    listen 80;
    server_name _;                 # 有域名时改为你的域名
    client_max_body_size 50m;

    root /APP_DIR_PLACEHOLDER/frontend/dist;
    index index.html;

    # 后端反代: NestJS 全局前缀 /api, 原样透传
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout  300s;   # AI 生成耗时长, 放宽超时
        proxy_send_timeout  300s;
        proxy_buffering off;        # 兼容流式响应
    }

    # 前端 SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
sed -i "s|/APP_DIR_PLACEHOLDER|$APP_DIR|" /etc/nginx/conf.d/novelcraft.conf
if [ -n "${DOMAIN:-}" ]; then
  sed -i "s|server_name _;|server_name $DOMAIN;|" /etc/nginx/conf.d/novelcraft.conf
fi
nginx -t
systemctl enable --now nginx >/dev/null 2>&1 || true
systemctl reload nginx

# ---------- 完成 ----------
sleep 2
echo ""
echo "============================================================"
echo "✅ 部署完成!"
echo "   访问地址: http://${DOMAIN:-$IP}"
echo "============================================================"
echo "常用命令:"
echo "   看日志:  pm2 logs novelcraft-server"
echo "   重启:    pm2 restart novelcraft-server"
echo "   状态:    pm2 status"
echo ""
echo "⚠️  若浏览器无法访问, 检查阿里云控制台:"
echo "   轻量服务器 → 防火墙(或 ECS 安全组) → 是否放行 80 端口"
if [ -n "${DOMAIN:-}" ]; then
  echo ""
  echo "ℹ️  配置 HTTPS:"
  echo "   dnf install -y certbot python3-certbot-nginx"
  echo "   certbot --nginx -d $DOMAIN"
fi
