const eventListeners = [];
const mic_on_sound = new Audio(chrome.runtime.getURL('sounds/mic_on.mp3'));
const mic_off_sound = new Audio(chrome.runtime.getURL('sounds/mic_off.mp3'));
const cam_on_sound = new Audio(chrome.runtime.getURL('sounds/cam_on.mp3'));
const cam_off_sound = new Audio(chrome.runtime.getURL('sounds/cam_off.mp3'));
const call_end_sound = new Audio(chrome.runtime.getURL('sounds/call_end.mp3'));
let lastMessageElement = null;
let participants = [];

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
    console.log("toogle tabId" + tabId + " isOnMeet()" + isOnMeet() + " isMicOn()" + isMicOn());
    if (isOnMeet()) {
        micButton().click();
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
    return micButton().getAttribute('data-is-muted') == "false";
}

function isCamOn() {
    return camButton().getAttribute('data-is-muted') == "false";
}

function peopleList() {
    return document.querySelectorAll('div[role="list"]');
}

function peopleButton() {
    return Array.from(document.querySelectorAll('i.google-symbols')).find(e => e.textContent.trim() === 'people');
}

function chatButton() {
    return Array.from(document.querySelectorAll('i.google-symbols')).find(e => e.textContent.trim() === 'chat');
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

function sendIconMessage(endCall = false) {
    isOn = endCall ? null : isMicOn();
    updateIcon(isOn);
}

function playMicSound() {
    console.log("play_mic_sound");
    let sound = isMicOn() ? mic_on_sound : mic_off_sound
    sound.play();
}

function playCamSound() {
    console.log("playcam_sound: isCamOn()" + isCamOn());
    let sound = isCamOn() ? cam_on_sound : cam_off_sound
    sound.play();
}

function playEndCallSound() {
    console.log("play_end_call_sound");
    call_end_sound.play();
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

function checkPeopleLists() {
    if (peopleList().length > 0) {
        let new_participants = []
        let participants_html = peopleList()[0];
        for (let p of participants_html.children) {
            let img = p.querySelector('img').attributes['src'].value;
            let participant_name = p.querySelector('span').innerText;
            new_participants.push({"name": participant_name, "picture": img});
        }
        new_participants.sort((a, b) => a.name.localeCompare(b.name));
        if (JSON.stringify(new_participants) !== JSON.stringify(participants)) {
            if (participants.length === 0) {
                participants = new_participants;
                updateParticipantsOnServer();
            } 
            participants = new_participants;
            console.log("new participants in meet");
        }
    } else {
        waitElement('i.google-symbols', function () {
            peopleButton().click();
            peopleButton().click();
        });
    }
}

function chatNotifications() {
    let search = document.querySelectorAll('div[data-is-tv]')
    let message = search[search.length -1];
    if (message === lastMessageElement) {
        return;
    }
    call_end_sound.play(); //TODO: new sound

    let userName = findParentWithAttribute(message.parentElement, 'jsaction').children[0].children[0].textContent;
    console.log("userName=" + userName + " text=" + message.textContent);

    chrome.runtime.sendMessage({
        action: "chatMessage",
        title: userName,
        message: message.textContent
    });
    lastMessageElement = message;
}

function updateParticipantsOnServer() {
    if (participants.length === 0) {
        return;
    }
    const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(participants)
    };
    

    fetch('http://localhost:8383/meet/' + getMeetId(), options)
    .then(response => {
        if (!response.ok) {
            console.log("Error on send participants");
        }
    })
    .catch(error => {
        console.error('Erro:', error);
    });
}

function observerParticipants() {
    const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
            checkPeopleLists();
        }
    }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function getMeetId() {
    return window.location.pathname.replace('/', '');
}

function waitElement(selector, callback, keepObserving = false, checkVisibility = true) {
    let observer;

    function exists(selector, callback) {
        const element = document.querySelector(selector);
        if (element && (!checkVisibility || isVisible(element))) {
            callback(element);
            if (!keepObserving && observer) {
                observer.disconnect();
            }
        }
    }

    function isVisible(element) {
        return element.offsetParent !== null && window.getComputedStyle(element).visibility !== 'hidden' && window.getComputedStyle(element).opacity !== '0';
    }

    exists(selector, callback);

    observer = new MutationObserver((mutations, obs) => {
        exists(selector, elemento => {
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

    waitElement('div[data-is-muted][role="button"]', async function () {
        let options = await getOptions();
        console.log("options: " + JSON.stringify(options));
        if (options === undefined) {
            options = { "soundButtons": true, "disableMic": true, "disableCam": true, "enterAutomatically": false };
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
            waitElement('button[data-promo-anchor-id] span', function () {
                enterButtonCallOnRoom().click();
            });
        }
    });
    waitElement('button[data-is-muted]', function () {
        console.log("isOnMeet");
        updateIcon(isMicOn());
        addEventListenerWithTracking(micButton(), 'click', async function (event) {
            const options = await getOptions();

            sendIconMessage();
            if (options.soundButtons) {
                playMicSound();
            }
        });

        addEventListenerWithTracking(endButton(), 'click', async function (event) {
            sendIconMessage(endCall = true);
            const options = await getOptions();
            if (options.soundButtons) {
                playEndCallSound();
            }
        });

        addEventListenerWithTracking(camButton(), 'click', async function (event) {
            const options = await getOptions();
            if (options.soundButtons) {
                playCamSound();
            }
        });

        waitElement('div[data-is-tv]', function () {
            chatNotifications();
        }, keepObserving=true, checkVisibility=false);
          
        observerParticipants();
        chatButton().click();
        chatButton().click();

        setInterval(updateParticipantsOnServer, 5 * 60 * 1000);

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
    if (message.action === 'toogle_cam_key') {
        if (isOnMeet()) {
            camButton().click();
        }
    }
});

function getOptions() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('options', function (data) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(data.options);
            }
        });
    });
}

function findParentWithAttribute(element, attribute) {
    while (element && element !== document) {
        if (element.hasAttribute(attribute)) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

main();


// participants_html = document.querySelectorAll('div[role="list"]')[0]
// participants = []
// for (let p of participants_html.children) {
//     let img = p.querySelector('img').attributes['src'].value;
//     let participant_name = p.querySelector('span').innerText;
//     participants.push({"name": participant_name, "img": img});
// }
// participants.sort((a, b) => a.name.localeCompare(b.name));


// Array.from(document.querySelectorAll('i.google-symbols')).find(e => e.textContent.trim() === 'people');