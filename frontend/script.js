import * as pdfjsLib from
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


const jobDescription = document.getElementById("job-description");
const resumeUpload = document.getElementById("resume-upload");
const analyzeBtn = document.getElementById("analyze-btn");
const themeToggle = document.getElementById("theme-toggle");

const loading = document.getElementById("loading");
const results = document.getElementById("results");

const atsScore = document.getElementById("ats-score");
const resumeSummary = document.getElementById("resume-summary");

const matchedSkillsList = document.getElementById("matched-skills-list");
const missingSkillsList = document.getElementById("missing-skills-list");
const keywordMatchList = document.getElementById("keyword-match-list");

const strengthsList = document.getElementById("strengths-list");
const suggestionsList = document.getElementById("suggestions-list");

const pageCount = document.getElementById("page-count");
const wordCount = document.getElementById("word-count");
const skillsCount = document.getElementById("skills-count");
const projectsCount = document.getElementById("projects-count");

const downloadReportBtn = document.getElementById("download-report");
const analyzeAgainBtn = document.getElementById("analyze-again");


// ---------------- PDF TEXT EXTRACTION ----------------

async function extractResumeText(file) {

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

        const page = await pdf.getPage(pageNumber);

        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map(item => item.str)
            .join(" ");

        fullText += pageText + "\n";
    }

    return {
        text: fullText.trim(),
        pages: pdf.numPages
    };
}


// ---------------- GEMINI API ----------------

async function analyzeWithGemini(resumeText, jobDescription) {

    const response = await fetch(
        "http://localhost:5000/analyze",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                resumeText: resumeText,
                jobDescription: jobDescription
            })
        }
    );

    if (!response.ok) {
        throw new Error("Gemini analysis failed.");
    }

    const data = await response.json();

    return data;
}


// ---------------- ANALYZE RESUME ----------------

analyzeBtn.addEventListener("click", async () => {

    const jd = jobDescription.value.trim();
    const file = resumeUpload.files[0];

    if (jd === "") {
        alert("Please enter the job description.");
        return;
    }

    if (!file) {
        alert("Please upload your resume.");
        return;
    }

    if (file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
    }

    loading.classList.remove("hidden");
    results.classList.add("hidden");

    try {

        // Extract resume text

        const resumeData = await extractResumeText(file);

        console.log("Resume pages:", resumeData.pages);
        console.log("Resume text:", resumeData.text);


        // Send resume + JD to backend

        const analysis = await analyzeWithGemini(
            resumeData.text,
            jd
        );

        console.log("Gemini analysis:", analysis);


        // Show results

        loading.classList.add("hidden");
        results.classList.remove("hidden");


        // ---------------- ATS SCORE ----------------

        const score = analysis.ats_score;

        atsScore.textContent = `${score}%`;

        const scoreCircle =
            document.querySelector(".score-circle");

        scoreCircle.style.background =
            `conic-gradient(
                #2563eb ${score * 3.6}deg,
                #dbeafe 0deg
            )`;


        // ---------------- SUMMARY ----------------

        resumeSummary.textContent =
            analysis.summary;


        // ---------------- STATISTICS ----------------

        pageCount.textContent =
            resumeData.pages;

        wordCount.textContent =
            resumeData.text.split(/\s+/).filter(Boolean).length;

        skillsCount.textContent =
            analysis.matched_skills.length +
            analysis.missing_skills.length;

        projectsCount.textContent =analysis.project_count || 0;


        // ---------------- MATCHED SKILLS ----------------

        matchedSkillsList.innerHTML =
            analysis.matched_skills
                .map(skill => `<li>${skill}</li>`)
                .join("");


        // ---------------- MISSING SKILLS ----------------

        missingSkillsList.innerHTML =
            analysis.missing_skills
                .map(skill => `<li>${skill}</li>`)
                .join("");


        // ---------------- KEYWORD MATCH ----------------

        keywordMatchList.innerHTML =
    analysis.keyword_match
        .map(item => {

            if (typeof item === "object") {

                const keyword =
                    item.keyword ||
                    item.name ||
                    item.term ||
                    "Unknown";

                const status =
                    item.status ||
                    item.match ||
                    item.result ||
                    "";

                return `
                    <li>
                        <strong>${keyword}</strong>
                        ${status ? ` — ${status}` : ""}
                    </li>
                `;
            }

            return `<li>${item}</li>`;

        })
        .join("");


        // ---------------- STRENGTHS ----------------

        strengthsList.innerHTML =
            analysis.strengths
                .map(strength => `<li>${strength}</li>`)
                .join("");


        // ---------------- SUGGESTIONS ----------------

        suggestionsList.innerHTML =
            analysis.suggestions
                .map(suggestion => `<li>${suggestion}</li>`)
                .join("");


    } catch (error) {

        console.error("Analysis error:", error);

        loading.classList.add("hidden");

        alert(
            "Something went wrong while analyzing your resume. Check the browser console and backend terminal."
        );
    }
});


// ---------------- ANALYZE AGAIN ----------------

analyzeAgainBtn.addEventListener("click", () => {

    results.classList.add("hidden");

    jobDescription.value = "";
    resumeUpload.value = "";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// ---------------- DOWNLOAD REPORT ----------------

downloadReportBtn.addEventListener("click", () => {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    let y = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text("Resumlyzer", 20, y);

    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text("AI-Powered Resume Analysis Report", 20, y);

    y += 15;

    // ATS Score
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text("ATS Score", 20, y);

    y += 10;

    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text(atsScore.textContent, 20, y);

    y += 20;

    // Summary
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Overall Analysis", 20, y);

    y += 8;

    doc.setFontSize(11);

    const summaryLines = doc.splitTextToSize(
        resumeSummary.textContent,
        170
    );

    doc.text(summaryLines, 20, y);

    y += summaryLines.length * 6 + 12;

    // Statistics
    doc.setFontSize(16);
    doc.text("Resume Statistics", 20, y);

    y += 10;

    doc.setFontSize(11);

    doc.text(
        `Pages: ${pageCount.textContent}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Words: ${wordCount.textContent}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Skills: ${skillsCount.textContent}`,
        20,
        y
    );

    y += 7;

    doc.text(
        `Projects: ${projectsCount.textContent}`,
        20,
        y
    );

    y += 15;

    // Helper function
    function addList(title, listElement) {

        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(30, 30, 30);
        doc.text(title, 20, y);

        y += 8;

        doc.setFontSize(11);

        const items = listElement.querySelectorAll("li");

        items.forEach(item => {

            const text = "• " + item.textContent;

            const lines = doc.splitTextToSize(
                text,
                170
            );

            if (y + lines.length * 6 > 280) {
                doc.addPage();
                y = 20;
            }

            doc.text(lines, 20, y);

            y += lines.length * 6 + 3;
        });

        y += 8;
    }

    addList(
        "Matched Skills",
        matchedSkillsList
    );

    addList(
        "Missing Skills",
        missingSkillsList
    );

    addList(
        "Keyword Match",
        keywordMatchList
    );

    addList(
        "Strengths",
        strengthsList
    );

    addList(
        "Suggestions",
        suggestionsList
    );

    // Footer
    const pageCountPDF =
        doc.internal.getNumberOfPages();

    for (
        let i = 1;
        i <= pageCountPDF;
        i++
    ) {

        doc.setPage(i);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);

        doc.text(
            `Resumlyzer • Page ${i} of ${pageCountPDF}`,
            20,
            290
        );
    }

    // Download
    doc.save("Resumlyzer-Resume-Analysis.pdf");
});


// ---------------- DARK / LIGHT MODE ----------------

const savedTheme =
    localStorage.getItem("resumlyzer-theme");

if (savedTheme === "dark") {

    document.body.classList.add("dark-mode");

    themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const isDarkMode =
        document.body.classList.contains("dark-mode");

    if (isDarkMode) {

        themeToggle.textContent = "☀️";

        localStorage.setItem(
            "resumlyzer-theme",
            "dark"
        );

    } else {

        themeToggle.textContent = "🌙";

        localStorage.setItem(
            "resumlyzer-theme",
            "light"
        );
    }
});