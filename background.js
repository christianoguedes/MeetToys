const urlPattern = "*://meet.google.com/*-*-*";

function isMeetUrl(url) {
    return url.match(/^https?:\/\/meet\.google\.com\/.*-.*-.*/);
}

chrome.commands.onCommand.addListener((command) => {
    if (command === "toogle_mic_key") {
        console.log("shortcut toogle_mic_key");
        chrome.tabs.query({url: urlPattern}, (tabs) => {
            tabs.forEach((tab) => {
                toogleMic(tab.id);
            });
        });
    }
    if (command === "active_mic_key") {
        console.log("shortcut active_mic_key");
        chrome.tabs.query({url: urlPattern}, (tabs) => {
            tabs.forEach((tab) => {
                console.log("sending: active_mic_key");
                chrome.tabs.sendMessage(tab.id, { action: 'active_mic_key'});
            });
        });
    }
    if (command === "deactivate_mic_key") {
        console.log("shortcut deactivate_mic_key");
        chrome.tabs.query({url: urlPattern}, (tabs) => {
            tabs.forEach((tab) => {
                console.log("sending: deactivate_mic_key");
                chrome.tabs.sendMessage(tab.id, { action: 'deactivate_mic_key'});
            });
        });
    }
    if (command === "disconnect_key") {
        console.log("shortcut disconnect_key");
        chrome.tabs.query({url: urlPattern}, (tabs) => {
            tabs.forEach((tab) => {
                console.log("sending: disconnect");
                chrome.tabs.sendMessage(tab.id, { action: 'disconnect'});
            });
        });
    }
    if (command === "toogle_cam_key") {
        console.log("shortcut toogle_cam_key");
        chrome.tabs.query({url: urlPattern}, (tabs) => {
            tabs.forEach((tab) => {
                console.log("sending: toogle_cam_key");
                chrome.tabs.sendMessage(tab.id, { action: 'toogle_cam_key'});
            });
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.query({url: urlPattern}, (tabs) => {
        if (tabs.length === 0) {
            chrome.tabs.create({ url: "https://meet.google.com" });
            return;
        } 
        tabs.forEach((tab) => {
            toogleMic(tab.id);
        });
    });
});


chrome.runtime.onInstalled.addListener(() => {
    console.log("Success installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateIcon") {
        updateIcon(message.isOn);
    }

    if (message.action === "chatMessage") {
        let notificationOptions = {
            type: 'basic',
            iconUrl: 'images/logo.png',
            title: message.title,
            message: message.message,
            priority: 2
        };
        createNotification(notificationOptions);
    }
});

function createNotification(notificationOptions) {
    isTabActiveAndFocused(function(isActiveAndFocused) {
        if (!isActiveAndFocused) {
            chrome.notifications.create(null, notificationOptions, function(notificationId) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending notification:', chrome.runtime.lastError);
                } else {
                    console.log('Notification sent with ID:', notificationId);
                }
            });
        } else {
            console.log('Tab is active and focused, not sending notification.');
        }
    });
}

function isTabActiveAndFocused(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
            var currentTab = tabs[0];
            callback(currentTab.active);
        } else {
            callback(false);
        }
    });
}

function toogleMic(tabId) {
    console.log("sending: toogleMic");
    chrome.tabs.sendMessage(tabId, { action: 'toogleMic', tabId: tabId });
}

function updateIcon(isOn) {
    let iconPath = {
        "16": "images/logo_16.png",
        "48": "images/logo_48.png",
        "128": "images/logo.png"
    }
    if (isOn !== null) {
        let icon = "images/mic_" + (isOn ? "on" : "off");
        iconPath = {
            "16": icon + "_16.png",
            "48": icon + "_48.png",
            "128": icon + ".png"
        }
    }
    chrome.action.setIcon({ path: iconPath });
}

