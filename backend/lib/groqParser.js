import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import axios from "axios";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

function formatDateForPostgres(dateString) {
  if (!dateString || dateString === 'null') return null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

  const monthYearMatch = dateString.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const monthMap = {
      'january': '01','february': '02','march': '03','april': '04',
      'may': '05','june': '06','july': '07','august': '08',
      'september': '09','october': '10','november': '11','december': '12'
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month) return `${year}-${month}-01`;
  }

  if (/^\d{4}-\d{2}$/.test(dateString)) return `${dateString}-01`;

  console.warn(`Could not parse date: ${dateString}`);
  return null;
}

export async function parseResumeWithGroq(file) {
  let text = "";

  if (file.mimetype === "application/pdf" || file.mimetype === "application/octet-stream") {
    const data = await pdfParse(file.buffer);
    text = data.text;
  } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    text = result.value;
  } else if (file.mimetype === "text/plain") {
    text = file.buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type");
  }

  const prompt = `
Extract structured information from the following resume text. 
Return ONLY valid JSON.

IMPORTANT:
- For experiences, extract title, company, dates, description
- Extract skills for each experience from description or relevant context
- Include skill_name and proficiency (or null) for each skill
- Format dates as YYYY-MM-DD or null
- Return JSON only

Use this JSON structure:
{
  "education": [{"institution": "string", "period": "string"}],
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "description": "string",
      "skills": [{"skill_name": "string", "proficiency": "Beginner/Intermediate/Advanced or null"}]
    }
  ]
}

Resume text:
${text}
`;

  const response = await axios.post(
    GROQ_CHAT_URL,
    {
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "You are a helpful resume parser." },
        { role: "user", content: prompt },
      ],
    },
    {
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rawOutput = response.data?.choices?.[0]?.message?.content;
  if (!rawOutput) throw new Error("No output from Groq");

  let jsonString = rawOutput.trim();

  if (jsonString.includes("```")) {
    const jsonMatch = jsonString.match(/```[a-zA-Z]*\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) jsonString = jsonMatch[1].trim();
  }

  if (!jsonString.startsWith("{")) {
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsedData = JSON.parse(jsonString);

    if (parsedData.experiences) {
      parsedData.experiences = parsedData.experiences.map((exp) => ({
        ...exp,
        start_date: formatDateForPostgres(exp.start_date),
        end_date: formatDateForPostgres(exp.end_date),
      }));
    }

    return parsedData;
  } catch (err) {
    console.log("JSON parse failed. Full string:", jsonString);
    throw new Error("Failed to parse Groq output: " + err.message);
  }
}
