var wrlPowerInfo;
var pageview = R.pageView({ //页面初始化
    init: function() {
        $("#submit").on("click", function() {
            wrlPowerInfo.submit();
        });
        top.loginOut();
        top.$(".main-dailog").removeClass("none");
        top.$(".save-msg").addClass("none");
    }
});

var pageModel = R.pageModel({
    getUrl: "goform/WifiPowerGet",
    setUrl: "goform/WifiPowerSet",
    translateData: function(data) {
        var newData = {};
        newData.wrlPower = data;
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
    getSubmitData: function() {
        return "power=" + $("[name='power']:checked").val() + "&power_5g=" + $("[name='power_5g']:checked").val();
    }
});

//模块注册
R.module("wrlPower", view, moduleModel);

function changeImg(imgID, powerValue) {
    var $imgDom = $("#"+imgID);

    if (powerValue == "low") {
        $imgDom.attr("src", "../img/icon-power-gray1.png?26753faa15e908b7272147d75c2e21c4");
    } else if (powerValue == "middle") {
        $imgDom.attr("src", "../img/icon-power-gray2.png?26753faa15e908b7272147d75c2e21c4");
    } else {
        $imgDom.attr("src", "../img/icon-power.png?26753faa15e908b7272147d75c2e21c4");
    }
}

function initEvent() {
    $("[name=power]").on("change", function() {
    	changeImg("powerImg",this.value);
    });

    $("[name=power_5g]").on("change", function() {
    	changeImg("powerImg5",this.value);
    });
}

function initValue(obj) {
    top.$(".main-dailog").removeClass("none");
    top.$("iframe").removeClass("none");
    top.$(".loadding-page").addClass("none");

    $("[name='power'][value='" + obj.power + "']").prop("checked", true);
    changeImg("powerImg",obj.power);

    $("[name='power_5g'][value='" + obj.power_5g + "']").prop("checked", true);
    changeImg("powerImg5",obj.power_5g);

    $("#goPage").attr("href", top.G.homePage);
}

function callback(str) {
    if (!top.isTimeout(str)) {
        return;
    }
    var num = $.parseJSON(str).errCode;
    top.showSaveMsg(num);
    if (num == 0) {
        //getValue();	
        top.advInfo.initValue();
        top.wrlInfo.initValue();
    }
}


window.onload = function() {
    wrlPowerInfo = R.page(pageview, pageModel);
};
