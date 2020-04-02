'use strict';

const appConf = require("./configuration")

const electron = require('electron')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu
if (process.mas) app.setName('飞书Feishu')

// 是否处于焦点，检点监听
var onFocus = false;
app.on('browser-window-blur', function () {
    onFocus = false;
})
app.on('browser-window-focus', function () {
    onFocus = true;
})
app.allowRendererProcessReuse = true

// 托盘对象
const appTray = require("./windows/app_tray");

// 菜单 Template 
const appMenu = require("./windows/app_menu")


var mainWindow
var webContents

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 770,
        webPreferences: {
            // nodeIntegration: true
        },
        icon: appConf.icon128
    })

    // mainWindow.loadFile('index.html')
    // 改为使用loadURL加载飞书地址
    mainWindow.loadURL('https://feishu.cn/messenger/', {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36'
        // userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.158 Electron/8.2.0 Safari/537.36"
    })
    webContents = mainWindow.webContents
    mainWindow.on('closed', function () {
        mainWindow = null
    })

    mainWindow.on('close', (event) => {
        mainWindow.hide();
        mainWindow.setSkipTaskbar(true);
        event.preventDefault();
    });

    // 窗口加载完成后运行
    // 关于图标的闪烁，方法是每1.5s做一个轮询，查看是否有未读消息提醒，如果有的话就闪烁
    // 侧边栏 class 为 larkc-badge-count circle navbarMenu-badge larkc-badge-normal
    webContents.on("did-finish-load", function() {
        setInterval(() => {
            if(mainWindow != null && !mainWindow.isVisible){
                return
            }
            webContents.executeJavaScript(`document.getElementsByClassName('navbarMenu-badge').length`)
                .then(function(result){
                    if(parseInt(result) > 0) {
                        startBlingIcon();
                    } else {
                        stopBlingIcon();
                    }
                })

        }, 1500);
    })

    // 设置新窗口的 user agent
    webContents.on("new-window", function(event, url, frameName, disposition, options, features, referer){
        // feishu.cn/calendar/ 日历
        // feishu.cn/space/home/ 文档

        // hack 所有新页面的打开
        // 将所有打开的新页面的 user agent 也重新设置，避免提示浏览器错误
        event.preventDefault()
        const win = new BrowserWindow({
            width: 1200,
            height: 600,
          webContents: options.webContents,
          show: false
        })
        win.once('ready-to-show', () => win.show())
        if (!options.webContents) {
          win.loadURL(url,{
            userAgent : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36"
          })
        }
        event.newGuest = win    
    })

    // 打开开发者模式
    // mainWindow.toggleDevTools()
}

var blingCount = 0;
var blingTimer = null;
function startBlingIcon() {
    // 部分修复ubuntu18.04 下面锁屏之后 dock 图标一直不显示的问题
    // 每次 start bling 之前重新设置一遍
    // 保证哪怕因为锁屏而 dock 图标消失之后，收到新消息也可以闪烁
    appTray.appTray.destroy()
    appTray.init(electron, app, mainWindow)

    // 如果是焦点的话，就不闪烁
    if (onFocus && mainWindow.isVisible()) {
        stopBlingIcon()
        return
    }
    if (blingTimer != null) {
        return
    }
    blingTimer = setInterval(function () {
        blingCount++;
        if (blingCount % 2 == 0) {
            appTray.setImage(appConf.dock32Empty)
        } else {
            appTray.setImage(appConf.dock32)
        }
    }, 500);
}

function stopBlingIcon() {
    if (blingTimer != null) {
        clearInterval(blingTimer)
        blingTimer = null;
    }
    appTray.setImage(appConf.dock32)
}


// 修复 Application Menu上图标不显示
if (process.env.XDG_CURRENT_DESKTOP == 'ubuntu:GNOME') {
    process.env.XDG_CURRENT_DESKTOP = 'Unity';
}


// ------------------------ App ------------------------------------
app.on('ready', function () {
    
    // 系统菜单
    appMenu.init(electron)
    const menu = Menu.buildFromTemplate(appMenu.menuTemp)
    // 设置菜单部分
    Menu.setApplicationMenu(menu) 
    
    //系统托盘
    //系统托盘右键菜单
    // 托盘图标
    appTray.setOnClick(function () {
        stopBlingIcon();
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        mainWindow.isVisible() ? mainWindow.setSkipTaskbar(false) : mainWindow.setSkipTaskbar(true);
    })
    appTray.setOnClose(function(){
        app.quit();
        mainWindow.destroy()
    })
    // 先设置 cb 然后再 init 
    appTray.init(electron, app, mainWindow)

    createWindow();
})

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (win == null) {
        createWindow();
    }
})