# Feishu-Electron

electron 版的飞书，对网页版本进行封装

相比起普通网页版，功能如下

- 独立的运行窗口，不容易误关闭
- 关闭程序时后台运行，隐藏到 dock 栏小图标，双击可重新打开界面
- 新消息提醒，状态栏小图标闪烁
- 解除浏览器限制，避免因浏览器版本不对而提示无法使用

已知问题
 - ubuntu18.04 Gnome 桌面，锁屏之后，系统状态栏图标 Tray 会消失
    - 当前规避方案：当有新消息提醒的时候，会重置状态栏图标 tray，保证哪怕因为锁屏导致 tray 消失，在收到新消息之后也会重新出现并闪烁


## 运行截图

![screen-shot](screenshot/electron-lark-1.png)

## 安装方法

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