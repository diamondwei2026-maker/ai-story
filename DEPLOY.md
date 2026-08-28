# novelcraft-pro 阿里云部署教程（新手完整版）

> 适用：99 元阿里云服务器（**ECS 或轻量应用服务器均可**），系统 **Alibaba Cloud Linux 3**
> 配套脚本：[`deploy.sh`](deploy.sh)（一键部署）+ [`server/ecosystem.config.cjs`](server/ecosystem.config.cjs)（PM2 进程配置）
> 总耗时：约 40 分钟（大头是等待构建）
> 本教程从第一天就按**上线级安全标准**配置（密钥登录 + 关密码登录），**开发、测试、生产统一用这一套**，不用分环境降级。

---

## ★ 先读这里：哪些是通用的，哪些要按项目变

**这份教程是为"本仓库（novelcraft-pro，NestJS + Vue）"写的**，但它教的**流程**是通用的——部署任何网站/服务都是同一套骨架：

```
装环境 → 传代码 → 装依赖 → 构建 → 启动进程(守护) → 反向代理 → 配密钥/环境变量
```

**换项目时：流程照抄，命令要替换。** 各章节通用性标注如下：

| 章节 | 通用性 | 说明 |
|---|---|---|
| §1 服务器初始设置（安全组/密钥/加固） | 🔧 **完全通用** | 任何服务器都一样，照着做即可 |
| §2 MongoDB Atlas 数据库 | ⚙️ **按项目变** | 本项目的数据库是**云上的 MongoDB**；别的项目可能用 MySQL/PostgreSQL/Redis，甚至要在服务器上自己装，或不用数据库 |
| §3 DeepSeek API Key | ⚙️ **按项目变** | 每个项目需要的外部服务密钥不同（也可能是别的 AI/支付/短信服务） |
| §4 上传代码 | 🔧 **基本通用** | git clone / scp 对任何项目都适用，只需换仓库地址 |
| §5 运行部署脚本 | ⚙️ **按项目变** | `deploy.sh` 是本项目的构建/启动命令（npm + NestJS）；换技术栈就换命令，比如 Python 是 `pip install` + `gunicorn`，Java 是 `mvn` + `java -jar`，Go 是直接跑编译出的二进制 |
| §6 关闭密码登录 | 🔧 **完全通用** | SSH 安全加固，任何服务器都适用 |
| §7 日常运维 | ⚙️ **半通用** | PM2 守护进程的思路通用，但启动命令、日志名按项目变 |
| §8 问题排查 | ⚙️ **半通用** | 排查**思路**（先防火墙→再进程→再看日志）通用；具体报错信息按项目变 |
| §9 进阶（域名/HTTPS/fail2ban） | 🔧 **完全通用** | 任何服务器都适用 |

**一句话总结：流程通用，命令专属。** 学会这套流程后，换任何新项目，照着章节走、把每步的命令换成那个项目的官方文档写法即可。

---

## 0. 需要准备的三样东西

| 东西 | 哪里拿 | 用途 |
|---|---|---|
| ① 阿里云服务器 | 已购买 | 跑代码 |
| ② MongoDB Atlas 账号 | https://www.mongodb.com/ （免费注册） | 存小说数据（云数据库） |
| ③ DeepSeek API Key | https://platform.deepseek.com/ | AI 写小说接口 |

> 数据库用的是 **MongoDB Atlas 云库**，服务器上**不需要**装数据库，注册账号拿一个"连接串"即可。

---

## 1. 服务器初始设置（阿里云控制台 + 本机，约 15 分钟）

### 1.1 登录控制台，先确认你买的是哪种

浏览器打开 https://www.aliyun.com/ → 右上角「控制台」。**先分清产品类型**，因为入口不一样：

| 产品 | 控制台入口 | 界面里叫 |
|---|---|---|
| **ECS 云服务器**（常见 99 元款） | 「云服务器 ECS」→「实例」→ 点**实例 ID** | 「**安全组**」 |
| 轻量应用服务器 | 「轻量应用服务器」→ 服务器详情页 | 「**防火墙**」标签页 |

> **安全组 = 轻量的防火墙**，作用完全一样，只是叫法不同。后面统称"安全组/防火墙"。

### 1.2 记下公网 IP
在服务器列表/详情页能看到**公网 IP**（形如 `47.98.xx.xx`）。后面所有操作都要用到。

### 1.3 确认系统是 Alibaba Cloud Linux 3
详情页看「系统镜像」：
- ✅ **Alibaba Cloud Linux 3.x** → 继续
- ❌ 其他系统 → 「重置系统」选 Alibaba Cloud Linux 3（会清空数据，新机器无所谓）。**deploy.sh 只支持 RHEL 系。**

### 1.4 设置 root 密码
详情页 → 「重置密码」→ 设一个**强密码**（大小写+数字+符号）→ 重启实例。
> 这个密码只用于**第一次登录装密钥**，装好密钥并关闭密码登录后它就退休了。

### 1.5 放行端口（安全组/防火墙）★最关键，漏了必失败

**ECS**：实例 ID → 「安全组」标签页 → 「配置规则」→「入方向」→「手动添加」。
**轻量**：详情页 →「防火墙」→「添加规则」。

| 协议 | 端口 | 授权对象 | 说明 |
|---|---|---|---|
| TCP | 22 | 0.0.0.0/0 | SSH 登录 |
| TCP | 80 | 0.0.0.0/0 | 网页访问（HTTP） |
| TCP | 443 | 0.0.0.0/0 | HTTPS（配域名时用） |

**关于"高危风险"警告，直接无视**：
- **80/443 必须 `0.0.0.0/0`**——网站就是要让所有人访问，不加全世界都打不开。这个警告是例行提示。
- **22 也保持 `0.0.0.0/0`，不做 IP 限制**——因为你经常换电脑、换家庭地址，限制 IP 会把自己锁在外面。安全靠后面的"密钥+关密码"保证，不靠 IP 白名单。

> ⚠️ 控制台的安全组/防火墙和服务器系统内的防火墙（firewalld）是**两回事**。deploy.sh 会自动开系统防火墙；**控制台这个必须手动加**。

### 1.6 生成本机密钥对（在你自己的电脑上）

打开 PowerShell，执行：
```powershell
ssh-keygen -t ed25519 -C "my-server"
```

**这条命令是什么意思（逐段拆解）：**

| 部分 | 含义 |
|---|---|
| `ssh-keygen` | 生成密钥对的程序（key = 钥匙, gen = generate 生成） |
| `-t ed25519` | `-t` = type 指定算法类型；`ed25519` 是当前最安全、最快的现代加密算法（老教程里的 `rsa` 已过时） |
| `-C "my-server"` | `-C` = comment 给这把钥匙加个**备注**（相当于钥匙上的标签），写什么都行，比如 `"my-server"` 或你的邮箱；仅用于你自己区分多把钥匙，不影响功能 |

**执行后的效果：**
- 问 `Enter file in which to save the key` → 回车（用默认路径 `C:\Users\你的用户名\.ssh\id_ed25519`）
- 问 `Enter passphrase` → 回车留空，或设一个（每次用钥匙多输一次密码，更保险）
- 问 `Enter same passphrase again` → 再输一遍

一路回车（可顺手设个私钥口令）。完成后你的电脑 `C:\Users\你的用户名\.ssh\` 下有两个文件：
- `id_ed25519` = **私钥**（钥匙，绝不能外泄）
- `id_ed25519.pub` = **公钥**（锁，可以到处贴）

**经常换电脑？** 每台电脑都按这一步各生成一对密钥（各配各的锁），后面 1.8 会教你全部授权。

### 1.7 首次登录服务器，安装公钥

**方式 A（推荐，PowerShell 一键）**——需要 22 端口已放行：
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@你的服务器IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**需要你替换的部分（只有 1 处，其余原样照抄）：**

| 命令中的位置 | 替换成 | 示例 |
|---|---|---|
| **`你的服务器IP`**（唯一必须改） | 你服务器的**公网 IP**（1.2 记下的） | `ssh root@47.98.xx.xx "..."` |

**不需要动的部分：**
- `$env:USERPROFILE` → 系统变量，自动指向你的用户目录，别改成真实路径
- `id_ed25519.pub` → 1.6 用默认命令生成的公钥文件名；**除非**你生成时手动改了文件名（`-f` 参数），才需要对应改
- `root@`、引号里的 4 条命令 → 全部原样

**完整示例（把 IP 换成你自己的）：**
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@47.98.xx.xx "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**这条命令是什么意思（逐段拆解）：**

整条命令 = "把本机的公钥内容，通过 SSH 送进服务器，存到授权名单里"。拆成两半看：

**前半（本机）：** `type $env:USERPROFILE\.ssh\id_ed25519.pub`
- `type` = 读取文件内容并打印（相当于 Linux 的 `cat`）
- `$env:USERPROFILE` = 你的用户目录的变量（自动展开成 `C:\Users\你的用户名`）
- 合起来就是：**读出本机公钥文件的内容**
- `|`（管道符）= 把左边命令的输出，"喂给"右边的命令

**后半（服务器上执行）：** `ssh root@你的服务器IP "..."`
- `ssh root@你的服务器IP` = 用 root 账号远程登录服务器（此时还需要输密码，就是 1.4 设的那个）
- 引号里是**登录后在服务器上执行的命令**，`&&` = 前一条成功才执行后一条：
  1. `mkdir -p ~/.ssh` → 创建 `.ssh` 目录（`-p` = 已存在也不报错）
  2. `chmod 700 ~/.ssh` → 目录权限设为仅自己可读写执行（安全要求）
  3. `cat >> ~/.ssh/authorized_keys` → **把管道送来的公钥内容追加**到授权名单文件（`>>` = 追加，不覆盖已有内容；`cat` 接住管道输入）
  4. `chmod 600 ~/.ssh/authorized_keys` → 授权文件权限设为仅自己可读写（安全要求）

**执行效果**：你的公钥被写进了服务器的 `~/.ssh/authorized_keys`。之后服务器见到你的私钥就能对上号，免密放行。

> 💡 `>>`（追加）和 `>`（覆盖）的区别：`>>` 是往文件末尾加一行，`>` 是清空重写。换电脑配多把钥匙时用 `>>`，多台电脑的公钥才能共存。

输入密码（1.4 设的）执行完后，**验证免密登录**：
```powershell
ssh root@你的服务器IP
```
直接进来（不再问密码）→ ✅ 成功，继续。

**方式 B（Workbench 网页终端手动贴）**——全程不用 22 端口：
1. 阿里云控制台 → 你的服务器 → 「**远程连接**」（ECS 实例页也有，走阿里云内部通道）
2. 登录后依次执行（把公钥内容粘贴进去）：
   ```bash
   mkdir -p ~/.ssh && chmod 700 ~/.ssh
   echo "ssh-ed25519 AAAA...你的公钥内容" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
   公钥内容用本机 `type $env:USERPROFILE\.ssh\id_ed25519.pub` 查看复制。

### 1.8 经常换电脑 / 换地址怎么办（多公钥方案）

- **换电脑**：新电脑生成新密钥 → 把新公钥追加进服务器的 `authorized_keys`（重复 1.7 的追加命令）→ 旧电脑不用了，删掉 `~/.ssh/authorized_keys` 里对应那一行即可。私钥永远不离开各自的电脑，零迁移负担。
- **换地址/IP**：22 本来就不限制 IP（1.5 已说明），从公司、家、咖啡馆任何地方都能连。
- **出门在外**：手机装 **Termius**（免费 SSH 客户端），配合多公钥随时连。
- **终极兜底**：阿里云 Workbench 网页连接不依赖 22 端口，任何电脑浏览器都能登录——配置折腾坏了也能用它救回来。

### 1.9 为什么要这么配（理解比背命令重要）

你的公网 IP 是公开的，互联网上有大量**自动扫描程序** 24 小时扫全网的 22 端口，发现开放就连上去试密码（上线几小时内就有几百次尝试）。所以：
- **密码登录** = 可被猜/爆破的普通挂锁 → 关掉
- **密钥登录** = 256 位数学加密的指纹锁，只能靠偷私钥才能进（私钥在你电脑上）→ 保留
- **限制 IP** = 只让认识的人按门铃 → 不适合你（常换地址），放弃，风险由密钥兜住

---

## 2. 准备数据库（MongoDB Atlas，约 10 分钟）

### 2.1 注册并创建免费集群
1. https://www.mongodb.com/ → 注册（可用 Google/GitHub 账号）
2. 创建 Organization → Project（名字随意）
3. 「Build a Database」→ 选 **M0 Free**（免费档 512MB）→ Region 选近的（如 Singapore / Hong Kong）→ 创建

### 2.2 创建数据库用户
左侧 **Database Access** → Add New Database User：
- 用户名：`novelcraft`
- 密码：**建议纯字母+数字**（别带 `@ : / ?`，否则连接串解析出错——新手最常见的坑）
- 权限默认 → Add User

### 2.3 允许所有 IP 访问（必须！）
左侧 **Network Access** → Add IP Address → **Allow access from anywhere**（`0.0.0.0/0`）→ Confirm。
> 不设的话 Atlas 默认只允许创建集群时那台电脑的 IP，服务器连不上。

### 2.4 复制连接串并改造
1. 集群页「Connect」→ **Drivers** → 复制连接串
2. 改两处：
   - `<password>` → 换成 2.2 的密码
   - 主机名后加数据库名：`mongodb.net/novelcraft?retryWrites=...`（`/` 和 `?` 之间加 `novelcraft`）
3. 最终形如：`mongodb+srv://novelcraft:我的密码@cluster0.xxxxx.mongodb.net/novelcraft?retryWrites=true&w=majority`
4. **保存好**，第 5 步要用（这就是 `DATABASE_URL`）

---

## 3. 获取 DeepSeek API Key（约 2 分钟）

1. https://platform.deepseek.com/ → 注册/登录
2. 左侧「API Keys」→「创建」→ 复制保存（形如 `sk-xxxxx`，**只显示一次**）
3. 「充值」页充几块钱，按量计费能用很久

---

## 4. 把代码上传到服务器（二选一）

### 方案 A：git 推送 + 服务器克隆（推荐，本仓库已在 GitHub）

**本地（你的电脑）**：
```powershell
cd D:\Users\weij\ai-story
git add -A
git commit -m "准备部署"
git push origin HEAD
```
> 首次推送：用户名填 GitHub 用户名，**密码框填的不是账号密码**，而是 Personal Access Token（GitHub 设置 → Developer settings → Personal access tokens → Generate new token，勾选 `repo` 权限）。

**服务器上（怎么打开终端、在哪输入，完整步骤）：**

这三条命令是**在服务器上输入**的，不是在你自己电脑的 PowerShell 里。具体操作：

1. **打开服务器的"终端窗口"**（二选一）：
   - 方式一（网页终端，推荐）：阿里云控制台 → 你的服务器 → 「**远程连接**」（走阿里云内部通道，无需 22 端口）→ 进入网页版黑窗口
   - 方式二（本机终端）：自己的电脑打开 PowerShell，输入 `ssh root@你的服务器IP` 回车（1.7 配好密钥后免密直接进）
2. **确认登录成功**：窗口里出现 `[root@xxx ~]#` 这样的提示符（`#` = 你是 root 管理员），就说明已登录服务器，可以输入命令了
3. **先安装 git**（新装系统默认不带 git，不装会报 `-bash: git: command not found`）：
   ```bash
   dnf install -y git
   ```
   `dnf` = 系统包管理器（类似应用商店），`install -y` = 安装并自动确认。
4. **逐条输入下面 3 条命令**（每条输完按回车，等它执行完再输下一条）：
   ```bash
   cd /root
   git clone -b develop https://github.com/diamondwei2026-maker/ai-story.git
   cd ai-story
   ```
5. **为什么要用 `git clone -b develop`（重点！不加会出各种怪问题）**：
   - 这个仓库的**默认分支是 `main`**（旧代码），而部署相关的 `deploy.sh`、`package.json` 等文件都在 **`develop`** 分支上
   - `git clone`（不带 `-b`）默认只下载 `main` 分支，克隆完目录里**没有 deploy.sh**——直接 `bash deploy.sh` 会报 `No such file or directory`
   - `-b develop` = **克隆时直接指定分支**，克隆完自动就在 develop 上，不用再 `git checkout`
   - ⚠️ 之前踩过的坑：先克隆 main 再 `git checkout develop`，容易切不干净，导致目录里 deploy.sh 有、package.json 却没有，运行 `bash deploy.sh` 会在第 5 步报"找不到 package.json"（提示设置 GIT_REPO）。**重新用 `-b develop` 克隆一次最省事**
6. **看执行结果**：
   - `dnf install -y git` → 末尾出现 `Complete!` 说明装好了
   - `cd /root` → 没输出是正常的（只是"进入目录"）
   - `git clone -b develop ...` → 应显示 `Cloning into 'ai-story'...` 然后 `done.`，说明代码下载成功
   - `cd ai-story` → 同样无输出，正常
7. **验证**：输入 `ls` 回车，**必须能看到 `package.json`、`deploy.sh`、`server`、`frontend`** 这些文件，才说明代码到位。少任何一个都是分支不对，重新用第 4 步的 `-b develop` 克隆

> 💡 如果之前克隆/切换出了问题导致代码目录混乱，直接删了重来最快：
> ```bash
> cd /root && rm -rf ai-story && git clone -b develop https://github.com/diamondwei2026-maker/ai-story.git && cd ai-story
> ```
> 登录后默认就在 `/root`（root 用户的家目录），所以第一条 `cd /root` 其实经常可以省略，写上是为了保证在任何位置都能执行成功。
> 国内服务器访问 GitHub 慢属正常；可先把仓库镜像到 Gitee 再克隆。

### 方案 B：scp 直接上传（不想用 git 时）

**本地**：
```powershell
cd D:\Users\weij
Compress-Archive -Path ai-story -DestinationPath ai-story.zip
scp ai-story.zip root@你的服务器IP:/root/
```
**服务器上**：
```bash
cd /root
dnf install -y unzip
unzip ai-story.zip
cd ai-story
```

---

## 5. 登录服务器并运行一键部署

### 5.1 登录
- 已配好密钥：`ssh root@你的服务器IP`（免密直接进）
- 或：控制台「远程连接」Workbench 网页终端

### 5.2 运行部署脚本
```bash
cd /root/ai-story        # 方案 A/B 都先进代码目录
bash deploy.sh
```
脚本自动完成 10 步：装 Node 20 / PM2 / nginx → 建 2G 交换分区 → 装依赖 → 构建前后端 → 初始化数据库 → 启动服务 → 配 nginx。

**过程中只会问你两件事**（粘贴第 2、3 步存好的值）：
```
DATABASE_URL (MongoDB Atlas 连接串):   ← 粘贴 2.4 的连接串
DEEPSEEK_API_KEY:                       ← 粘贴第 3 步的 sk-xxx
```
然后**耐心等 3~8 分钟**，看到：
```
✅ 部署完成!
   访问地址: http://你的服务器IP
```
浏览器打开 `http://你的服务器IP` 验证。

---

## 6. 关闭密码登录（上线级安全收尾，约 1 分钟）

> 前提：1.7 已验证密钥能免密登录，再执行本步。**先开一个 Workbench 窗口别关**（逃生通道）。

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sshd -t && systemctl restart sshd
```
- `PasswordAuthentication no` = 全站禁密码登录，爆破路径彻底封死
- `PermitRootLogin prohibit-password` = root 只允许密钥登录
- 执行后**新开一个终端**验证 `ssh root@你的服务器IP` 仍能免密进入；确认没问题再关旧窗口。

---

## 7. 两个文件是干什么的 / 日常运维

| 文件 | 作用 | 你要不要手动碰它 |
|---|---|---|
| [`deploy.sh`](deploy.sh) | **一键部署器**：装环境→构建→启动→配 nginx 全自动 | 只在服务器跑 `bash deploy.sh`；**每次更新代码后重跑一遍**（幂等，重复执行安全） |
| [`server/ecosystem.config.cjs`](server/ecosystem.config.cjs) | **PM2 进程配置**：定义后端启动方式、自动读 `server/.env`、内存超限自动重启 | 一般不用碰；改了 `server/.env` 后执行 `pm2 startOrRestart ecosystem.config.cjs` 生效 |

### 常用命令（服务器上执行）
```bash
pm2 status                                  # 后端进程活着吗（online=正常）
pm2 logs novelcraft-server                  # 看后端日志（Ctrl+C 退出）
pm2 restart novelcraft-server               # 手动重启后端
pm2 startOrRestart ecosystem.config.cjs     # 改完 server/.env 后让配置生效
nginx -t                                    # 检查 nginx 配置
systemctl reload nginx                      # 重载 nginx 配置
```

### 更新代码（以后改功能要上线）
```bash
cd /root/ai-story
git pull origin develop   # 拉到 develop 分支最新代码（方案 B 则重新上传覆盖）
bash deploy.sh            # 重新构建 + 重启，全程自动
```
> 记住服务器始终在 `develop` 分支，所以更新代码用 `git pull origin develop`，不要用不带分支的 `git pull`（它默认拉 main 分支，会把部署文件拉丢）。

---

## 8. 常见问题排查（按这个顺序查）

| 症状 | 排查步骤 |
|---|---|
| **浏览器打不开网页** | ① 控制台「安全组/防火墙」有没有放行 **80**（1.5）→ ② `pm2 status` 是否 online → ③ `nginx -t` 有无报错 |
| 页面能开但功能报错 | `pm2 logs novelcraft-server` 看日志，重点看 `DATABASE_URL` / `API Key` 报错 |
| 后端 502 Bad Gateway | 后端挂了：`pm2 restart novelcraft-server` 再 `pm2 logs` 看原因 |
| 连不上数据库 | 检查连接串：密码有无特殊字符、`/novelcraft` 库名加没加、Atlas Network Access 是否开了 `0.0.0.0/0` |
| 服务器卡死/内存满 | `free -h` 看内存；构建依赖脚本自动建的 2G swap，构建时别开太多程序 |
| SSH 连不上 | ① 安全组 22 是否放行 → ② 是否关密码前密钥没验证好（用 Workbench 兜底进） |
| 提示 `command not found`（如 git/unzip/pm2） | 新系统没装该软件：git/unzip 用 `dnf install -y`；**pm2 特殊**：它装好了但不在 PATH（tarball 版 Node 的坑），修复见下行 |
| 部署第 9 步报 `pm2: command not found` | Node 是 tarball 安装的，全局目录不在 PATH，但 pm2 其实已装好 → 补软链：`ln -sf "$(npm prefix -g)/bin/pm2" /usr/local/bin/pm2`，然后重跑 `bash deploy.sh`（新版本脚本会自动处理） |
| 首页 500，nginx 日志报 `Permission denied`（stat() .../frontend/dist/index.html failed 13） | nginx 用户读不了 `/root` 下的文件（`/root` 权限 700）→ 立即修：`chmod o+x /root && chmod -R o+rX /root/ai-story/frontend/dist`；**新版 deploy.sh 已改为自动部署到 `/var/www/novelcraft` 根治此问题**（重跑 `bash deploy.sh` 即可） |
| 页面能开，但报 CORS 错误 / 请求发到 `your-app.onrender.com` | 前端构建时用了 `.env.production` 里旧的 Render 占位地址 → 立即修：`cd /root/ai-story && VITE_API_BASE_URL=/api npm run build -w frontend && cp -r frontend/dist/. /var/www/novelcraft/`，浏览器 Ctrl+F5 刷新；新版仓库已把该占位地址清空（默认同源 `/api`） |
| 克隆后找不到 `deploy.sh` / `package.json` | 分支不对：`git clone` 默认下载 `main` 分支（旧代码），部署文件在 `develop` 上 → **删掉重新 `git clone -b develop`**（见 §4 第 4 步），不要用 clone+checkout 的方式容易切不干净 |
| 运行 `bash deploy.sh` 第 5 步报"找不到 package.json"/提示设置 GIT_REPO | 代码目录不完整（多半是 main/develop 分支混乱）→ `cd /root && rm -rf ai-story && git clone -b develop ...` 重新克隆 |
| 忘记 PM2 命令 | 记三个：`pm2 status` / `pm2 logs` / `pm2 restart` |

---

## 9. 进阶（可选）

### 9.1 域名 + HTTPS
1. 买域名（阿里云万网）→ 云解析 DNS 加 A 记录：`@` → 服务器公网 IP
2. `DOMAIN=你的域名 bash deploy.sh`（自动写入 server_name）
3. 免费证书：
   ```bash
   dnf install -y certbot python3-certbot-nginx
   certbot --nginx -d 你的域名
   ```

### 9.2 fail2ban（不锁自己 IP 的保险）
自动封禁"反复登录失败"的 IP，**只封攻击者、从不封你**（正常登录不会失败，换 IP 无感）：
```bash
dnf install -y fail2ban
systemctl enable --now fail2ban
```

### 9.3 改 SSH 默认端口（可选，减少扫描噪音）
```bash
sed -i 's/^#\?Port 22/Port 2222/' /etc/ssh/sshd_config
sshd -t && systemctl restart sshd
```
安全组对应放行 2222；以后登录 `ssh -p 2222 root@你的IP`。想换回 22 改回来重启即可。

---

## 10. 部署架构速记

```
用户浏览器 ──► 阿里云服务器 (nginx :80)
                  ├─ 静态页面 ← /var/www/novelcraft（deploy.sh 从 frontend/dist 复制过来）
                  └─ /api ──► 127.0.0.1:3000（PM2 守护的 NestJS 后端）
数据库：MongoDB Atlas 云上，服务器通过连接串访问，本地不存数据
```

- 前端默认请求同源 `/api`，nginx 一把反代即可，**不需要**改任何前端代码。
- `server/.env`（含密钥）已被 `.gitignore` 忽略，**不会**被提交到 GitHub，只在服务器上存在。
- 安全模型一句话：**密钥登录 + 关密码 + 不锁 IP**，适合经常换电脑/换地址的你；开发、测试、生产同一套标准。
