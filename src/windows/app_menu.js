'use strict';
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
                require('electron').shell.openExternal('https://github.com/Ericwyn')
            }
        }]
    }
]

/**
* 增加更新相关的菜单选项
*/
function addUpdateMenuItems (electron , items, position) {
    if (process.mas) return

    // const version = require('electron').app.getVersion()
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
            electron.autoUpdater.checkForUpdates()
        }
    }, {
        label: 'Restart and Install Update',
        enabled: true,
        visible: false,
        key: 'restartToUpdate',
        click: function () {
            electron.autoUpdater.quitAndInstall()
        }
    }]

    items.splice.apply(items, [position, 0].concat(updateItems))
}

// function findReopenMenuItem() {
//     const menu = Menu.getApplicationMenu()
//     if (!menu) return

//     let reopenMenuItem
//     menu.items.forEach(function (item) {
//         if (item.submenu) {
//             item.submenu.items.forEach(function (item) {
//                 if (item.key === 'reopenMenuItem') {
//                     reopenMenuItem = item
//                 }
//             })
//         }
//     })
//     return reopenMenuItem
// }




class AppMenu{

}

AppMenu.prototype.init = function( electron ){
    // 针对Windows端的一些配置
    if (process.platform === 'win32') {
        const helpMenu = template[template.length - 1].submenu
        addUpdateMenuItems(electron, helpMenu, 0)
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
        addUpdateMenuItems(electron, template[0].submenu, 1)
    }

    this.menuTemp = template;
}

module.exports = new AppMenu()

//------------------------------ 设置菜单End --------------------------
