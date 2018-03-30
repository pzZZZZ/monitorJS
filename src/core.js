!function () {
    if (navigator.appName == "Microsoft Internet Explorer" && navigator.appVersion.match(/8./i) == "8.") {
        //不捕获IE8错误
        return false
    }
    handleAddListener('load', getTiming)

    function handleAddListener(type, fn) {
        if (window.addEventListener) {
            window.addEventListener(type, fn)
        } else {
            window.attachEvent('on' + type, fn)
        }
    }

    function getTiming() {
        //获取页面性能相关时间信息
        let data = { type: 0 }
        try {
            var time = performance.timing;
            time.type = 0
            var timingObj = {};

            var loadTime = (time.loadEventEnd - time.loadEventStart) / 1000;

            if (loadTime < 0) {
                setTimeout(function () {
                    getTiming();
                }, 200);
                return;
            }
            data.domReady = (time.domComplete - time.domLoading) / 1000;
            data.

                timingObj['重定向时间'] = (time.redirectEnd - time.redirectStart) / 1000;
            timingObj['DNS解析时间'] = (time.domainLookupEnd - time.domainLookupStart) / 1000;
            timingObj['TCP完成握手时间'] = (time.connectEnd - time.connectStart) / 1000;
            timingObj['HTTP请求响应完成时间'] = (time.responseEnd - time.requestStart) / 1000;
            timingObj['DOM开始加载前所花费时间'] = (time.responseEnd - time.navigationStart) / 1000;
            timingObj['DOM加载完成时间'] = (time.domComplete - time.domLoading) / 1000;
            timingObj['DOM结构解析完成时间'] = (time.domInteractive - time.domLoading) / 1000;
            timingObj['脚本加载时间'] = (time.domContentLoadedEventEnd - time.domContentLoadedEventStart) / 1000;
            timingObj['onload事件时间'] = (time.loadEventEnd - time.loadEventStart) / 1000;
            timingObj['页面完全加载时间'] = (timingObj['重定向时间'] + timingObj['DNS解析时间'] + timingObj['TCP完成握手时间'] + timingObj['HTTP请求响应完成时间'] + timingObj['DOM结构解析完成时间'] + timingObj['DOM加载完成时间']);

            // for (item in timingObj) {
            //     console.log(item + ":" + timingObj[item] + '毫秒(ms)');
            // }
            // let data = {
            //     redirectTime:(time.redirectEnd - time.redirectStart) / 1000,
            //     DNSTime: (time.domainLookupEnd - time.domainLookupStart) / 1000,
            //     TCPTime:(time.connectEnd - time.connectStart) / 1000,
            //     HTTPTime: (time.responseEnd - time.requestStart) / 1000,
            //     DOMbeforeTime:(time.responseEnd - time.navigationStart) / 1000,
            //     DomAnalysisTime:(time.domInteractive - time.domLoading) / 1000,
            //     DomDoneTime:(time.domComplete - time.domLoading) / 1000,
            //     ScriptDoneTime:(time.domContentLoadedEventEnd - time.domContentLoadedEventStart) / 1000,
            //     onloadTime:(time.loadEventEnd - time.loadEventStart) / 1000,
            //     pageLoadTime:data[redirectTime]+data[DNSTime]+data[TCPTime]+data[HTTPTime]+data[DomAnalysisTime]+data


            // }
            // console.log(performance.timing);
            notifyHttpError(time)

        } catch (e) {
            // console.log(timingObj)
            // console.log(performance.timing);
            notifyHttpError(time)
        }
    }




    window.onerror = function (msg, url, line, col, error) {
        //没有URL不上报
        //不是JS错误不上报
        if (msg != "Script error." && !url) {
            return true;
        }
        //同步带吗执行完毕后异步进行上报
        //采用异步的方式
        //我遇到过在window.onunload进行ajax的堵塞上报
        //由于客户端强制关闭webview导致这次堵塞上报有Network Error
        //我猜测这里window.onerror的执行流在关闭前是必然执行的
        //而离开文章之后的上报对于业务来说是可丢失的
        //所以我把这里的执行流放到异步事件去执行
        //脚本的异常数降低了10倍
        setTimeout(function () {
            var data = {};
            //不一定所有浏览器都支持col参数
            col = col || (window.event && window.event.errorCharacter) || 0;
            data.pageUrl = location.href//错误JS URL
            data.scriptUrl = url;//错误JS URL
            data.errLine = line;//错误行
            data.errCol = col;//错误列
            data.type = 1;//语法类错误
            if (!!error && !!error.stack) {
                //如果浏览器有堆栈信息
                //直接使用
                data.errMsg = error.stack.toString();
            } else if (!!arguments.callee) {
                //尝试通过callee拿堆栈信息
                var ext = [];
                var f = arguments.callee.caller, c = 3;
                //这里只拿三层堆栈信息
                while (f && (--c > 0)) {
                    ext.push(f.toString());
                    if (f === f.caller) {
                        break;//如果有环
                    }
                    f = f.caller;
                }
                ext = ext.join(",");
                data.msg = error.stack.toString();//页面错误信息
            }
            // console.log(data)
            notifyHttpError(data)
        }, 0);

        return true;
    };

    !(function () {
        //polyfill CustmEvent 
        if (typeof window.CustomEvent === "function") return false;

        function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    })();
    !(function () {
        function ajaxEventTrigger(event) {
            var ajaxEvent = new CustomEvent(event, { detail: this });
            window.dispatchEvent(ajaxEvent);
        }

        var oldXHR = window.XMLHttpRequest;

        function newXHR() {
            var realXHR = new oldXHR();

            realXHR.addEventListener('abort', function () {
                //传输被用户取消
                ajaxEventTrigger.call(this, 'ajaxAbort');

            }, false);

            realXHR.addEventListener('error', function () {
                //传输中出现错误
                ajaxEventTrigger.call(this, 'ajaxError');
            }, false);

            realXHR.addEventListener('load', function () {
                //传输成功完成
                ajaxEventTrigger.call(this, 'ajaxLoad');
            }, false);

            realXHR.addEventListener('loadstart', function () {
                //传输开始
                ajaxEventTrigger.call(this, 'ajaxLoadStart');
            }, false);

            realXHR.addEventListener('progress', function () {
                ajaxEventTrigger.call(this, 'ajaxProgress');
            }, false);

            realXHR.addEventListener('timeout', function () {
                //传输超时
                ajaxEventTrigger.call(this, 'ajaxTimeout');
            }, false);

            realXHR.addEventListener('loadend', function () {
                //传输结束，但是不知道成功还是失败
                ajaxEventTrigger.call(this, 'ajaxLoadEnd');
            }, false);

            realXHR.addEventListener('readystatechange', function () {
                if (this.readyState === 4) {
                    // console.log(this.status);
                    // console.log(1213)
                    if (this.status != 200) {
                        console.log(this)
                        let data = {
                            type:2,
                            status:this.status,
                            responseURL:this.responseURL,
                            pageUrl:location.href

                        }
                        notifyHttpError(data)
                        // let obj = {
                        //     name: 'zhangsan',
                        //     age: 123
                        // }

                        // notifyHttpError(obj)

                    } else {
                        // console.log(this)
                    }
                }

                ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
            }, false);

            return realXHR;
        }

        window.XMLHttpRequest = newXHR;
    })();
    function notifyHttpError(data) {
        let postUrl = 'http://localhost:3000/getError?'
        for (let i in data) {
            postUrl += `${i}=${data[i]}&`
        }
        let ajax = new XMLHttpRequest()
        ajax.open('get', postUrl)
        ajax.send()
    }
}()
