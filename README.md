# Electron-Lark

electron 版的飞书 Feishu (原 Lark)，对网页版本进行封装

相比起普通网页版，功能如下

- 独立的运行窗口，不容易误关闭
- 关闭程序时后台运行，隐藏到通知栏小图标，双击可重新打开界面
- 新消息提醒，状态栏小图标闪烁
- 解除浏览器限制，避免因浏览器版本不对而提示无法使用

已知问题
 - ubuntu18.04 Gnome 桌面，锁屏之后，系统通知栏图标 Tray 会消失, 当前规避方案如下
    - ~~当有新消息提醒的时候，会重置通知栏图标 tray，保证哪怕因为锁屏导致 tray 消失，在收到新消息之后也会重新出现并闪烁~~
    - 使用 alt + shift + m 的快捷键，重新显示界面以及 dock 图标

 ***下载地址: [Release](https://github.com/Ericwyn/electron-lark/releases)***

(另外有一说一, 飞书的技术架构就是基于 Electron 的, Windows 和 Mac 客户端也都是使用 Electron 打包, 既然如此为什么不顺便为 Linux 也提供支持呢 ?)


## 运行截图

![screen-shot](screenshot/electron-lark-1.png)

## 版本记录

### v1.0.0
 - 初始版本

### v1.0.1
 - 去除页面水印
 - 修改了应用菜单,去除无用按钮

## 安装方法 (二进制安装)
 - 请从 [Release](https://github.com/Ericwyn/electron-lark/releases) 页面直接下载及安装 （ubuntu 18.04 上测试通过）

## 安装方法 (从源码安装)

### 0. 安装 NodeJs
请先按照官网教程安装 NodeJs，确保以下命令可以成功运行

    node -v
    npm -v


### 1. 安装 Electron

参考 https://qii404.me/2019/07/10/electron.html

```
# 墙内的话安装过程中会下载失败，需要首先设置electron的源为淘宝源即可
npm config set ELECTRON_MIRROR http://npm.taobao.org/mirrors/electron/

# 全局安装 需要的话追加上 --registry='http://registry.npm.taobao.org' 使用淘宝npm源安装
sudo npm install electron -g --allow-root -unsafe-perm=true
# Windows使用下面语句 64位32位机器都是--win32
npm install electron -g --platform=win32

# 验证安装
electron -v
```



### 2.运行

工程目录下使用下面命令运行

```
electron .
```
