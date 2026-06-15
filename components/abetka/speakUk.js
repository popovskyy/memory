let preferredVoice = null;
let resumeInterval = null;
let audioEl = null;
let useApiMode = null;
let speakGen = 0;

const audioCache = new Map();

function loadVoices() {
	if (typeof window === "undefined" || !window.speechSynthesis) return [];
	const voices = window.speechSynthesis.getVoices();
	preferredVoice =
		voices.find((v) => v.lang === "uk-UA") ||
		voices.find((v) => v.lang.startsWith("uk")) ||
		voices.find((v) => /ukrain/i.test(v.name)) ||
		null;
	return voices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
	loadVoices();
	window.speechSynthesis.onvoiceschanged = loadVoices;
}

async function detectMode() {
	if (useApiMode !== null) return useApiMode;

	let voices = loadVoices();
	if (voices.length === 0) {
		await new Promise((r) => setTimeout(r, 80));
		voices = loadVoices();
	}

	useApiMode = !preferredVoice;
	return useApiMode;
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
		audioEl.onended = null;
		audioEl.onerror = null;
		audioEl = null;
	}
}

async function fetchAudioUrl(text) {
	const cached = audioCache.get(text);
	if (cached) return cached;

	const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
	if (!res.ok) throw new Error("TTS fetch failed");

	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	audioCache.set(text, url);
	return url;
}

export async function ensureCached(text) {
	if (!text || audioCache.has(text)) return;
	try {
		await fetchAudioUrl(text);
	} catch {
		// ignore preload errors
	}
}

export function preloadSpeech(texts = []) {
	if (typeof window === "undefined") return;
	for (const text of texts) {
		if (!text || audioCache.has(text)) continue;
		fetchAudioUrl(text).catch(() => {});
	}
}

function speakViaApi(text, gen) {
	stopAudio();
	clearResumeInterval();
	if (window.speechSynthesis) window.speechSynthesis.cancel();

	return new Promise((resolve) => {
		const play = async () => {
			try {
				const url = await fetchAudioUrl(text);
				if (gen !== speakGen) {
					resolve(false);
					return;
				}

				audioEl = new Audio(url);
				audioEl.playbackRate = 1.15;

				audioEl.onended = () => {
					if (gen === speakGen) audioEl = null;
					resolve(true);
				};
				audioEl.onerror = () => {
					if (gen === speakGen) audioEl = null;
					resolve(false);
				};

				await audioEl.play();
			} catch {
				resolve(false);
			}
		};

		play();
	});
}

function speakViaSynth(text, gen, { rate = 1.05, pitch = 1.1 } = {}) {
	return new Promise((resolve) => {
		const synth = window.speechSynthesis;
		if (!synth) {
			resolve(false);
			return;
		}

		loadVoices();
		clearResumeInterval();
		stopAudio();
		synth.cancel();

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = "uk-UA";
		utterance.rate = rate;
		utterance.pitch = pitch;
		utterance.volume = 1;
		if (preferredVoice) utterance.voice = preferredVoice;

		let finished = false;
		const finish = (ok) => {
			if (finished || gen !== speakGen) return;
			finished = true;
			clearResumeInterval();
			resolve(ok);
		};

		utterance.onend = () => finish(true);
		utterance.onerror = () => finish(false);

		resumeInterval = setInterval(() => synth.resume(), 200);
		synth.resume();
		synth.speak(utterance);

		setTimeout(() => finish(false), 4000);
	});
}

export async function speakUk(text, opts = {}) {
	if (!text || typeof window === "undefined") return;

	const gen = ++speakGen;
	stopAudio();
	clearResumeInterval();
	if (window.speechSynthesis) window.speechSynthesis.cancel();

	const apiMode = await detectMode();
	if (gen !== speakGen) return;

	if (apiMode) return speakViaApi(text, gen);

	const ok = await speakViaSynth(text, gen, opts);
	if (gen !== speakGen) return;
	if (!ok) {
		useApiMode = true;
		return speakViaApi(text, gen);
	}
}

export function stopSpeech() {
	speakGen++;
	clearResumeInterval();
	stopAudio();
	if (isSpeechSupported() && window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}
