# Feishu-Electron

electron 版的飞书，对网页版本进行封装

相比起网页版，功能如下

- 独立的运行窗口
- 可隐藏到 dock 栏
- 新消息提醒，小图标闪烁
- 解除浏览器限制

![screen-shot](screenshot/electron-lark-1.png)

## 安装方法

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