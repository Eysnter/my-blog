---
title: ③ Linux 零基础入门教程
published: 2026-09-21
image: ""
tags: [Linux, 知识点]
category: "JavaSE"
draft: false
description: Linux基础指令的使用
lang: zh-CN
comment: true
---

# 🐧 Linux 零基础入门教程

> 从 VMware 虚拟机安装开始，系统学习 Linux 常用命令、软件管理、Vim、权限、网络、进程与 SSH。
>
> 适合人群：第一次接触 Linux 的初学者。

---

## 目录

- [1. Linux 简介](#1-linux-简介)
- [2. 下载 Linux](#2-下载-linux)
- [3. 下载与安装 VMware](#3-下载与安装-vmware)
- [4. 创建 Linux 虚拟机](#4-创建-linux-虚拟机)
- [5. Linux 目录结构](#5-linux-目录结构)
- [6. Linux 终端与命令基础](#6-linux-终端与命令基础)
- [7. 目录操作命令](#7-目录操作命令)
- [8. 文件操作命令](#8-文件操作命令)
- [9. 文件查看与搜索](#9-文件查看与搜索)
- [10. 用户、用户组与 sudo](#10-用户用户组与-sudo)
- [11. Linux 文件权限](#11-linux-文件权限)
- [12. Linux 软件安装](#12-linux-软件安装)
- [13. Vim 安装与使用](#13-vim-安装与使用)
- [14. 进程管理](#14-进程管理)
- [15. 网络常用命令](#15-网络常用命令)
- [16. 压缩与解压](#16-压缩与解压)
- [17. 环境变量](#17-环境变量)
- [18. SSH 远程连接](#18-ssh-远程连接)
- [19. 常用命令速查表](#19-常用命令速查表)
- [20. 新手练习题](#20-新手练习题)

---

# 1. Linux 简介

## 1.1 什么是 Linux？

Linux 是一种开源操作系统。服务器、云计算、Docker、数据库以及很多开发环境都大量使用 Linux。

常见操作系统包括：

- Windows
- macOS
- Linux

Linux 与 Windows 最大的学习差异之一，是 Linux 中经常使用**终端命令**完成操作。

例如查看当前目录：

```bash
pwd
```

查看当前目录中的文件：

```bash
ls
```

## 1.2 常见 Linux 发行版

Linux 有很多发行版，常见的有：

| 发行版 | 特点 | 适合 |
|---|---|---|
| Ubuntu | 社区资料丰富，容易入门 | Linux 新手、开发 |
| Debian | 稳定 | 服务器 |
| Rocky Linux | 企业服务器风格 | 学习服务器运维 |
| CentOS Stream | RHEL 上游开发版本 | Linux/RHEL 生态学习 |
| Fedora | 软件较新 | 开发者 |
| Arch Linux | 自定义程度高 | 有经验的用户 |

如果第一次学习 Linux，可以选择 **Ubuntu LTS**。

---

# 2. 下载 Linux

安装 Linux 虚拟机首先需要下载 Linux 的 ISO 镜像。

## 2.1 什么是 ISO？

可以简单理解为：

```text
ISO 镜像
   ↓
Linux 系统安装盘
   ↓
交给 VMware
   ↓
安装 Linux
```

## 2.2 下载 Ubuntu

访问 Ubuntu 官方网站：

```text
https://ubuntu.com/download
```

建议选择当前受支持的 **Ubuntu LTS** 版本。

下载后通常会得到：

```text
ubuntu-xx.xx.x-desktop-amd64.iso
```

> 提示：ISO 文件不用解压，创建虚拟机时直接选择它。

## 2.3 Rocky Linux

如果你的学习方向更偏服务器，也可以使用 Rocky Linux：

```text
https://rockylinux.org/download
```

---

# 3. 下载与安装 VMware

## 3.1 VMware 是什么？

VMware 可以在真实电脑中创建虚拟电脑。

例如：

```text
你的 Windows 电脑
        │
        ▼
     VMware
        │
        ▼
┌─────────────────┐
│ Ubuntu Linux    │
│ 虚拟电脑         │
└─────────────────┘
```

这样学习 Linux 时，即使把虚拟机系统弄坏，也通常不会影响 Windows 主系统。

## 3.2 下载 VMware

VMware Workstation 的下载入口和许可方式可能会随厂商政策变化。

建议搜索并进入 VMware/Broadcom 官方下载页面，下载当前适用于 Windows 的 VMware Workstation 版本。

> 建议只从官方渠道下载安装程序。

## 3.3 安装 VMware

安装过程通常可以按以下思路进行：

1. 打开 VMware 安装程序。
2. 阅读并接受许可协议。
3. 选择安装位置。
4. 根据需要选择快捷方式等选项。
5. 点击安装。
6. 安装完成后启动 VMware Workstation。

---

# 4. 创建 Linux 虚拟机

## 4.1 新建虚拟机

打开 VMware 后选择：

```text
Create a New Virtual Machine
```

选择典型安装：

```text
Typical
```

## 4.2 选择 ISO

选择刚才下载的 Linux ISO，例如：

```text
ubuntu-xx.xx.x-desktop-amd64.iso
```

## 4.3 设置虚拟机资源

学习用途可以根据电脑性能分配资源。

例如：

```text
CPU：2 核或更多
内存：4 GB 或更多
硬盘：30～50 GB
网络：NAT
```

> 不要把宿主机的大部分 CPU 和内存都分配给虚拟机，否则 Windows 本身可能变卡。

## 4.4 安装 Linux

启动虚拟机后，根据安装向导：

1. 选择语言。
2. 选择键盘布局。
3. 选择安装方式。
4. 创建用户名。
5. 设置密码。
6. 等待安装完成。
7. 重启虚拟机。

安装完成后，就可以进入 Linux 桌面或终端。

---

# 5. Linux 目录结构

Linux 没有 Windows 那样的：

```text
C:
D:
E:
```

Linux 使用 `/` 作为根目录。

```text
/
├── bin
├── boot
├── dev
├── etc
├── home
├── root
├── tmp
├── usr
└── var
```

常见目录：

| 目录 | 作用 |
|---|---|
| `/` | 根目录 |
| `/home` | 普通用户的家目录 |
| `/root` | root 用户家目录 |
| `/etc` | 系统配置文件 |
| `/var` | 日志等经常变化的数据 |
| `/tmp` | 临时文件 |
| `/usr` | 大量应用程序和共享资源 |
| `/bin` | 基础命令相关目录 |
| `/boot` | 系统启动相关文件 |

例如用户 `kai` 的家目录通常是：

```text
/home/kai
```

---

# 6. Linux 终端与命令基础

Linux 命令通常遵循：

```text
命令 [选项] [参数]
```

例如：

```bash
ls -l /home
```

其中：

```text
ls       命令
-l       选项
/home    参数
```

## 6.1 清空终端

```bash
clear
```

也可以使用：

```text
Ctrl + L
```

## 6.2 查看命令帮助

```bash
ls --help
```

或者：

```bash
man ls
```

退出 `man`：

```text
q
```

> Linux 命令和文件名通常区分大小写。

---

# 7. 目录操作命令

## 7.1 pwd

查看当前所在目录：

```bash
pwd
```

可能输出：

```text
/home/kai
```

## 7.2 ls

查看当前目录：

```bash
ls
```

详细显示：

```bash
ls -l
```

显示隐藏文件：

```bash
ls -a
```

常用组合：

```bash
ls -lah
```

## 7.3 cd

进入目录：

```bash
cd /home
```

进入自己的家目录：

```bash
cd ~
```

返回上一级：

```bash
cd ..
```

返回上一次所在目录：

```bash
cd -
```

## 7.4 mkdir

创建目录：

```bash
mkdir test
```

一次创建多级目录：

```bash
mkdir -p java/springboot/demo
```

## 7.5 rmdir

删除**空目录**：

```bash
rmdir test
```

---

# 8. 文件操作命令

## 8.1 touch

创建空文件：

```bash
touch hello.txt
```

一次创建多个：

```bash
touch a.txt b.txt c.txt
```

## 8.2 cp

复制文件：

```bash
cp hello.txt hello-copy.txt
```

复制目录：

```bash
cp -r project project-backup
```

## 8.3 mv

移动文件：

```bash
mv hello.txt /tmp/
```

也可以用来重命名：

```bash
mv old.txt new.txt
```

## 8.4 rm

删除文件：

```bash
rm hello.txt
```

删除目录：

```bash
rm -r test
```

强制递归删除：

```bash
rm -rf test
```

> ⚠️ `rm -rf` 非常危险。Linux 命令行删除通常没有类似 Windows 回收站的保护。执行前务必确认路径。

不要随意执行来源不明的删除命令。

## 8.5 find

查找文件：

```bash
find /home -name "hello.txt"
```

在当前目录查找 `.java`：

```bash
find . -name "*.java"
```

---

# 9. 文件查看与搜索

## 9.1 cat

查看较短的文本文件：

```bash
cat hello.txt
```

## 9.2 less

查看较长文件：

```bash
less linux.log
```

退出：

```text
q
```

## 9.3 head

查看文件前 10 行：

```bash
head file.txt
```

查看前 20 行：

```bash
head -n 20 file.txt
```

## 9.4 tail

查看最后 10 行：

```bash
tail file.txt
```

持续查看日志新增内容：

```bash
tail -f app.log
```

停止：

```text
Ctrl + C
```

## 9.5 grep

在文件中搜索文本：

```bash
grep "error" app.log
```

忽略大小写：

```bash
grep -i "error" app.log
```

显示行号：

```bash
grep -n "error" app.log
```

递归搜索当前目录：

```bash
grep -r "SpringBoot" .
```

---

# 10. 用户、用户组与 sudo

## 10.1 查看当前用户

```bash
whoami
```

## 10.2 查看用户信息

```bash
id
```

## 10.3 root 用户

`root` 是 Linux 中权限非常高的管理员账户。

很多系统管理操作需要管理员权限。

例如：

```bash
sudo apt update
```

这里的：

```text
sudo
```

表示以提升后的权限执行后面的命令。

> 不要因为方便而长期使用 root，也不要对不理解的命令随意添加 `sudo`。

## 10.4 创建用户

不同发行版工具略有差异。Ubuntu 中可以使用：

```bash
sudo adduser testuser
```

查看系统用户相关信息：

```bash
cat /etc/passwd
```

---

# 11. Linux 文件权限

执行：

```bash
ls -l
```

可能看到：

```text
-rw-r--r-- 1 kai kai 120 Sep 21 18:00 hello.txt
```

其中：

```text
-rw-r--r--
```

代表文件权限。

可以拆成：

```text
- | rw- | r-- | r--
    │     │     │
    │     │     └── 其他用户
    │     └──────── 所属组
    └────────────── 所有者
```

权限：

```text
r = read    读取
w = write   写入
x = execute 执行
```

数字表示：

```text
r = 4
w = 2
x = 1
```

因此：

```text
7 = rwx
6 = rw-
5 = r-x
4 = r--
```

例如：

```bash
chmod 755 script. sh
```

代表：

```text
所有者：rwx
所属组：r-x
其他人：r-x
```

给脚本增加执行权限：

```bash
chmod +x script. sh
```

修改文件所有者：

```bash
sudo chown kai hello. txt
```

同时修改用户和组：

```bash
sudo chown kai: kai hello. txt
```

---

# 12. Linux 软件安装

不同 Linux 发行版的软件包管理器不同。

## 12.1 Ubuntu / Debian：apt

更新软件包索引：

```bash
sudo apt update
```

升级已安装软件：

```bash
sudo apt upgrade
```

安装软件：

```bash
sudo apt install vim
```

卸载：

```bash
sudo apt remove vim
```

搜索：

```bash
apt search vim
```

## 12.2 Rocky Linux / CentOS Stream：dnf

更新：

```bash
sudo dnf update
```

安装：

```bash
sudo dnf install vim
```

卸载：

```bash
sudo dnf remove vim
```

搜索：

```bash
dnf search vim
```

---

# 13. Vim 安装与使用

Vim 是 Linux 中非常经典的终端文本编辑器。

## 13.1 安装 Vim

Ubuntu / Debian：

```bash
sudo apt update
sudo apt install vim
```

Rocky Linux / CentOS Stream：

```bash
sudo dnf install vim
```

查看版本：

```bash
vim --version
```

## 13.2 打开文件

```bash
vim hello. txt
```

如果文件不存在，保存后会创建该文件。

## 13.3 Vim 的核心模式

初学 Vim 最重要的是理解模式：

```text
              Vim
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    普通模式插入模式命令行模式
       │       │        │
    移动/删除输入文字保存/退出
       │       │        │
       └── Esc ┴────────┘
```

### 普通模式

刚进入 Vim 时默认处于普通模式。

可以移动光标、复制、删除等。

### 插入模式

普通模式按：

```text
i
```

进入插入模式。

然后就可以输入文字。

常见按键：

| 按键 | 作用 |
|---|---|
| `i` | 在光标前插入 |
| `a` | 在光标后插入 |
| `o` | 在下一行新建一行 |
| `O` | 在上一行新建一行 |

按：

```text
Esc
```

回到普通模式。

### 命令行模式

普通模式输入：

```text
:
```

进入命令行模式。

保存：

```text
:w
```

退出：

```text
:q
```

保存并退出：

```text
:wq
```

不保存强制退出：

```text
:q!
```

## 13.4 Vim 删除

删除一个字符：

```text
x
```

删除当前行：

```text
dd
```

删除 5 行：

```text
5 dd
```

## 13.5 Vim 复制与粘贴

复制当前行：

```text
yy
```

复制 5 行：

```text
5 yy
```

粘贴：

```text
p
```

## 13.6 Vim 撤销

撤销：

```text
u
```

重做：

```text
Ctrl + r
```

## 13.7 Vim 搜索

普通模式输入：

```text
/hello
```

按 Enter 搜索。

跳到下一个结果：

```text
n
```

跳到上一个结果：

```text
N
```

## 13.8 Vim 跳转

跳到第一行：

```text
gg
```

跳到最后一行：

```text
G
```

跳到第 20 行：

```text
20 G
```

显示行号：

```text
: set number
```

取消行号：

```text
: set nonumber
```

## 13.9 Vim 新手最小记忆表

第一次学习只需要先记：

| 操作 | 命令 |
|---|---|
| 打开文件 | `vim 文件名` |
| 开始输入 | `i` |
| 回普通模式 | `Esc` |
| 保存 | `:w` |
| 退出 | `:q` |
| 保存退出 | `:wq` |
| 强制退出 | `:q!` |
| 删除一行 | `dd` |
| 复制一行 | `yy` |
| 粘贴 | `p` |
| 撤销 | `u` |
| 搜索 | `/内容` |

---

# 14. 进程管理

## 14.1 ps

查看当前终端相关进程：

```bash
ps
```

常见：

```bash
ps aux
```

配合 grep：

```bash
ps aux | grep java
```

这里的：

```text
|
```

叫做**管道符**，会把前一个命令的输出交给后一个命令处理。

## 14.2 top

实时查看系统进程：

```bash
top
```

退出：

```text
q
```

## 14.3 kill

假设进程 PID：

```text
12345
```

发送默认终止信号：

```bash
kill 12345
```

必要时可以：

```bash
kill -9 12345
```

> `kill -9` 会强制结束进程，通常应该先尝试普通 `kill`，让程序有机会正常清理资源。

---

# 15. 网络常用命令

## 15.1 查看 IP

现代 Linux 常用：

```bash
ip addr
```

简写：

```bash
ip a
```

## 15.2 ping

测试网络连通：

```bash
ping example. com
```

停止：

```text
Ctrl + C
```

发送 4 次：

```bash
ping -c 4 example. com
```

## 15.3 curl

访问网页或接口：

```bash
curl https://example.com
```

查看响应头：

```bash
curl -I https://example.com
```

## 15.4 wget

下载文件：

```bash
wget https://example.com/file.zip
```

如果没有安装：

Ubuntu：

```bash
sudo apt install wget
```

Rocky Linux：

```bash
sudo dnf install wget
```

---

# 16. 压缩与解压

## 16.1 tar. gz

压缩目录：

```bash
tar -czvf project. tar. gz project/
```

参数可简单理解为：

```text
-c 创建归档
-z 使用 gzip
-v 显示过程
-f 指定文件
```

解压：

```bash
tar -xzvf project. tar. gz
```

解压到指定目录：

```bash
tar -xzvf project. tar. gz -C /tmp
```

## 16.2 zip

压缩：

```bash
zip -r project. zip project/
```

解压：

```bash
unzip project. zip
```

如果没有命令，Ubuntu 可以：

```bash
sudo apt install zip unzip
```

---

# 17. 环境变量

查看所有环境变量：

```bash
env
```

查看 PATH：

```bash
echo $PATH
```

临时创建变量：

```bash
export NAME="Linux"
```

查看：

```bash
echo $NAME
```

输出：

```text
Linux
```

临时环境变量通常只在当前 Shell 会话中有效。

常见 Shell 配置文件包括：

```text
~/. bashrc
~/. profile
```

例如修改：

```bash
vim ~/. bashrc
```

修改后可重新加载：

```bash
source ~/. bashrc
```

---

# 18. SSH 远程连接

SSH 可以让一台电脑通过网络登录另一台 Linux 机器。

基本格式：

```bash
ssh 用户名@服务器 IP
```

例如：

```bash
ssh kai@192.168.1.100
```

第一次连接可能询问：

```text
Are you sure you want to continue connecting?
```

确认服务器身份信息无误后输入：

```text
yes
```

然后根据配置输入密码或使用 SSH 密钥。

## Ubuntu 安装 SSH Server

```bash
sudo apt update
sudo apt install openssh-server
```

查看服务：

```bash
sudo systemctl status ssh
```

启动：

```bash
sudo systemctl start ssh
```

设置开机启动：

```bash
sudo systemctl enable ssh
```

---

# 19. 常用命令速查表

| 命令 | 作用 |
|---|---|
| `pwd` | 查看当前位置 |
| `ls` | 查看文件 |
| `ls -lah` | 详细查看全部文件 |
| `cd` | 切换目录 |
| `mkdir` | 创建目录 |
| `touch` | 创建空文件 |
| `cp` | 复制 |
| `mv` | 移动/重命名 |
| `rm` | 删除 |
| `cat` | 查看文件 |
| `less` | 分页查看文件 |
| `head` | 查看文件开头 |
| `tail` | 查看文件结尾 |
| `tail -f` | 实时查看日志 |
| `grep` | 搜索文本 |
| `find` | 查找文件 |
| `whoami` | 查看当前用户 |
| `chmod` | 修改权限 |
| `chown` | 修改所有者 |
| `sudo` | 提升权限执行命令 |
| `apt` | Debian/Ubuntu 软件管理 |
| `dnf` | RHEL 系发行版软件管理 |
| `vim` | 文本编辑 |
| `ps` | 查看进程 |
| `top` | 实时查看进程 |
| `kill` | 结束进程 |
| `ip a` | 查看网络地址 |
| `ping` | 测试网络 |
| `curl` | 请求 URL |
| `wget` | 下载文件 |
| `tar` | 打包/压缩/解压 |
| `ssh` | SSH 远程连接 |
| `clear` | 清空终端 |
| `history` | 查看命令历史 |

---

# 20. 新手练习题

## 练习一：目录与文件

创建：

```text
linux-study/
├── java/
├── springboot/
└── README. txt
```

尝试只使用 Linux 命令完成。

参考命令：

```bash
mkdir linux-study
cd linux-study
mkdir java springboot
touch README. txt
ls -l
```

## 练习二：Vim

执行：

```bash
vim README. txt
```

写入：

```text
Hello Linux!
我正在学习 Linux。
```

要求：

1. 使用 `i` 进入插入模式。
2. 输入内容。
3. 使用 `Esc` 返回普通模式。
4. 使用 `:wq` 保存退出。
5. 使用 `cat README. txt` 查看结果。

## 练习三：复制与重命名

复制：

```bash
cp README. txt README-backup. txt
```

重命名：

```bash
mv README-backup. txt linux. txt
```

查看：

```bash
ls -l
```

## 练习四：搜索

创建日志：

```bash
vim app. log
```

输入几行：

```text
INFO Application started
INFO User login
ERROR Database connection failed
INFO Application stopped
```

搜索 ERROR：

```bash
grep "ERROR" app. log
```
