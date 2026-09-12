import { NextResponse } from "next/server";

const KIND_NAMES = {
  mcq: "वस्तुनिष्ठ प्रश्न (MCQ, 4 विकल्पों के साथ)",
  fill: "रिक्त स्थान की पूर्ति",
  match: "सही मिलान कीजिए (जोड़े)",
  veryshort: "अतिलघुत्तरात्मक (एक पंक्ति का उत्तर)",
  short: "लघुत्तरात्मक (2-3 पंक्ति का उत्तर)",
  essay: "निबंधात्मक (लंबा उत्तर, अथवा विकल्प सहित)",
};

function buildPrompt({ className, subject, chapters, sections, chapterMarks, difficulty }) {
  const sectionLines = sections
    .map((s) => `- kind: "${s.kind}" (${KIND_NAMES[s.kind] || s.kind}) — बिल्कुल ${s.count} प्रश्न चाहिए, हर एक ${s.marks} अंक का`)
    .join("\n");

  const chapterLine = chapterMarks?.length
    ? `हर अध्याय से इतने अंकों के प्रश्न आने चाहिए (जितना हो सके करीब):\n${chapterMarks.map((c) => `- ${c.name}: ${c.marks} अंक`).join("\n")}`
    : `अध्याय: ${chapters.join(", ")}\nसभी अध्यायों में प्रश्न लगभग बराबर बंटे हुए होने चाहिए।`;

  const difficultyLine =
    difficulty === "आसान (Easy)"
      ? "सभी प्रश्न आसान स्तर के होने चाहिए — सीधे, बुनियादी concept पर आधारित।"
      : difficulty === "मध्यम (Medium)"
      ? "सभी प्रश्न मध्यम कठिनाई के होने चाहिए — concept समझ की जरूरत हो, पर बहुत पेचीदा ना हों।"
      : difficulty === "कठिन (Hard)"
      ? "सभी प्रश्न कठिन स्तर के होने चाहिए — गहरी समझ और application वाले सवाल, टॉप स्टूडेंट्स के लिए चुनौतीपूर्ण।"
      : "प्रश्नों में आसान, मध्यम और कठिन — तीनों स्तर का मिश्रण होना चाहिए, ताकि हर तरह के स्टूडेंट के लिए कुछ हो।";

  return `तुम एक अनुभवी स्कूल शिक्षक हो। कक्षा ${className} के विषय "${subject}" के लिए परीक्षा के प्रश्न बनाओ:

${chapterLine}

निम्नलिखित संरचना के अनुसार बिल्कुल उतने ही प्रश्न बनाओ जितने बताए गए हैं, ना कम ना ज़्यादा:
${sectionLines}

प्रश्न NCERT स्तर के होने चाहिए। कठिनाई स्तर: ${difficultyLine}

जवाब सिर्फ शुद्ध JSON array के रूप में दो, कोई अतिरिक्त टेक्स्ट या मार्कडाउन बैकटिक्स नहीं। फॉर्मेट:
[
  {"kind":"mcq","text":"प्रश्न","options":["विकल्प1","विकल्प2","विकल्प3","विकल्प4"]},
  {"kind":"fill","text":"रिक्त स्थान वाला प्रश्न ___ के साथ"},
  {"kind":"match","pairs":[{"left":"अ","right":"1"},{"left":"ब","right":"2"}]},
  {"kind":"veryshort","text":"प्रश्न"},
  {"kind":"short","text":"प्रश्न"},
  {"kind":"essay","text":"मुख्य प्रश्न","orText":"अथवा वाला विकल्प प्रश्न"}
]

har section ke kind ke hisab se exact count match hona chahiye jo upar bataya gaya hai. match wale section me pairs ki sankhya us section ke count ke barabar honi chahiye.`;
}

export async function POST(req) {
  try {
    const { className, subject, chapters, chapterMarks, sections, difficulty } = await req.json();
    if (!className || !subject || !chapters?.length || !sections?.length) {
      return NextResponse.json({ error: "कक्षा, विषय, अध्याय और संरचना — सब ज़रूरी हैं" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "सर्वर पर GEMINI_API_KEY सेट नहीं है (Vercel Environment Variables में डालें)" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt({ className, subject, chapters, sections, chapterMarks, difficulty });

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok || data.error) {
      return NextResponse.json({ error: data?.error?.message || `API त्रुटि (${resp.status})` }, { status: 502 });
    }

    const text = (data.candidates || [])
      .flatMap((c) => c.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "जवाब को समझने में समस्या आई" }, { status: 502 });
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: "कोई प्रश्न नहीं बन पाया, दोबारा कोशिश करें" }, { status: 422 });
    }

    return NextResponse.json({ questions: parsed });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "अज्ञात त्रुटि" }, { status: 500 });
  }
}
