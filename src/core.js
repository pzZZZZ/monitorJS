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
        try {
            var timing = performance.timing;
            var loadTime = timing.loadEventEnd - timing.navigationStart;//过早获取时,loadEventEnd有时会是0
            if (loadTime <= 0) {
                // 未加载完，延迟200ms后继续times方法，直到成功
                setTimeout(function () {
                    getTiming()
                }, 200);
                return;
            }
            var readyStart = timing.fetchStart - timing.navigationStart;
            var redirectTime = timing.redirectEnd - timing.redirectStart;
            var appcacheTime = timing.domainLookupStart - timing.fetchStart;
            var unloadEventTime = timing.unloadEventEnd - timing.unloadEventStart;
            var lookupDomainTime = timing.domainLookupEnd - timing.domainLookupStart;
            var connectTime = timing.connectEnd - timing.connectStart;
            var requestTime = timing.responseEnd - timing.requestStart;
            var initDomTreeTime = timing.domInteractive - timing.responseEnd;
            var domReadyTime = timing.domComplete - timing.domInteractive; //过早获取时,domComplete有时会是0
            var loadEventTime = timing.loadEventEnd - timing.loadEventStart;

            // 为console.table方法准备对象，包含耗时的描述和消耗的时间
            var allTimes = [
                { "描述": "准备新页面时间耗时", "时间(ms)": readyStart },
                { "描述": "redirect 重定向耗时", "时间(ms)": redirectTime },
                { "描述": "Appcache 耗时", "时间(ms)": appcacheTime },
                { "描述": "unload 前文档耗时", "时间(ms)": unloadEventTime },
                { "描述": "DNS 查询耗时", "时间(ms)": lookupDomainTime },
                { "描述": "TCP连接耗时", "时间(ms)": connectTime },
                { "描述": "request请求耗时", "时间(ms)": requestTime },
                { "描述": "请求完毕至DOM加载", "时间(ms)": initDomTreeTime },
                { "描述": "解释dom树耗时", "时间(ms)": domReadyTime },
                { "描述": "load事件耗时", "时间(ms)": loadEventTime },
                { "描述": "从开始至load总耗时", "时间(ms)": loadTime }
            ];
        } catch (error) {

        }

        console.table(allTimes);
        notifyHttpError({
            'readyStart':readyStart,
            'redirectTime':redirectTime,
            'appcacheTime':appcacheTime,
            'lookupDomainTime':lookupDomainTime,
            'connectTime':connectTime,
            'requestTime':requestTime,
            'initDomTreeTime':initDomTreeTime,
            'domReadyTime':domReadyTime,
            'loadEventTime':loadEventTime,
            'loadTime':loadTime

        })
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
                            type: 2,
                            status: this.status,
                            responseURL: this.responseURL,
                            pageUrl: location.href

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
        let postUrl = 'http://172.16.73.133:3000/getError?'
        for (let i in data) {
            postUrl += `${i}=${data[i]}&`
        }
        let ajax = new XMLHttpRequest()
        ajax.open('get', postUrl)
        ajax.send()
    }
}()
