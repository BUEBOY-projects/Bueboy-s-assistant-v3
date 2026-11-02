export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI is not configured" });
  try {
    const { category, topic, style, count, extra } = req.body || {};
    if (typeof topic !== "string" || !topic.trim() || topic.length > 1500)
      return res.status(400).json({ error: "Enter a valid topic" });
    const safeCount = [5, 8, 10].includes(Number(count)) ? Number(count) : 8;
    const prompt = `You are BUEBOY'S ASSISTANT V3, a creative editing-ideas assistant. Generate exactly ${safeCount} distinct original video-edit concepts. Category: ${String(category || "General").slice(0,60)}. Topic: ${topic.trim()}. Style: ${String(style || "Cinematic").slice(0,100)}. Extra details: ${String(extra || "None").slice(0,500)}. For each idea give a catchy title and useful concept including visuals, mood, transitions/scene progression, and suitable music vibe when relevant. Make each idea meaningfully different and practical. Do not claim to create actual video files. Return only valid JSON in this format: {"ideas":["Title: concept..."]}`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 3500 } })
    });
    if (!response.ok) {
  const errorText = await response.text();
  console.error("Gemini request failed:", response.status, errorText);
  return res.status(502).json({ error: "AI request failed" });
    }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");
    if (!text) return res.status(502).json({ error: "Empty AI response" });
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.ideas)) return res.status(502).json({ error: "Invalid AI response" });
    const ideas = parsed.ideas.filter(x => typeof x === "string").slice(0, safeCount);
    if (!ideas.length) return res.status(502).json({ error: "No ideas generated" });
    return res.status(200).json({ ideas });
  } catch (error) {
    console.error("Generation error:", error.message);
    return res.status(502).json({ error: "Generation failed" });
  }
}
