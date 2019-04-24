const URL_ENCRYPT = 'https://guyujiezi.com/api/encrypt';
const URL_NONCE = 'https://guyujiezi.com/api/nonce';
const FONT_NAME = '思源黑体';

Zepto($ => {
    let background = chrome.extension.getBackgroundPage();
    let calcShadowtextCapacity = (shadowtext) => {
        let list = shadowtext.split('');
        let deduplicatedList = [];
        let discardedList = [];
        let popItem;
        while (popItem = list.pop()) {
            if (list.indexOf(popItem) < 0 && 
                deduplicatedList.indexOf(popItem) < 0 &&
                discardedList.indexOf(popItem) < 0) {
                deduplicatedList.unshift(popItem);
            } else {
                discardedList.push(popItem);
            }
        }
        return deduplicatedList.length;
    };

    let generateShadowtext = (shadowtexts, capacity) => {
        let shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
              let j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]];
            }
        };
        let truncate = (shadowtext, capacity) => {
            const CHINESE_COMMAS = '，。？！；';
            let lastLength = shadowtext.length;
            for (let i = shadowtext.length - 1; i >= 0; i --) {
                if (CHINESE_COMMAS.indexOf(shadowtext[i]) < 0) continue;
                if (calcShadowtextCapacity(shadowtext.slice(0, i)) <= capacity) break;
                lastLength = i;
            }
            return shadowtext.slice(0, lastLength);
        };
        shuffle(shadowtexts);
        let shadowtext = '';
        for (let i = 0; i < shadowtexts.length; i ++) {
            shadowtext += shadowtexts[i];
            let _capacity = calcShadowtextCapacity(shadowtext);
            if (_capacity >= capacity) {
                shadowtext = truncate(shadowtext, capacity);
                break;
            }
        }
        return shadowtext;
    };

    let sanitizeShadowtext = (text) => {
        return text.replace(/[\r\n\s]/g, '');
    }, sanitizePlaintext = sanitizeShadowtext;

    let $autoGenerate = $('#auto-generate'),
        $plaintext = $('#plaintext'),
        $shadowtext = $('#shadowtext'),
        $fieldShadowtext = $('#field-shadowtext'),
        $switch = $('#switch'),
        $submit = $('#submit'),
        $form = $('#form'),
        $success = $('#success'),
        $result = $('#result'),
        $back = $('#back'),
        $modal = $(`\
<div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-content" style="padding: 0 2rem;">
        <div class="box message has-text-centered"></div>
    </div>
    <button class="modal-close" aria-label="close"></button>
</div>`);

    $modal.showMessage = function (message) {
        this.appendTo(document.body);
        this.find('.box').text(message);
    };

    chrome.tabs.query({active: true}, tabs => {
        tabs.every(tab => {
            let url = tab.url;
            if (background.exceptionList.matchURL(url)) {
                $switch.removeAttr('checked');
            }
            let switchery = new Switchery(document.querySelector('.is-switch'));
            return false;
        });
    });

    $autoGenerate.change(e => {
        if ($(e.target).is(':checked')) {
            $fieldShadowtext.addClass('is-hidden');
        } else {
            $fieldShadowtext.removeClass('is-hidden');
        }
    });

    $switch.change(e => {
        chrome.tabs.query({active: true}, tabs => {
            tabs.forEach(tab => {
                let url = tab.url;
                if (e.target.checked) {
                    background.exceptionList.removeByURL(url);
                    background.browserButton.update(tab.id);
                } else {
                    background.exceptionList.addURL(url);
                    background.browserButton.disable(tab.id);
                }
                background.exceptionList.sync();
            });
        });
    });

    $back.click(e => {
        $form.removeClass('is-hidden');
        $success.addClass('is-hidden');
    });

    $submit.click(e => {
        e.preventDefault();
        $submit.attr('disabled', 'disabled').addClass('is-loading');
        let afterAction = () => {
            $submit.removeAttr('disabled').removeClass('is-loading');
        };
        let errorHandler = (xhr, errorType, error) => {
            afterAction();
            let err = { message: '接口不可用' }
            try {
                err = JSON.parse(xhr.responseText);
            } catch (e) { }
            $modal.showMessage('调用服务接口失败: ' + err.message);
        };

        let sendRequest = (plaintext, shadowtext) => {
            $.ajax({
                type: 'GET',
                url: URL_NONCE,
                success(data, status, xhr) {
                    let nonce = data.nonce;
                    if (!nonce)
                        return errorHandler();
                    $.ajax({
                        type: 'POST',
                        url: URL_ENCRYPT,
                        headers: {
                            'Authorization': [
                                'GYJZ pk=' + background.appKey.public,
                                'nonce=' + nonce,
                                'sign=' + background.appKey.sign(nonce)
                            ].join(',')
                        },
                        data: JSON.stringify({
                            plaintext: plaintext,
                            shadowtext: shadowtext,
                            font: FONT_NAME,
                            formats: ['woff2']
                        }),
                        contentType: 'application/json',
                        success(data, status, xhr) {
                            let fontURL = data.woff2;
                            let matches = /https:\/\/guyujiezi\.com\/fonts\/(\w{1,6}\/\w{1,6})\.woff2/.exec(fontURL);
                            $result.val('「' + shadowtext + '」' + matches[1] + '。');
                            $form.addClass('is-hidden');
                            $success.removeClass('is-hidden');
                            afterAction();
                        },
                        error: errorHandler
                    });
                },
                error: errorHandler
            });
        };

        let plaintext = sanitizePlaintext($plaintext.val());
        if ($autoGenerate.is(':checked')) {
            fetch(chrome.runtime.getURL('shadowtexts.json'))
                .then(response => response.json())
                .then(shadowtexts => {
                    sendRequest(
                        plaintext,
                        generateShadowtext(shadowtexts, plaintext.length)
                    );
                });
        } else {
            sendRequest(
                plaintext,
                sanitizeShadowtext($shadowtext.val())
            );
        }
    });

    $(document.body).on('click', '.modal-close, .modal-background', e => {
        $(e.target).parents('.modal').remove();
    }).on('input propertychange', '#auto-generate, #plaintext, #shadowtext', e => {
        let plaintext = sanitizePlaintext($plaintext.val()),
            shadowtext = sanitizeShadowtext($shadowtext.val());
        if ($autoGenerate.is(':checked') && plaintext.length > 0) {
            $submit.removeAttr('disabled');
            return;
        } else if (plaintext.length > 0 && plaintext.length <= shadowtext.length && plaintext.length <= calcShadowtextCapacity(shadowtext)) {
            $submit.removeAttr('disabled');
            return;
        }
        $submit.attr('disabled', 'disabled');
    });

    new ClipboardJS('#copy');
});


