export async function GET(request) {
	const text = request.nextUrl.searchParams.get("text");
	if (!text) {
		return new Response("Missing text", { status: 400 });
	}

	const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=uk&q=${encodeURIComponent(text)}`;

	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
		});

		if (!res.ok) {
			return new Response("TTS failed", { status: 502 });
		}

		return new Response(res.body, {
			headers: {
				"Content-Type": "audio/mpeg",
				"Cache-Control": "public, max-age=86400",
			},
		});
	} catch {
		return new Response("TTS error", { status: 500 });
	}
}
