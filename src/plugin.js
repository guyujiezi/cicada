;(document => {
    let markCounter = 0;
    let documentBody = document.body;

    let parse = dom => {
        try {
            let mark = new Mark(dom);
            mark.markRegExp(/「.+?」\s*\w{1,6}\/\w{1,6}。/gmi, {
                className: 'cicada',
                each: node => {
                    node.removeAttribute('data-markjs');
                    let text = node.innerText;
                    let matches = /^「(.+?)」\s*(\w{1,6})\/(\w{1,6})。$/gmi.exec(text);
                    let fontName = ['谷雨解字', matches[2], matches[3]].join('-');
                    let fontUrl = `https://guyujiezi.com/fonts/${matches[2]}/${matches[3]}.woff2`;
                    let styleNodeId = `${matches[2]}-${matches[3]}`;
                    if (!document.getElementById(styleNodeId)) {
                        document.documentElement.dispatchEvent(
                            new CustomEvent('cicada.fetchFont', {detail: {
                                fontUrl: fontUrl,
                                fontName: fontName,
                                styleId: styleNodeId
                            }})
                        );
                        let styleNode = document.createElement('style');
                        styleNode.id = styleNodeId;
                        //styleNode.innerHTML = `@font-face{font-family:"${fontName}";src:url("${fontUrl}") format("woff2");}`;
                        document.head.appendChild(styleNode);    
                    }
                    node.innerText = matches[1];
                    node.setAttribute('style', 'font-family: \'' + fontName + '\';');
                    markCounter ++;
                }
            });    
        } catch (e) { }
        if (markCounter) {
            document.documentElement.dispatchEvent(
                new CustomEvent('cicada.updateCounter', {detail: markCounter.toString()})
            );
        }    
    };

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', e => {
            parse(documentBody);
        });
    } else {
        parse(documentBody);
    }
    let observer = new MutationObserver((mutations, observer) => {
        mutations.forEach(mutation => {
            switch (mutation.type) {
            case 'childList':
                mutation.addedNodes.forEach(node => {
                    parse(node);
                });
                break;
            case 'characterData':
                parse(mutation.target);
                break;
            }
        });
    });
    observer.observe(documentBody, {
        childList: true,
        characterData: true,
        subtree: true
    });
})(document);
