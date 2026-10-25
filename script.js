let apiKey = localStorage.getItem('gemini_api_key') || '';
let proactiveMinutes = parseInt(localStorage.getItem('gemini_timer')) || 10;
let lastInteractionTime = Date.now();

document.getElementById('set-api-key').value = apiKey;
document.getElementById('set-timer').value = proactiveMinutes;

function switchMode(mode) {
    if (mode === 'live') {
        document.getElementById('character-stage').style.display = 'flex';
        document.getElementById('chat-section').style.display = 'none';
    } else {
        document.getElementById('character-stage').style.display = 'none';
        document.getElementById('chat-section').style.display = 'flex';
    }
}

function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() {
    apiKey = document.getElementById('set-api-key').value;
    localStorage.setItem('gemini_api_key', apiKey);
    proactiveMinutes = parseInt(document.getElementById('set-timer').value) || 10;
    localStorage.setItem('gemini_timer', proactiveMinutes);
    document.getElementById('settings-modal').style.display = 'none';
}

function speakJapanese(text, subtitleText) {
    document.getElementById('subtitle-box').innerText = subtitleText;
    const sprite = document.getElementById('character-sprite');
    sprite.classList.add('anim-talk');

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.onend = () => { sprite.classList.remove('anim-talk'); };
        window.speechSynthesis.speak(utterance);
    } else {
        setTimeout(() => { sprite.classList.remove('anim-talk'); }, 3000);
    }
}

async function askGemini(promptText) {
    if (!apiKey) {
        alert('لطفاً کلید API جمنای را در تنظیمات وارد کنید!');
        openSettings();
        return "لطفاً کلید API را وارد کنید.";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: promptText }] }] };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error(error);
        return "خطا در ارتباط با سرور هوش مصنوعی.";
    }
}

async function sendChatMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `<div class="message user">${text}</div>`;
    input.value = '';
    lastInteractionTime = Date.now();

    const aiReply = await askGemini(`به عنوان یک دوست صمیمی پیکسلی به این پیام پاسخ کوتاه و جذاب بده: ${text}`);
    chatMessages.innerHTML += `<div class="message ai">${aiReply}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleVoiceLive() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';

    recognition.onstart = () => { document.getElementById('mic-btn').innerText = 'در حال گوش دادن...'; };
    recognition.onresult = async (event) => {
        const userSpeech = event.results[0][0].transcript;
        document.getElementById('subtitle-box').innerText = `تو: ${userSpeech}`;
        lastInteractionTime = Date.now();

        const aiText = await askGemini(`پاسخ کوتاه و صمیمی بده به: ${userSpeech}`);
        speakJapanese("Konnichiwa! Sou desu ne...", aiText); 
    };
    recognition.onerror = () => { document.getElementById('mic-btn').innerText = 'شروع صحبت صوتی'; };
    recognition.onend = () => { document.getElementById('mic-btn').innerText = 'شروع صحبت صوتی'; };

    recognition.start();
}

function toggleCameraStream() {
    const mode = document.getElementById('set-camera').value;
    const video = document.getElementById('webcam');
    if (mode === 'on') {
        video.style.display = 'block';
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => { video.srcObject = stream; }).catch(e => console.log(e));
    } else {
        video.style.display = 'none';
        if (video.srcObject) { video.srcObject.getTracks().forEach(track => track.stop()); }
    }
}

setInterval(async () => {
    const idleTimeMinutes = (Date.now() - lastInteractionTime) / (1000 * 60);
    if (idleTimeMinutes >= proactiveMinutes) {
        lastInteractionTime = Date.now();
        const aiText = await askGemini("مدتی است کاربر چیزی نگرفته است. به عنوان یک دوست صمیمی نگران شو یا یک سوال کنجکاوانه بپرس.");
        speakJapanese("Nande? Doushita no?", aiText);
    }
}, 30 * 1000);
