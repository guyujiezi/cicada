const TEMPLATE_EXCEPTION_ITEM = `\
<a class="panel-block" title="删除">
    <span class="panel-icon">
        <i class="fa fa-trash"></i>
    </span>
    <label></label>
</a>`;

const TEMPLATE_NOTIFICATION = '<div class="notification is-warning has-text-centered" style="display: none; position: fixed; top: 0; left: 0; right: 0; margin: 0 auto; z-index: 100; max-width: 20rem;"></div>';

Zepto($ => {
    let notify = (text) => {
        let $notification = $(TEMPLATE_NOTIFICATION);
        $notification.text(text);
        $notification.appendTo(document.body);
        $notification.fadeIn(500, () => {
            setTimeout(() => {
                $notification.fadeOut(500, () => {
                    $notification.remove();
                })
            }, 5000);
        });
    };

    let $tabLinks = $('.page-tab-link'),
        $tabContents = $('.page-tab-content'),
        $exceptionList = $('#exception-list'),
        $publicKey = $('#public-key'),
        $secretKey = $('#secret-key'),
        $exceptionDomain = $('#exception-domain');

    let toggleTab = ($tab, tabId) => {
        $tabLinks.parent('li').removeClass('is-active');
        $tabContents.addClass('is-hidden');
        $tab.addClass('is-active');
        $(tabId).removeClass('is-hidden');
    };

    $tabLinks.click(function() {
        let $this = $(this),
            $tab = $this.parent('li');
        if ($tab.hasClass('is-active')) {
            return false;
        }
        toggleTab($tab, '#' + $this.data('target'));
        return true;
    });
    if (location.hash) {
        toggleTab($('.page-tab-link[href="' + location.hash + '"]').parent('li'), location.hash);
    }

    window.addEventListener('hashchange', e => {
        if (location.hash) {
            toggleTab($('.page-tab-link[href="' + location.hash + '"]').parent('li'), location.hash);
        }
    }, false);

    let background = chrome.extension.getBackgroundPage();
    background.exceptionList.hostnames.forEach(item => {
        let $item = $(TEMPLATE_EXCEPTION_ITEM);
        $item.find('label').text(item);
        $item.data('name', item);
        $exceptionList.append($item);
    });
    if (background.appKey.isCustom) {
        $publicKey.val(background.appKey.public);
        $secretKey.val(background.appKey.secret);
    }
    $('#exception-append').click(e => {
        let domain = $exceptionDomain.val();
        if (!domain) return false;
        if (background.exceptionList.hostnames.add(domain)) {
            let $item = $(TEMPLATE_EXCEPTION_ITEM);
            $item.find('label').text(domain);
            $item.data('name', domain);
            $exceptionList.append($item);
            background.exceptionList.sync();
        }
    });

    $exceptionList.on('click', 'a.panel-block', e => {
        if (!confirm('是否删除该条目？')) return false;
        let $item = $(e.target);
        let domain = $item.data('name');
        if (background.exceptionList.hostnames.delete(domain)) {
            $item.remove();
            background.exceptionList.sync();
        }
    });

    $('#app-key-save').click(e => {
        let publicKey = $publicKey.val();
        let secretKey = $secretKey.val();
        if (!publicKey || !secretKey) {
            return false;
        }
        background.appKey.assign({
            public: publicKey,
            secret: secretKey,
            isCustom: true
        });
        background.appKey.sync();
        notify('已保存');
    });

    $('#app-key-reset').click(e => {
        $publicKey.val('');
        $secretKey.val('');
        background.appKey.reset();
        background.appKey.sync();
        notify('已重置');
    });
});
