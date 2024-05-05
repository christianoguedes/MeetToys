const eventListeners = [];
const mic_on_sound = new Audio(chrome.runtime.getURL('sounds/mic_on.mp3'));
const mic_off_sound = new Audio(chrome.runtime.getURL('sounds/mic_off.mp3'));

function addEventListenerWithTracking(target, eventType, handler) {
    target.addEventListener(eventType, handler);
    eventListeners.push({ target, eventType, handler });
}

function removeAllEventListeners() {
    eventListeners.forEach(({ target, eventType, handler }) => {
        target.removeEventListener(eventType, handler);
    });
    eventListeners.length = 0;
}

function updateIcon(icon) {
    chrome.runtime.sendMessage({
        action: "updateIcon",
        isOn: icon
    });
}

function toogleMic(tabId) {
    // console.log("toogle tabId" + tabId + " isOnMeet()" + isOnMeet()) ;
    if (isOnMeet()) {
        micButton().click();
        updateIcon(!isMicOn());
    }
}

function micButton() {
    return audioButtons()[0]
}

function camButton() {
    return audioButtons()[1]
}

function audioButtons() {
    return document.querySelectorAll('button[data-is-muted]');
}

function isOnMeet() {
    return audioButtons().length > 0
}

function isMicOn() {
    return micButton().getAttribute('data-is-muted') == "false"
}

function endButton() {
    const buttons = document.querySelectorAll('button i');
    for (const icon of buttons) {
        if (icon.textContent.trim() === 'call_end') {
            return icon.closest('button');
        }
    }
    return null;
}

function sendIconMessage(negative = false, endCall = false) {
    let isOn = negative ? !isMicOn() : isMicOn();
    isOn = endCall ? null : isOn;
    updateIcon(isOn);
}

function playMicSound() {
    console.log("play_sound");
    let sound = !isMicOn() ? mic_on_sound : mic_off_sound
    sound.play();
}

function audioButtonsOnRoom() {
    return document.querySelectorAll('div[data-is-muted][role="button"]');
}

function isOnRoom() {
    return audioButtonsOnRoom().length > 0
}

function micButtonOnRoom() {
    return audioButtonsOnRoom()[0];
}

function camButtonOnRoom() {
    return audioButtonsOnRoom()[1];
}

function enterButtonCallOnRoom() {
    return document.querySelectorAll('button[data-promo-anchor-id] span')[0];
}

function waitElement(selector, callback, keepObserving = false) {
    function existsAndIsVisible(selector, callback) {
        const element = document.querySelector(selector);
        if (element && isVisible(element)) {
            callback(element);
            if (!keepObserving) {
                obs.disconnect();
            }
        }
    }

    function isVisible(element) {
        return element.offsetParent !== null && window.getComputedStyle(element).visibility !== 'hidden' && window.getComputedStyle(element).opacity !== '0';
    }

    existsAndIsVisible(selector, callback);

    const observer = new MutationObserver((mutations, obs) => {
        existsAndIsVisible(selector, elemento => {
            callback(elemento);
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

}


async function main() {
    removeAllEventListeners();

    waitElement('div[data-is-muted][role="button"]', async function() {
        let options = await getOptions();
        console.log("options: " + JSON.stringify(options));
        if (options === undefined) { 
            options = {"soundButtons": true, "disableMic": true, "disableCam": true, "enterAutomatically": false };
        }
        

        console.log("isOnRoom");
        updateIcon(null);
        if (options.disableCam) {
            camButtonOnRoom().click();
        }
        if (options.disableMic) {
            micButtonOnRoom().click();
        }        
        if (options.enterAutomatically) {
            waitElement('button[data-promo-anchor-id] span',function() {
                console.log("achou");
                enterButtonCallOnRoom().click();
            });
        }
    });
    waitElement('button[data-is-muted]', function() {
        console.log("isOnMeet");
        updateIcon(isMicOn());
        addEventListenerWithTracking(micButton(), 'click', async function (event) {
            const options = await getOptions();
            
            sendIconMessage(true);
            if (options.soundButtons) {
                playMicSound();
            }
        });

        addEventListenerWithTracking(endButton(), 'click', async function (event) {
            sendIconMessage(false, true);
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("listen: " + message.action);
    if (message.action === 'toogleMic') {
        toogleMic(message.tabId)
    }
    if (message.action === 'active_mic_key') {
        if (isOnMeet() && !isMicOn()) {
            toogleMic(null);
        }
    }
    if (message.action === 'deactivate_mic_key') {
        if (isOnMeet() && isMicOn()) {
            toogleMic(null);
        }
    }
    if (message.action === 'disconnect') {
        if (isOnMeet()) {
            endButton().click();
        }
    }
});

function getOptions() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('options', function(data) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(data.options);
            }
        });
    });
}

main();




