'use strict';

const appConf = require("./configuration")

const electron = require('electron')
const shell = electron.shell;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
if (process.mas) app.setName('飞书Feishu');

// 是否处于焦点，检点监听
var onFocus = false;
app.on('browser-window-blur', function () {
    onFocus = false;
})
app.on('browser-window-focus', function () {
    onFocus = true;
})
app.allowRendererProcessReuse = true


// 菜单 Template 
const appMenu = require("./windows/app_menu")

const globalShortcut = electron.globalShortcut;

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
            // 注入 消息监听
            webContents.executeJavaScript(`document.getElementsByClassName('larkc-badge-count circle larkc-badge-normal').length`)
                .then(function(result){
                    if(parseInt(result) > 0) {
                        startBlingIcon();
                    } else {
                        stopBlingIcon();
                    }
                })
            // 注入水印去除
            webContents.executeJavaScript(`if(document.getElementsByClassName('lark-water-mark-main').length > 0) document.getElementsByClassName('lark-water-mark-main')[0].remove()`)
        }, 1500);
    })

    // 设置新窗口的 user agent
    webContents.on("new-window", function(event, url, frameName, disposition, options, features, referer){
        // feishu.cn/calendar/ 日历
        // feishu.cn/space/home/ 文档
        // console.log("打开 url " + url)
        event.preventDefault()

        // hack 所有新页面的打开
        // 如果是跳转外部连接的话， 用默认浏览器打开
        if(url.indexOf("https://security.feishu.cn/link/safety?target=") == 0){
            url = url.replace("https://security.feishu.cn/link/safety?target=", "")
            url = decodeURIComponent(url);
            shell.openExternal(url)
            return;
        } else {
            // 如果不是跳转到外部的链接
            // 将所有打开的新页面的 user agent 也重新设置，避免提示浏览器错误
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
            event.newGuest = win;
        }

    })

    // 打开开发者模式
    // mainWindow.toggleDevTools()
}


// ------------------------ Tray ------------------------------------
let blingCount = 0;
let blingTimer = null;
let appTryaInstance;

const trayMenuTemplate = [
    {
        label: '退出',
        click: function(){
            console.log("从 tray 退出")
            app.quit();
            mainWindow.destroy()
        }
    }
];
const contextMenu = electron.Menu.buildFromTemplate(trayMenuTemplate)
const dock32Icon = electron.nativeImage.createFromPath(appConf.dock32)
const dock32EmptyIcon = electron.nativeImage.createFromPath(appConf.dock32Empty)

function appTrayInit(){
    appTryaInstance = new electron.Tray(dock32Icon)
    appTryaInstance.setToolTip('Feishu1111');
    appTryaInstance.setContextMenu(contextMenu);
    appTryaInstance.on('click',function () {
        stopBlingIcon();
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        mainWindow.isVisible() ? mainWindow.setSkipTaskbar(false) : mainWindow.setSkipTaskbar(true);
    })

}

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
            appTryaInstance.setImage(dock32EmptyIcon)
        } else {
            appTryaInstance.setImage(dock32Icon)
        }
    }, 500);
}

function stopBlingIcon() {
    if (blingTimer != null) {
        clearInterval(blingTimer)
        blingTimer = null;
    }
    appTryaInstance.setImage(appConf.dock32)
}


// 修复 Application Menu上图标不显示
if (process.env.XDG_CURRENT_DESKTOP == 'ubuntu:GNOME') {
    process.env.XDG_CURRENT_DESKTOP = 'Unity';
}

// 通过监听屏幕 LOCK 和 UNLOCK 来重新 init tray
// 解决锁屏后 tray 消失的问题
let os = require("os");
const spawn  = require('child_process')
let monit = null;
if(os.platform() === 'linux'){
    // console.log('设置屏幕监听')
    monit = spawn.exec(`dbus-monitor --session "type='signal',interface='org.gnome.ScreenSaver'" |
    while read x; do
      case "$x" in 
        *"boolean true"*) echo SCREEN_LOCKED;;
        *"boolean false"*) echo SCREEN_UNLOCKED;;  
      esac
    done `)

    monit.stdout.on('data', (data) => {
        // console.log('监听到屏幕重启')
        const out = data.toString().trim()
        if (out === 'SCREEN_UNLOCKED') {
            appTryaInstance.destroy()
            appTrayInit()
        }
    })

    monit.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    monit.on('exit', function (code) {
        console.log('child process exited with code ' + code);
    });    
}


// ------------------------ App ------------------------------------
app.on('ready', function () {
    
    // 系统菜单
    appMenu.init(electron)
    const menu = Menu.buildFromTemplate(appMenu.menuTemp)
    // 设置菜单部分
    Menu.setApplicationMenu(menu) 
    
    //系统托盘 init
    appTrayInit()

    globalShortcut.register('alt+shift+m', () => {
        // console.log('alt+shift+m is pressed')
        appTryaInstance.destroy()
        appTrayInit()
        mainWindow.show()
        mainWindow.setSkipTaskbar(true);
    })
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