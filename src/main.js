'use strict';

const appConf = require("./configuration")

const electron = require('electron')
const fs = require('fs')
const shell = electron.shell;
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
if (process.mas) app.setName('飞书Feishu');

// fixup High CPU Usage issue
// see https://github.com/electron/electron/issues/11908
app.disableHardwareAcceleration();

// 是否处于焦点，检点监听
var onFocus = false;
app.on('browser-window-blur', function () {
    onFocus = false;
})
app.on('browser-window-focus', function () {
    onFocus = true;
})
app.allowRendererProcessReuse = true

let newAppTray = null;
const dock32Icon = electron.nativeImage.createFromPath(appConf.dock32)
const dock32EmptyIcon = electron.nativeImage.createFromPath(appConf.dock32Empty)

// 菜单 Template 
const appMenu = require("./windows/app_menu")

const globalShortcut = electron.globalShortcut;

var mainWindow
var webContents

function createWindow(configJson) {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 770,
        webPreferences: {
            nodeIntegration: true
        },
        icon: appConf.icon128
    })

    // mainWindow.loadFile('index.html')
    // 改为使用loadURL加载飞书地址
    let loadUrl = "https://feishu.cn/messenger/";
    if (configJson.startPageLink !== undefined
        && configJson.startPageLink != null
        && configJson.startPageLink.trim() != "") {
        loadUrl = configJson.startPageLink
    }
    console.log("load main page: " + loadUrl)
    mainWindow.loadURL(loadUrl, {
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

    let showWarterMark = false;
    if(configJson.showWarterMark !== undefined
        && configJson.showWarterMark != null) {
        showWarterMark = configJson.showWarterMark;
    }

    // 窗口加载完成后运行
    // 关于图标的闪烁，方法是每1.5s做一个轮询，查看是否有未读消息提醒，如果有的话就闪烁
    // 侧边栏 class 为 larkc-badge-count circle navbarMenu-badge larkc-badge-normal
    webContents.on("did-finish-load", function() {
        setInterval(() => {
            if(mainWindow != null && !mainWindow.isVisible){
                return
            }
            webContents.executeJavaScript(`document.getElementsByClassName('larkc-badge-count circle larkc-badge-normal').length`)
                .then(function(result){
                    if(parseInt(result) > 0) {
                        startBlingIcon();
                    } else {
                        stopBlingIcon();
                    }
                })
            if(!showWarterMark) {
                webContents.executeJavaScript(`if(document.getElementsByClassName('lark-water-mark-main').length > 0) document.getElementsByClassName('lark-water-mark-main')[0].remove()`)
            }
        }, 1500);
    })

    // 定义在 electron 内部打开的 url，除此之外的 url 都跳转浏览器打开，使用 indexOf >= 0 来判断
    let electronUrl = [
    ]
    if (configJson.larkOpenLink !== undefined && configJson.larkOpenLink !== null){
        electronUrl = ("" + configJson.larkOpenLink).split("\n")
    }

    // 设置新窗口的 user agent
    webContents.on("new-window", function(event, url, frameName, disposition, options, features, referer){
        // feishu.cn/calendar/ 日历
        // feishu.cn/space/home/ 文档
        console.log("open url " + url)
        event.preventDefault()
        
        let openInElectron = false
        for(let i=0;i<electronUrl.length; i++){
            if(electronUrl[i].trim() != "" && url.indexOf(electronUrl[i]) >= 0) {
                openInElectron = true;
                console.log("open url electron")
                break;
            }
        }

        if(openInElectron) {
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
        } else {
            shell.openExternal(url)
            return;
        }
    })

    // 打开开发者模式
    // mainWindow.toggleDevTools()
}

let blingCount = 0;
let blingTimer = null;
let bling = false;
function startBlingIcon() {
    // 部分修复ubuntu18.04 下面锁屏之后 dock 图标一直不显示的问题
    // 每次 start bling 之前重新设置一遍
    // 保证哪怕因为锁屏而 dock 图标消失之后，收到新消息也可以闪烁
    // appTray.appTray.destroy()
    // appTray.init(electron, app, mainWindow)

    // 如果是焦点的话，就不闪烁
    if (onFocus && mainWindow.isVisible()) {
        stopBlingIcon()
        return
    }
    if (blingTimer != null) {
        return
    }
    bling = true;
    blingTimer = setInterval(function () {
        blingCount++;
        if (blingCount % 2 == 0) {
            newAppTray.setImage(dock32EmptyIcon)
        } else {
            newAppTray.setImage(dock32Icon)
        }
        // 避免 count 无限增大
        if(blingCount == 1000) blingCount = 0
    }, 500);
}

function stopBlingIcon() {
    if(bling) {
        if (blingTimer != null) {
            clearInterval(blingTimer)
            blingTimer = null;
        }
        newAppTray.setImage(dock32Icon)
        bling = false;
    }
}


// 修复 Application Menu上图标不显示
if (process.env.XDG_CURRENT_DESKTOP == 'ubuntu:GNOME') {
    process.env.XDG_CURRENT_DESKTOP = 'Unity';
}

const trayMenuTemplate = [
    {
        label: '显示主界面',
        click: function(){
            if(mainWindow != null && !mainWindow.isVisible()){
                mainWindow.show()
            }
        }
    },
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

function appTrayInit(){
    newAppTray = new electron.Tray(dock32Icon);
    newAppTray.setToolTip('Feishu');
    newAppTray.setContextMenu(contextMenu);
    newAppTray.on('click',function () {
        stopBlingIcon();
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        mainWindow.isVisible() ? mainWindow.setSkipTaskbar(false) : mainWindow.setSkipTaskbar(true);
    })
    newAppTray.on('double-click', function() {
        if(mainWindow != null && !mainWindow.isVisible()){
            mainWindow.show()
        }
    })
}

function getConfigJson(callback){
    fs.readFile('config.json','utf-8',function(err,data){
        if(err){
            console.error("load config error, may be have no config file~");
            callback({})
        }
        else{
            console.log("read config json:" + data);
            callback(JSON.parse(data))
        }
    });


}


let os = require("os");
const spawn  = require('child_process')
let monit = null;
if(os.platform() === 'linux'){
    console.log('设置屏幕监听')
    monit = spawn.exec(`dbus-monitor --session "type='signal',interface='org.gnome.ScreenSaver'" |
    while read x; do
      case "$x" in 
        *"boolean true"*) echo SCREEN_LOCKED;;
        *"boolean false"*) echo SCREEN_UNLOCKED;;  
      esac
    done `)

    monit.stdout.on('data', (data) => {
        console.log('监听到屏幕重启')
        const out = data.toString().trim()
        if (out === 'SCREEN_UNLOCKED') {
            newAppTray.destroy()
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
    
    // 系统托盘设置
    // 托盘图标
    appTrayInit()

    globalShortcut.register('alt+shift+q', () => {
        console.log("托盘销毁情况")
        console.log(newAppTray.isDestroyed())
    })

    globalShortcut.register('alt+shift+m', () => {
        // console.log('alt+shift+m is pressed')
        newAppTray.destroy()
        appTrayInit()
        // appTray.init(electron, app, mainWindow)
        mainWindow.show()
        mainWindow.setSkipTaskbar(true);
    })

    // app on 了之后先进行 ajax 请求配置详情，成功之后再 createWindows
    getConfigJson(function (json){
        console.log(json)
        createWindow(json);
    })

})

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (win == null) {
        createWindow();
    }
})