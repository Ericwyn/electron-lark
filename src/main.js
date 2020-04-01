'use strict';

const appConf = require("./configuration")

const electron = require('electron')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu
if (process.mas) app.setName('飞书Feishu')

// 是否处于焦点
let onFocus = false;
app.on('browser-window-blur', function () {
    onFocus = false;
})
app.on('browser-window-focus', function () {
    onFocus = true;
})
app.allowRendererProcessReuse = true


ipcMain.on('ping', () => {
    ipcMain.sendToHost('pong')
})

// 托盘对象
let appTray = require("./windows/app_tray");

let mainWindow
let webContents

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

// -------- 图标闪烁 --------------
let blingCount = 0;
let blingTimer = null;
function startBlingIcon() {
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
// 关于图标闪烁的启动，查看 webContents.on("did-finish-load",callback) 回调
//------------------------------------


//------------------------------ 设置菜单 --------------------------
/**
 * 注册键盘快捷键
 * 其中：label: '切换开发者工具',这个可以在发布时注释掉
 */
let template = [
    {
        label: '操作',
        submenu: [{
            label: '复制',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
        }, {
            label: '粘贴',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
        }, {
            label: '重新加载',
            accelerator: 'CmdOrCtrl+R',
            click: function (item, focusedWindow) {
                if (focusedWindow) {
                    // on reload, start fresh and close any old
                    // open secondary windows
                    if (focusedWindow.id === 1) {
                        BrowserWindow.getAllWindows().forEach(function (win) {
                            if (win.id > 1) {
                                win.close()
                            }
                        })
                    }
                    focusedWindow.reload()
                }
            }
        }]
    },
    {
        label: '窗口',
        role: 'window',
        submenu: [{
            label: 'Minimize ( 最小化 )',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        }, {
            label: 'Close ( 关闭 )',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        }, {
            label: '切换开发者工具',
            accelerator: (function () {
                if (process.platform === 'darwin') {
                    return 'Alt+Command+I'
                } else {
                    return 'Ctrl+Shift+I'
                }
            })(),
            click: function (item, focusedWindow) {
                if (focusedWindow) {
                    focusedWindow.toggleDevTools()
                }
            }
        }, {
            type: 'separator'
        }]
    },
    {
        label: '帮助',
        role: 'help',
        submenu: [{
            label: 'Github',
            click: function () {
                electron.shell.openExternal('https://github.com/Ericwyn')
            }
        }]
    }
]

/**
* 增加更新相关的菜单选项
*/
function addUpdateMenuItems(items, position) {
    if (process.mas) return

    const version = electron.app.getVersion()
    let updateItems = [{
        label: `Version ${version}`,
        enabled: false
    }, {
        label: 'Checking for Update',
        enabled: false,
        key: 'checkingForUpdate'
    }, {
        label: 'Check for Update',
        visible: false,
        key: 'checkForUpdate',
        click: function () {
            require('electron').autoUpdater.checkForUpdates()
        }
    }, {
        label: 'Restart and Install Update',
        enabled: true,
        visible: false,
        key: 'restartToUpdate',
        click: function () {
            require('electron').autoUpdater.quitAndInstall()
        }
    }]

    items.splice.apply(items, [position, 0].concat(updateItems))
}

function findReopenMenuItem() {
    const menu = Menu.getApplicationMenu()
    if (!menu) return

    let reopenMenuItem
    menu.items.forEach(function (item) {
        if (item.submenu) {
            item.submenu.items.forEach(function (item) {
                if (item.key === 'reopenMenuItem') {
                    reopenMenuItem = item
                }
            })
        }
    })
    return reopenMenuItem
}

// 针对Mac端的一些配置
if (process.platform === 'darwin') {
    const name = electron.app.getName()
    template.unshift({
        label: name,
        submenu: [{
            label: 'Quit ( 退出 )',
            accelerator: 'Command+Q',
            click: function () {
                app.quit()
            }
        }]
    })

    // Window menu.
    template[3].submenu.push({
        type: 'separator'
    }, {
        label: 'Bring All to Front',
        role: 'front'
    })

    addUpdateMenuItems(template[0].submenu, 1)
}

// 针对Windows端的一些配置
if (process.platform === 'win32') {
    const helpMenu = template[template.length - 1].submenu
    addUpdateMenuItems(helpMenu, 0)
}

//------------------------------ 设置菜单End --------------------------


// 修复 Application Menu上图标不显示
if (process.env.XDG_CURRENT_DESKTOP == 'ubuntu:GNOME') {
    process.env.XDG_CURRENT_DESKTOP = 'Unity';
}


// ------------------------ App ------------------------------------
app.on('ready', function () {
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu) // 设置菜单部分
    
    //---------------------- 系统托盘 ------------------------------
    //系统托盘右键菜单
    appTray.init(electron, app, mainWindow)

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
    //---------------------- 系统托盘 End ------------------------------
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