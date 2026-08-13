const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.get("/", (req, res) => {
    res.json({
        message: "Resumlyzer backend is running"
    });
});


// ---------------- GEMINI ANALYSIS ----------------

app.post("/analyze", async (req, res) => {

    try {

        const { resumeText, jobDescription } = req.body;

        if (!resumeText || !jobDescription) {
            return res.status(400).json({
                error: "Resume text and job description are required."
            });
        }

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

        const text = response.text;

        console.log("Gemini response:");
        console.log(text);

        // Remove possible markdown code fences
        const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const analysis = JSON.parse(cleanedText);

        res.json(analysis);

    } catch (error) {

        console.error("Gemini analysis error:", error);

        res.status(500).json({
            error: "Failed to analyze resume."
        });
    }
});


const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Resumlyzer backend running on port ${PORT}`);
});