'use strict';
const path = require('path')
const trayConf = require('../configuration')


class AppTray{
}

AppTray.closeFun = function () {}
AppTray.clickFun = function () {}

// 设置图片
AppTray.setImage = function (image) {
    if(this.appTray != undefined) {
        this.appTray.setImage(image)
    }
}

// 设置tray点击的监听
AppTray.setOnClick = function (callback) {
    AppTray.clickFun = callback
}

// 设置tray菜单里面，关闭选项点击的监听
AppTray.setOnClose= function (callback) {
    AppTray.closeFun = callback;
}

// 菜单
AppTray.trayMenuTemplate = [
    {
        label: '退出',
        click: function () {
            AppTray.closeFun();
        }
    }
];

AppTray.appTray = null;

// 初始化
// 先用 require 引入，之后用 init 创建，然后调用 cb 设置方法
AppTray.init = function (electronObj, app, win) {
    // 托盘图标
    //系统托盘图标目录
    this.appTray = new electronObj.Tray(trayConf.dock32);
    //图标的上下文菜单
    const contextMenu = electronObj.Menu.buildFromTemplate(this.trayMenuTemplate);
    //设置此托盘图标的悬停提示内容
    this.appTray.setToolTip('Feishu');
    //设置此图标的上下文菜单
    this.appTray.setContextMenu(contextMenu);

    // 点击的监听
    this.appTray.on('click',AppTray.clickFun)
}

module.exports = AppTray