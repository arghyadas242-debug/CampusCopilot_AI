const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

// Helper to initialize Gemini
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// 1. Interactive Academic Copilot Chat
router.post("/chat", async (req, res) => {
  const { message, history, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Graceful smart academic fallback if API key is not yet set
    const sampleResponses = [
      `As your CampusCopilot, based on your current semester syllabus in Computer Science, that concept is crucial for your upcoming mid-semester exams! Let me break it down step-by-step with practical examples.`,
      `Here is a quick summary: Make sure to review the core formulas and pseudocode for this topic before your lab viva. Your attendance in this subject is currently above 75%, so you're on a solid track!`,
      `Great question! According to your course structure, this topic is covered in Unit 3. Would you like a 5-question practice quiz or a code snippet example?`,
    ];
    const reply = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
    return res.json({
      reply: `[Demo Mode - Add GEMINI_API_KEY in backend/.env for live AI generation]\n\n${reply}\n\nKey Takeaway: Focus on time complexity and database indexing patterns.`,
      source: "fallback",
    });
  }

  try {
    const systemInstruction = `You are CampusCopilot AI, an intelligent, encouraging, and authoritative academic copilot and personal university tutor for college students.
You assist students with:
1. Explaining complex concepts in Computer Science, Engineering, Mathematics, and Sciences clearly with code snippets, diagrams (ASCII/Markdown), and bullet points.
2. Answering questions about academic study strategies, exam revision, assignment guidance, and timetable management.
3. Keep answers concise, highly structured with markdown headings, bullet points, and code blocks where helpful.
${context ? `Current Student Context: ${JSON.stringify(context)}` : ""}`;

    // Format chat history
    const contents = [];
    if (Array.isArray(history)) {
      history.forEach((h) => {
        contents.push({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text || h.message }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text;
    res.json({ reply: replyText, source: "gemini-2.5-flash" });
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: "Failed to generate AI response. " + error.message });
  }
});

// 2. Automated Circular / Notice Summarizer
router.post("/summarize-notice", async (req, res) => {
  const { noticeText, title } = req.body;

  if (!noticeText) {
    return res.status(400).json({ error: "Notice text is required for summarization." });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      summary: [
        "Important deadlines and schedule details are highlighted.",
        "Ensure all prerequisite submissions are verified before the due date.",
        "Admit cards and clearance passes are mandatory for entry.",
      ],
      urgency: "HIGH",
      source: "fallback",
    });
  }

  try {
    const prompt = `Summarize this university campus announcement/notice into 3 concise, highly actionable bullet points for students. Also identify urgency level ('URGENT', 'ACADEMIC', or 'EVENT').
Notice Title: ${title || "Campus Notice"}
Notice Content:
${noticeText}

Respond ONLY in valid JSON format:
{
  "summary": ["point 1", "point 2", "point 3"],
  "urgency": "URGENT" | "ACADEMIC" | "EVENT"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text);
    res.json({ ...parsed, source: "gemini-2.5-flash" });
  } catch (error) {
    console.error("Gemini Summarize Error:", error);
    res.status(500).json({ error: "Failed to summarize notice. " + error.message });
  }
});

// 3. Personalized Study Plan Generator
router.post("/study-plan", async (req, res) => {
  const { subjects, daysUntilExam, dailyHours } = req.body;

  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      plan: [
        { day: "Day 1", subject: "DBMS", focus: "Normalization, SQL Queries, Transaction Isolation (ACID)" },
        { day: "Day 2", subject: "Computer Networks", focus: "TCP/IP, Subnetting, Routing Algorithms & Socket Programming" },
        { day: "Day 3", subject: "Operating Systems", focus: "Paging, Virtual Memory, Semaphore & CPU Scheduling" },
      ],
      tips: "Take 10-minute active recall breaks every 50 minutes using the Pomodoro technique.",
      source: "fallback",
    });
  }

  try {
    const prompt = `Generate a structured daily study preparation schedule for an engineering student.
Subjects: ${JSON.stringify(subjects || ["DBMS", "Computer Networks", "Operating Systems"])}
Days Available: ${daysUntilExam || 7}
Daily Study Capacity: ${dailyHours || 4} hours

Respond in JSON format:
{
  "plan": [
    {"day": "Day 1", "subject": "Subject Name", "focus": "Topics to master"}
  ],
  "tips": "Actionable revision and memory consolidation advice"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text);
    res.json({ ...parsed, source: "gemini-2.5-flash" });
  } catch (error) {
    console.error("Gemini Study Plan Error:", error);
    res.status(500).json({ error: "Failed to generate study plan. " + error.message });
  }
});

module.exports = router;
