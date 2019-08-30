var helper = {};  
exports.helper = helper;  
  
var log4js = require('log4js');  
var fs = require("fs");  
var path = require("path");  
  
// ���������ļ�  
var objConfig = JSON.parse(fs.readFileSync(path.join(__dirname,"log4js.json"), "utf8"));  
  
// ��������ļ������Ŀ¼�Ƿ���ڣ�������ʱ����  
if(objConfig.appenders){  
    var baseDir = path.join(__dirname, objConfig["customBaseDir"]);  
    var defaultAtt = objConfig["customDefaultAtt"];  
  
    for(var i= 0, j=objConfig.appenders.length; i<j; i++){  
        var item = objConfig.appenders[i];  
        if(item["type"] == "console")  
            continue;  
  
        if(defaultAtt != null){  
            for(var att in defaultAtt){  
                if(item[att] == null)  
                    item[att] = defaultAtt[att];  
            }  
        }  
        if(baseDir != null){  
            if(item["filename"] == null)  
                item["filename"] = baseDir;  
            else  
                item["filename"] = baseDir + item["filename"];  
        }  
        var fileName = item["filename"];  
        if(fileName == null)  
            continue;  
        var pattern = item["pattern"];  
        if(pattern != null){  
            fileName += pattern;  
        }  
        var category = item["category"];  
        if(!isAbsoluteDir(fileName))
            throw new Error("node" + category + " is not AbsoluteDir:" + fileName);  
        var dir = path.dirname(fileName);  
        checkAndCreateDir(dir);  
    }  
}  
  
// Ŀ¼������ϣ��ż������ã���Ȼ����쳣  
log4js.configure(objConfig);  
  
var logDebug = log4js.getLogger('logDebug');  
var logInfo = log4js.getLogger('logInfo');  
var logWarn = log4js.getLogger('logWarn');  
var logErr = log4js.getLogger('logErr');  
  
helper.d = function(msg){  
    if(msg == null)  
        msg = "";  
    logDebug.debug(msg);  
};  
  
helper.i = function(msg){  
    if(msg == null)  
        msg = "";  
    logInfo.info(msg);  
};  
  
helper.w = function(msg){  
    if(msg == null)  
        msg = "";  
    logWarn.warn(msg);  
};  
  
helper.e = function(msg, exp){  
    if(msg == null)  
        msg = "";  
    if(exp != null)  
        msg += "\r\n" + exp;  
    logErr.error(msg);  
};  
  
// ���express�õķ���  
helper.use = function(app) {  
    //ҳ��������־, level��autoʱ,Ĭ�ϼ�����WARN  
    app.use(log4js.connectLogger(logDebug, {level:'info'}));  
}  
  
// �ж���־Ŀ¼�Ƿ���ڣ�������ʱ������־Ŀ¼  
function checkAndCreateDir(dir){  
    if(!fs.existsSync(dir)){  
        fs.mkdirSync(dir);  
    }  
}  
  
// ָ�����ַ����Ƿ����·��  
function isAbsoluteDir(path){  
    if(path == null)  
        return false;  
    var len = path.length;  
  
    var isWindows = process.platform === 'win32';  
    if(isWindows){  
        if(len <= 1)  
            return false;  
        return path[1] == ":";  
    }else{  
        if(len <= 0)  
            return false;  
        return path[0] == "/";  
    }  
}  