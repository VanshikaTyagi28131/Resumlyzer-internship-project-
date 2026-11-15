const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    try {
        const { resumeText, jobDescription } = req.body || {};

        if (!resumeText || !jobDescription) {
            return res.status(400).json({
                error: "Resume text and job description are required."
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `
You are an expert ATS Resume Analyzer.

Analyze the candidate's resume against the provided job description.

Give an ATS score from 0 to 100.

Analyze:
1. Overall resume quality
2. Job description keyword matching
3. Matched skills
4. Missing skills
5. Resume strengths
6. Improvements needed
7. Keyword matching

Return ONLY valid JSON.

Use exactly this structure:

{
    "ats_score": 0,
    "summary": "",
    "project_count": 0,
    "matched_skills": [],
    "missing_skills": [],
    "keyword_match": [],
    "strengths": [],
    "suggestions": []
}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const cleanedText = response.text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return res.status(200).json(JSON.parse(cleanedText));

    } catch (error) {
        console.error("Gemini analysis error:", error);
        return res.status(500).json({ error: "Failed to analyze resume." });
    }
};
