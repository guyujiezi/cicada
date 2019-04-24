function injectPluginScrpit(document, scripts) {
    if (!document) return;
    let src = scripts.shift();
    if (!src) return;
    let script = document.createElement('script');
    script.src = chrome.extension.getURL(src);
    script.onload = function () {
        injectPluginScrpit(document, scripts);
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(script);
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

chrome.runtime.onMessage.addListener((message, sender) => {
    switch (message.type) {
    case 'update':
        break;
    case 'disable':
        break;
    }
});

chrome.runtime.sendMessage({type: 'disable?'}, disabled => {
    if (disabled) return;
    injectPluginScrpit(document, ['vendor/mark.min.js', 'plugin.js']);
});

document.documentElement.addEventListener('cicada.updateCounter', e => {
    chrome.runtime.sendMessage({type: 'update', counter: e.detail});
});

document.documentElement.addEventListener('cicada.fetchFont', e => {
    fetch(e.detail.fontUrl).then(response => response.arrayBuffer()).then(font => {
        let fontDatUrl = 'data:font/woff2;base64,' + arrayBufferToBase64(font);
        let fontName = e.detail.fontName;
        document.getElementById(e.detail.styleId).innerHTML = `@font-face{font-family:"${fontName}";src:url("${fontDatUrl}") format("woff2");}`;
    })
});

document.querySelectorAll('iframe, frame').forEach(frame => {
    chrome.runtime.sendMessage({type: 'disable?', url: frame.src}, disabled => {
        if (disabled || !frame.contentDocument) return;

        frame.addEventListener('load', e => {
            injectPluginScrpit(frame.contentDocument, ['vendor/mark.min.js', 'plugin.js']);
        });
        if (frame.contentDocument.readyState == 'loading') {
            frame.contentDocument.addEventListener('DOMContentLoaded', e => {
                injectPluginScrpit(frame.contentDocument, ['vendor/mark.min.js', 'plugin.js']);
            });
        } else {
            injectPluginScrpit(frame.contentDocument, ['vendor/mark.min.js', 'plugin.js']);
        }
    });
});
