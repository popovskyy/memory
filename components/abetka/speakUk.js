let preferredVoice = null;
let resumeInterval = null;
let audioEl = null;
let voicesReady = false;

function loadVoices() {
	if (typeof window === "undefined" || !window.speechSynthesis) return [];
	const voices = window.speechSynthesis.getVoices();
	preferredVoice =
		voices.find((v) => v.lang === "uk-UA") ||
		voices.find((v) => v.lang.startsWith("uk")) ||
		voices.find((v) => /ukrain/i.test(v.name)) ||
		null;
	if (voices.length > 0) voicesReady = true;
	return voices;
}

function waitForVoices(timeout = 2000) {
	return new Promise((resolve) => {
		if (typeof window === "undefined" || !window.speechSynthesis) {
			resolve([]);
			return;
		}

		const synth = window.speechSynthesis;
		const existing = loadVoices();
		if (existing.length > 0) {
			resolve(existing);
			return;
		}

		const done = () => {
			synth.removeEventListener("voiceschanged", onChange);
			resolve(loadVoices());
		};

		const onChange = () => {
			if (synth.getVoices().length > 0) done();
		};

		synth.addEventListener("voiceschanged", onChange);
		synth.onvoiceschanged = loadVoices;

		setTimeout(done, timeout);
	});
}

if (typeof window !== "undefined" && window.speechSynthesis) {
	loadVoices();
	window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function isSpeechSupported() {
	return typeof window !== "undefined" && ("speechSynthesis" in window || "Audio" in window);
}

export function hasLocalUkVoice() {
	return !!preferredVoice;
}

function clearResumeInterval() {
	if (resumeInterval) {
		clearInterval(resumeInterval);
		resumeInterval = null;
	}
}

function stopAudio() {
	if (audioEl) {
		audioEl.pause();
		audioEl.currentTime = 0;
		audioEl = null;
	}
}

function speakViaApi(text) {
	stopAudio();

	return new Promise((resolve) => {
		audioEl = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
		audioEl.onended = () => {
			audioEl = null;
			resolve(true);
		};
		audioEl.onerror = () => {
			audioEl = null;
			resolve(false);
		};
		audioEl.play().catch(() => resolve(false));
	});
}

function speakViaSynth(text, { rate = 0.85, pitch = 1.1 } = {}) {
	return new Promise((resolve) => {
		const synth = window.speechSynthesis;
		if (!synth) {
			resolve(false);
			return;
		}

		loadVoices();
		clearResumeInterval();
		synth.cancel();

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = "uk-UA";
		utterance.rate = rate;
		utterance.pitch = pitch;
		utterance.volume = 1;
		if (preferredVoice) utterance.voice = preferredVoice;

		let finished = false;
		const finish = (ok) => {
			if (finished) return;
			finished = true;
			clearResumeInterval();
			resolve(ok);
		};

		utterance.onend = () => finish(true);
		utterance.onerror = () => finish(false);

		resumeInterval = setInterval(() => synth.resume(), 200);

		synth.resume();
		synth.speak(utterance);

		setTimeout(() => finish(false), 12000);
	});
}

export async function speakUk(text, opts = {}) {
	if (!text || typeof window === "undefined") return;

	stopAudio();
	clearResumeInterval();
	if (window.speechSynthesis) window.speechSynthesis.cancel();

	const voices = await waitForVoices();

	if (preferredVoice) {
		const ok = await speakViaSynth(text, opts);
		if (ok) return;
	}

	if (voices.length === 0) {
		await speakViaApi(text);
		return;
	}

	const ok = await speakViaSynth(text, opts);
	if (!ok) await speakViaApi(text);
}

export function stopSpeech() {
	clearResumeInterval();
	stopAudio();
	if (isSpeechSupported() && window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}
