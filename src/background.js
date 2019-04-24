const APP_KEY = {
    public: '0b8ee15d67e449c1b3c5a80450d7cbb7',
    secret: 'f3972b72d62a4fcc8e6e68dfbd28ba5e',
    isCustom: false
};

const TITLE_ENABLED = '寒蝉鸣泣';
const TITLE_DISABLED = '噤若寒蝉';

(function (browser) {
    let appKey = {
        assign(appKey) {
            for (let k in appKey) {
                this[k] = appKey[k];
            }
        },
        reset() {
            this.public = APP_KEY.public;
            this.secret = APP_KEY.secret;
            this.isCustom = false;
        },
        sync(callback) {
            browser.storage.sync.set({
                'app_key': {
                    public: this.public,
                    secret: this.secret,
                    isCustom: this.isCustom
                }
            }, callback);
        },
        sign(nonce) {
            return sha1([this.public, this.secret, nonce].join(':'));
        }
    };

    let exceptionList = {
        hostnames: new Set(),
        getHostnameFromUrl(url) {
            try {
                let _url = new URL(url);
                return _url.host;
            }
            catch (e) { }
            return '';
        },
        addURL(url) {
            let hostname = this.getHostnameFromUrl(url);
            if (!hostname) {
                return false;
            }
            this.hostnames.add(hostname);
            return true;
        },
        removeByURL(url) {
            let hostname = this.getHostnameFromUrl(url);
            if (!hostname) {
                return false;
            }
            return this.hostnames.delete(hostname);
        },
        matchURL(url) {
            let hostname = this.getHostnameFromUrl(url);
            if (!hostname) {
                return false;
            }
            let fragment = hostname.split('.');

            do {
                if (this.hostnames.has(fragment.join('.'))) {
                    return true;
                }
                fragment.shift();
            } while (fragment.length > 0);

            return false;
        },
        sync(callback) {
            browser.storage.sync.set({
                'exceptions': Array.from(this.hostnames)
            }, callback);
        }
    };

    let browserButton = {
        update(tabId) {
            this.enable(tabId);
            browser.tabs.sendMessage(tabId, {type: 'update'});
        },
        enable(tabId) {
            browser.browserAction.setIcon({
                path: {
                    16: 'assets/icon-19x19.png',
                    32: 'assets/icon-38x38.png'
                },
                tabId: tabId
            });
            browser.browserAction.setTitle({
                title: TITLE_ENABLED,
                tabId: tabId
            })
        },
        disable(tabId) {
            browser.tabs.sendMessage(tabId, {type: 'disable'});
            browser.browserAction.setBadgeText({text: '', tabId: tabId});
            browser.browserAction.setIcon({
                path: {
                    16: 'assets/icon-disabled-19x19.png',
                    32: 'assets/icon-disabled-38x38.png'
                },
                tabId: tabId
            });
            browser.browserAction.setTitle({
                title: TITLE_DISABLED,
                tabId: tabId
            })
        }
    };

    let loadSettings = () => {
        browser.storage.sync.get({
            'app_key': APP_KEY,
            'exceptions': [
                'guyujiezi.com'
            ],
        }, (items) => {
            appKey.assign(items['app_key']);
            items['exceptions'].forEach(hostname => exceptionList.hostnames.add(hostname));
    
            browser.tabs.query({active: true}, tabs => {
                if (browser.runtime.lastError) return;
                tabs.forEach(tab => {
                    if (exceptionList.matchURL(tab.url)) {
                        browserButton.disable(tab.id);
                        return;
                    }
                    browserButton.update(tab.id);    
                });
            });
        });    
    };
    loadSettings();

    browser.tabs.onCreated.addListener(tab => {
        if (browser.runtime.lastError || !tab) return;
        if (exceptionList.matchURL(tab.url)) {
            browserButton.disable(tab.id);
            return;
        }
        browserButton.update(tab.id);
    });
    
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (browser.runtime.lastError || !tab || changeInfo.status != 'complete') return;
        if (exceptionList.matchURL(tab.url)) {
            browserButton.disable(tab.id);
            return;
        }
        browserButton.update(tabId);
    });
    
    browser.tabs.onActivated.addListener(activeInfo => {
        if (browser.runtime.lastError) return;
        browser.tabs.get(activeInfo.tabId, tab => {
            if (browser.runtime.lastError || !tab) return;
            if (exceptionList.matchURL(tab.url)) {
                browserButton.disable(tab.id);
                return;
            }
            browserButton.update(tab.id);
        });
    });
    
    browser.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
        case 'disable?':
            sendResponse(exceptionList.matchURL(message.url || sender.tab.url));
            break;
        case 'update':
            browser.browserAction.setBadgeText({text: message.counter, tabId: sender.tab.id});
            break;
        case 'disable':
            break;
        }
    });

    window.appKey = appKey;
    window.exceptionList = exceptionList;
    window.browserButton = browserButton;
})(chrome);
