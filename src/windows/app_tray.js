'use strict';
const path = require('path')
const trayConf = require('../configuration')



let blingCount = 0;
let blingTimer = null;

class AppTray{
    constructor() {
        this.closeFun = function () {}
    }
}

// 设置图片
AppTray.prototype.setImage = function (image) {
    if(this.appTray != undefined) {
        this.appTray.setImage(image)
    }
}

// 设置点击的监听
AppTray.prototype.setOnClick = function (callback) {
    this.appTray.on('click',callback)
}

// 设置点击的监听
AppTray.prototype.setOnClose= function (callback) {
    this.closeFun = callback;
}

AppTray.prototype.init = function (electronObj, app, win) {
    let that = this;
    let trayMenuTemplate = [
        {
            label: '退出',
            click: function () {
                that.closeFun();
            }
        }
    ];

    // 托盘图标
    //系统托盘图标目录
    this.appTray = new electronObj.Tray(trayConf.dock32);
    //图标的上下文菜单
    const contextMenu = electronObj.Menu.buildFromTemplate(trayMenuTemplate);
    //设置此托盘图标的悬停提示内容
    this.appTray.setToolTip('Feishu');
    //设置此图标的上下文菜单
    this.appTray.setContextMenu(contextMenu);
}

module.exports = new AppTray()