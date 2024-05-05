function saveOptions() {
    let enterAutomatically = document.getElementById('enterAutomatically').checked;
    let soundButtons = document.getElementById('soundButtons').checked;
    let mic = document.getElementById('mic').checked;
    let cam = document.getElementById('cam').checked;

    let options = {"soundButtons": soundButtons, "disableMic": mic, "disableCam": cam, "enterAutomatically": enterAutomatically };
    chrome.storage.sync.set({options: options}, function() {
        console.log("saved options: " + JSON.stringify(options));
    });
}

function restoreOptions() {
    chrome.storage.sync.get('options', function(data) {
        let options = data.options;
        document.getElementById('enterAutomatically').checked = options.enterAutomatically;
        document.getElementById('soundButtons').checked = options.soundButtons;
        document.getElementById('mic').checked = options.disableMic;
        document.getElementById('cam').checked = options.disableCam;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);