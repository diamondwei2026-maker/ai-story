/**
 * PM2 进程配置 — novelcraft-pro 后端 (NestJS)
 *
 * 用法:
 *   pm2 startOrRestart ecosystem.config.cjs   # 启动/重启
 *   pm2 logs novelcraft-server                # 查看日志
 *   pm2 restart novelcraft-server             # 手动重启
 *
 * 说明:
 *   - 应用本身不加载 .env, 这里在启动前解析同目录 .env,
 *     把 DATABASE_URL / DEEPSEEK_API_KEY / PORT 注入进程环境。
 *   - 支持带引号或不带引号的 KEY=VALUE 行, 忽略 # 注释行。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const env = {};

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#') || !line.includes('=')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
}

module.exports = {
  apps: [
    {
      name: 'novelcraft-server',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,          // 崩溃自动重启
      max_memory_restart: '768M', // 超过 768M 自动重启, 防 2G 内存吃满
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        ...env,                   // .env 中的变量(可覆盖上面默认值)
      },
    },
  ],
};
