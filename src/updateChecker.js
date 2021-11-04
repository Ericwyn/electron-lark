const appStoreFs = require("fs");
const path = require('path')
const https = require('https')
const electron = require('electron');
const Notification = electron.Notification;

const appConf = require("./configuration")

// 检查更新的时间间隔，每天只检查一次
const checkUpdateExpireTime = 24 * 60 * 60;

let updateCheckJson;

function getConfigJson(callback){
    if(appStoreFs == null) return
    appStoreFs.readFile('updateCheck.json','utf-8',function(err,data){
        if(err){
            console.log(err)
            console.log("读取json配置文件失败")
            updateCheckJson = {
                lastCheckUpdateTimeStamp: 0
            }
        }
        else{
            console.log("read config json:" + data);
            updateCheckJson = JSON.parse(data);
        }
        callback()
    });
}

function saveConfig(){
    if (appStoreFs == null) {
        console.log("fs 载入失败")
        return;
    }
    appStoreFs.writeFile("updateCheck.json",JSON.stringify(updateCheckJson, null, "  "),function (err) {
        if(err){
            console.log(err);
        }else{
            console.log("更新配置保存成功")
        }
    })
}

function checkUpdateInAppStart(){
    // localStorage.
    
    function check(){
        if(updateCheckJson == null){
            console.log("updateCheckJson 为 null")
            return
        } else {
            console.log(updateCheckJson)
        };
    
        
        let unixTimeStamp = Math.floor(new Date().getTime() / 1000);
        if(updateCheckJson.lastCheckUpdateTimeStamp == null){
            updateCheckJson.lastCheckUpdateTimeStamp = 0;
        } else {
            console.log("上次检查时间:" + updateCheckJson.lastCheckUpdateTimeStamp);
        }
    
        if(unixTimeStamp - updateCheckJson.lastCheckUpdateTimeStamp > checkUpdateExpireTime) {
            console.log("开始检查更新")
            checkUpdate(false, function(){
                updateCheckJson.lastCheckUpdateTimeStamp = unixTimeStamp;
                saveConfig();
            })    
        }
    }

    if(updateCheckJson == null){
        getConfigJson(function(){check()});
    } else {
        check();
    }

}

// 参数代表是否手动触发
function checkUpdate(showCheckNotify, successCb){
    if(successCb == undefined){
        successCb = function(){}
    }

    let options = {
        protocol: 'https:',
        hostname: 'api.github.com',
        path: '/repos/Ericwyn/electron-lark/releases/latest',
        headers: {
          'User-Agent': 'request'
        }
    }
    
    let resJsonStr = "";

    https.get(options, (res) => {
        console.log('request github api for check update, status code :' + res.statusCode); 
        // if(res.statusCode != 200){
            // return
        // }   
        
        res.on('data', (data) => {
            resJsonStr += String(data);
        });

        res.on('end', () => {
            let resJson;
            try{
                JSON.parse(resJsonStr);
            } catch(e){
                console.log("resJsonStr 校验错误")
                return
            }
            resJson = JSON.parse(String(resJsonStr));

            if(res.statusCode != 200){
                if(resJson.message.indexOf("API rate limit exceeded") >= 0) {
                    if(showCheckNotify !== undefined && showCheckNotify) {
                        new Notification({
                            title: "检查更新失败",
                            subtitle : "检查更新失败",
                            body : "Github API 请求速度过快，请稍后再试",
                            icon: electron.nativeImage.createFromPath(appConf.dock32),
                        }).show();
                    }    
                }
            } else {
                console.log("请求成功")
                resJson = JSON.parse(String(resJsonStr));
            }
            
            let newVersion = String(resJson.tag_name)
                .trim()
                .toLocaleLowerCase()
                .replace("v","");;

            // 只要最新版本和当前版本不一样，就提示更新
            let packageVersion = require(path.join(__dirname, './../package.json'))
                .version
                .trim()
                .toLocaleLowerCase().replace("v", "");
            console.log("当前版本号:", packageVersion);
            console.log("最新版本号:", newVersion);
            
            if(packageVersion != newVersion) {
                let updateNotify = new Notification({
                    title: "发现新版本",
                    subtitle : "发现新版本",
                    body : "electron-lark 已发现新版本，请前往 github release 页下载",
                    icon: electron.nativeImage.createFromPath(appConf.dock32),
                });
                
                updateNotify.addListener('click', function(){
                    console.log("open github for download release");
                    electron.shell.openExternal('https://github.com/Ericwyn/electron-lark/releases')
                });
                updateNotify.show();
        
            } else {
                if(showCheckNotify !== undefined && showCheckNotify) {
                    new Notification({
                        title: "当前已是最新版本",
                        subtitle : "当前已是最新版本",
                        body : "当前 elecron-lark 版本已是最新版本",
                        icon: electron.nativeImage.createFromPath(appConf.dock32),
                    }).show();
                }
            }

            successCb();
        })

    }).on('error', (e) => {
        console.log("fail in request github api")
        console.error(e);
        if(showCheckNotify) {
            new Notification({
                title: "检查更新失败",
                subtitle : "检查更新失败",
                body : e.message,
                icon: electron.nativeImage.createFromPath(appConf.dock32),
            }).show(); ;
        }
    });
}

module.exports = {
    checkInAppStart: checkUpdateInAppStart,
    check: checkUpdate,
}