var G = {},
    initObj = null,
    statusMap = {
        "scanning": "<div class='whirl-img layout-left'></div><div>" + _("Scanning...") + "</span>",
        "scanned": "<span class='scaned'>" + _("Scanning finished.") + "</span>",
        "unscanned": "<span class='failed-scan'>" + _("") + "</span>"
    };

var dlnaInfo;
var pageview = R.pageView({ //页面初始化
    init: function () {
        top.loginOut();
        top.$(".main-dailog").removeClass("none");
        top.$(".save-msg").addClass("none");
        $("#submit").on("click", function () {
            G.validate.checkAll();
        });
    }
});
var pageModel = R.pageModel({
    getUrl: "goform/GetDlnaCfg",
    setUrl: "goform/SetDlnaCfg",
    translateData: function (data) {
        var newData = {};
        newData.dlna = data;
        return newData;
    },
    afterSubmit: callback
});


/************************/
var view = R.moduleView({
    initEvent: initEvent
})
var moduleModel = R.moduleModel({
    initData: initValue,
    getSubmitData: function () {
        var data,
            deviceName = ($("#dlnaEn").val() == 1 ? $("#deviceName").val() : initObj.deviceName),
            scanList = $("#fileWrap").find(".folder-menu").map(function () {
                return $(this).attr("data-path");
            }).get().join('\t'); //已选中的文件夹

        data = "dlnaEn=" + $("#dlnaEn").val() + "&deviceName=" + deviceName + "&scanList=" + encodeURIComponent(scanList);
        return data;
    }
});

//模块注册
R.module("dlna", view, moduleModel);

function initEvent() {
    $("#dlnaEn").on("click", changeDLNAEn);
    checkData();
    //$("#refresh").on("click", refreshDLNA);

    //点击分区图标或文字时，获取一级目录
    $("#folderWrap").delegate(".folder-one .usb-open, .folder-one .usb-close", "click", function () {

        var folderId = $(this).parent().next().attr("id"),
            subData = {
                "folderGrade": "primary",
                "filePath": $(this).parent().attr("data-path")
            };

        getMoreFolder(folderId, subData);
    });

    //点击一级目录的图标时，获取二级目录
    $("#folderWrap").delegate(".folder-second .usb-open, .folder-second .usb-close", "click", function () {
        //点击的是二级目录时，不做展开,而是将当前目录添加到左侧
        if ($(this).next().hasClass("second-folder")) {
            return;
        }

        var folderId = $(this).parent().next().attr("id"),
            subData = {
                "folderGrade": "secondary",
                "filePath": $(this).next().next().find("span").attr("data-path")
            };

        getMoreFolder(folderId, subData);
    });

    //点击一级或二级目录的文字时，将文件夹添加到右边
    $("#folderWrap").delegate(".folder-name", "click", addSelectedFolder);

    //点击右侧已选文件夹的某项，从已选文件夹列表中删除此项
    $("#fileWrap").delegate(".folder-small, .folder-name", "click", deleteSelectedFolder);

    top.initIframeHeight();
}

/**
 * 获取一级或二级目录
 * @param  {String} folderGrade primary || secondary
 * @return 
 */
function getMoreFolder(folderId, subData) {
    var folderIndex = folderId.slice(13, folderId.length);

    //若当前存在一级或二级目录，将一级或二级目录的内容置空
    if ($("#" + folderId).html() !== "") {
        $("#" + folderId).html("");
        //关闭时修改类名
        $("#" + folderId).prev().find(".usb-close").attr("class", "usb-open")
        return;
    } else { //若当前一级或二级目录为空，则发起数据请求，生成一级或二级目录
        //显示搜索图标
        $(".folder-scan").css("background", "url(/img/scan.gif?26753faa15e908b7272147d75c2e21c4) 0 no-repeat");
        $("#" + folderId).prev().find(".usb-open").attr("class", "usb-close");
        $.GetSetData.setData("goform/expandDlnaFile?" + Math.random(), subData, function (obj) {
            createFolderList(subData.folderGrade, obj, subData.filePath, folderIndex);
        });
    }
}

function changeDLNAEn() {
    var className = $("#dlnaEn").attr("class");
    if (className == "btn-off") {
        $("#dlnaEn").attr("class", "btn-on");
        $("#dlnaEn").val(1);
        $("#dlna_set").removeClass("none");
    } else {
        $("#dlnaEn").attr("class", "btn-off");
        $("#dlnaEn").val(0);
        $("#dlna_set").addClass("none");
    }
    top.initIframeHeight();
}

function refreshDLNA() {
    $.post("/goform/refreshDLNA", "action=1", function (str) {
        if (!top.isTimeout(str)) {
            return;
        }
        var num = $.parseJSON(str).errCode;
        if (num == 0) {

        }
    });
    $("#refresh").attr("disabled", true);
    $("#refresh").next().css("display", "inline-block");
    setTimeout(function () {
        $("#refresh").removeAttr("disabled");
        $("#refresh").next().css("display", "none");
    }, 5000)
}

function checkData() {
    G.validate = $.validate({
        custom: function () {},

        success: function () {
            dlnaInfo.submit();
        },

        error: function (msg) {
            return;
        }
    });
}

/**
 * 删除右侧某个已选中的目录，同时，左侧去掉选中图标
 * @return 
 */
function deleteSelectedFolder() {
    var deleteFolder = $(this).parents(".folder-menu").attr("data-path");

    $(this).parents(".folder-menu").remove();

    //改变记录已选目录个数的全局变量
    G.existFileLen--;

    //左侧对应的目录恢复可添加
    $("#folderWrap").find(".folder-name").each(function (i) {
        if ($(this).attr("data-path") === deleteFolder) {
            //标记此目录为未选
            $(this).attr("data-selected", "false");

            //隐藏选中的图标
            $(this).next().addClass("none");
        }
    });
}

/**
 * 新增选中的目录至右侧
 */
function addSelectedFolder() {
    var selectePath = $(this).attr("data-path"),
        addFolderStr = '';


    //当次目录还未被选中时
    if ($(this).attr("data-selected") !== "true") {

        //选中的目录最多10条
        if (G.existFileLen >= 10) {
            showErrMsg("msg-err", _("A maximum of %s folders can be selected.", [10]));
            return;
        }

        addFolderStr = '<div class="folder-menu" data-path="' + $(this).attr("data-path") + '"><div class="folder-small"></div><div class="text-fixed first-folder"><span class="folder-name" title="' + $(this).attr("data-path") + '">' + $(this).attr("data-path") + '</span></div></div>';

        //将当前目录添加到右侧
        $("#fileWrap").prepend(addFolderStr);

        //记录当前已选目录数目
        G.existFileLen++;

        //标记此目录为已选
        $(this).attr("data-selected", "true");

        //显示选中的图标
        $(this).next().removeClass("none");
    } else {
        //将当前目录从右侧删除
        $("#fileWrap").find(".folder-menu").each(function (i) {
            if ($(this).attr("data-path") === selectePath) {
                $(this).remove();
            }
        });

        //记录当前已选目录数目
        G.existFileLen--;

        //标记此目录为未选
        $(this).attr("data-selected", "false");

        //隐藏选中的图标
        $(this).next().addClass("none");
    }
}

/**
 * 生成一级或二级菜单
 * @param  {String} folderGrade primary || secondary
 * @param  {Object} obj 接口expandDlnaFile的数据
 * @param  {String} str 路径前缀
 * @param  {String} appendID  二级菜单依附的父节点的id
 * @return 
 */
function createFolderList(folderGrade, obj, str, appendID) {
    var folderArr = $.parseJSON(obj).subfileList, //
        folderLen = folderArr.length,
        appendIndex = parseInt(appendID, 10),
        k = 0,
        q = 0,
        appendPath = "",
        htmlStr = "",
        secFolderIndex = 0, //二级目录的索引
        selectedArr = [], //已被选中的目录的索引数组
        openClass = "",
        isCanOpen = false;

    for (; k < folderLen; k++) {
        appendPath = str + "/" + folderArr[k].fileName;

        //检测右侧是否有相应的二级目录
        $("#fileWrap").find(".folder-menu").each(function (i) {
            if ($(this).attr("data-path") === appendPath) {
                folderArr[k].selectedFlag = "true";
            }
        });

        if (folderGrade == "primary") {
            secFolderIndex++;
            if (folderArr[k].hasChildFile == "true") {
                openClass = "usb-open";
                isCanOpen = "true";
            } else {
                openClass = "usb-none-open";
                isCanOpen = "false";
            }
            htmlStr += '<div class="folder-menu folder-second"><div class="' + openClass + '"></div><div class="folder-small" data-open="' + isCanOpen + '"></div><div class="text-fixed first-folder"><span class="folder-name" data-selected="false" title="' + folderArr[k].fileName + '" data-path="' + appendPath + '">' + folderArr[k].fileName + '</span><img src="img/selected.png?26753faa15e908b7272147d75c2e21c4" class="none" style="width:12px;height:9px;"></div></div><div id="secFolderMenu' + appendIndex + secFolderIndex + '"></div>';
        } else {
            openClass = "usb-none-open";
            isCanOpen = "false";
            htmlStr += '<div class="folder-menu folder-third"><div class="' + openClass + '"></div><div class="folder-small"></div><div class="text-fixed second-folder"><span class="folder-name" data-selected="false" title="' + folderArr[k].fileName + '" data-path="' + appendPath + '">' + folderArr[k].fileName + '</span><img src="img/selected.png?26753faa15e908b7272147d75c2e21c4" class="none" style="width:12px;height:9px;"></div></div>';
        }

        if (folderArr[k].selectedFlag == "true") {
            selectedArr.push(k);
        }
    }

    if (folderGrade == "primary") {
        $("#priFolderMenu" + appendIndex).html(htmlStr);
        //初始化已选和未选的状态
        for (; q < selectedArr.length; q++) {
            $("#priFolderMenu" + appendIndex + " .first-folder").eq(selectedArr[q]).find("img").removeClass("none");
            $("#priFolderMenu" + appendIndex + " .first-folder").eq(selectedArr[q]).find("span").attr("data-selected", "true");
        }
    } else {
        $("#secFolderMenu" + appendIndex).html(htmlStr);

        //初始化已选和未选的状态
        for (; q < selectedArr.length; q++) {
            $("#secFolderMenu" + appendIndex + " .second-folder").eq(selectedArr[q]).find("img").removeClass("none");
            $("#secFolderMenu" + appendIndex + " .second-folder").eq(selectedArr[q]).find("span").attr("data-selected", "true");
        }
    }

    //隐藏搜索图标
    $(".folder-scan").css("background", "#fff");
}

/**
 * 生成存储设备列表
 * @param  {Object} obj 存储设备的数据
 * @return 
 */
function createDeviceList(obj) {
    var listData = obj,
        listLen = obj.length,
        i = 0,
        n = 0,
        folderIndex = 0, //一级目录的索引
        str = "",
        openClass = "", //展开类
        isCanOpen = false;

    for (; i < listLen; i++) {
        //硬盘名称
        str += '<div class="folder-menu"><div class="mobile-hdd"></div><div class="text-fixed hdd-name"><span style="cursor: default;">' + listData[i].deviceName + '</span></div></div>';

        for (n = 0; n < listData[i].diskList.length; n++) {
            folderIndex++;
            if (listData[i].diskList[n].hasChildFile == "true") {
                openClass = "usb-open";
                isCanOpen = "true";
            } else {
                openClass = "usb-none-open";
                isCanOpen = "false";
            }
            //U盘名称
            str += '<div class="folder-menu folder-one" data-path="' + listData[i].diskList[n].fileName + '" data-open="' + isCanOpen + '"><div class="' + openClass + '"></div><div class="usb-samll"></div><div class="text-fixed zone-name"><span>' + listData[i].diskList[n].fileName + '</span></div></div><div id="priFolderMenu' + folderIndex + '"></div>';
        }
    }

    $("#folderWrap").html(str);
}

/**
 * 生成右侧已选文件夹列表
 * @param  {Object} obj 已选目录的接口数据
 * @return 
 */
function createExistFileList(obj) {
    var existFileData = obj,
        existLen = obj.length,
        j = 0,
        str = "";

    G.existFileLen = existLen;

    for (; j < existLen; j++) {
        str += '<div class="folder-menu" data-path="' + existFileData[j] + '"><div class="folder-small"></div><div class="text-fixed first-folder"><span class="folder-name" title="' + existFileData[j] + '">' + existFileData[j] + '</span></div></div>';
    }

    $("#fileWrap").html(str);
}

function initValue(obj) {
    initObj = obj;
    if (obj.dlnaEn == "1") {
        $("#dlnaEn").attr("class", "btn-on");
        $("#dlnaEn").val(1);
        $("#dlna_set").removeClass("none");
    } else {
        $("#dlnaEn").attr("class", "btn-off");
        $("#dlnaEn").val(0);
        $("#dlna_set").addClass("none");
    }
    $("#deviceName").val(obj.deviceName);

    //媒体服务器状态
    if (obj.dlnaScanStatus == "unscanned") {
        //未扫描时隐藏状态
        $("#serverStatus").parent().addClass("none");
    } else {
        $("#serverStatus").parent().removeClass("none");
        $("#serverStatus").html(statusMap[obj.dlnaScanStatus]);
    }


    if (obj.deviceList.length !== 0) {
        $(".media-content").removeClass("none");

        //生成存储设备列表
        createDeviceList(obj.deviceList);

        //生成已选文件夹
        createExistFileList(obj.scanList);
    } else {
        $(".media-content").addClass("none");
    }

    top.initIframeHeight();
}

function callback(str) {
    if (!top.isTimeout(str)) {
        return;
    }
    clearInterval(checkServerStatus);
    var num = $.parseJSON(str).errCode;
    top.showSaveMsg(num);
    if (num == 0) {
        //getValue();
        top.usbInfo.initValue();
    }
}
var checkServerStatus;
window.onload = function () {
    dlnaInfo = R.page(pageview, pageModel);

    //定时更新媒体服务器状态
    checkServerStatus = setInterval(function () {
        $.GetSetData.getData("goform/GetDlnaCfg", function (data) {
            var obj = $.parseJSON(data);
            //未扫描时隐藏状态
            if (obj.dlnaScanStatus == "unscanned") {
                $("#serverStatus").parent().addClass("none");
            } else {
                $("#serverStatus").parent().removeClass("none");
                $("#serverStatus").html(statusMap[obj.dlnaScanStatus]);
            }
        });
    }, 5000);
};

window.onunload = function () {
    clearInterval(checkServerStatus);
};