import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import axios from "axios";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

function formatDateForPostgres(dateString) {
  if (!dateString || dateString === 'null') return null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  const monthYearMatch = dateString.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const monthMap = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month) {
      return `${year}-${month}-01`;
    }
  }
  
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    return `${dateString}-01`;
  }
  
  console.warn(`Could not parse date: ${dateString}`);
  return null;
}

export async function parseResumeWithGroq(file) {
  let text = "";

  if (file.mimetype === "application/pdf" || file.mimetype === "application/octet-stream") {
    const data = await pdfParse(file.buffer);
    text = data.text;
  } else if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    text = result.value;
  } else if (file.mimetype === "text/plain") {
    text = file.buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type");
  }

  const prompt = `
Extract structured information from the following resume text. 
Return ONLY valid JSON with no additional text, explanations, comments, or markdown formatting.

IMPORTANT INSTRUCTIONS:
- For experiences, if a company is mentioned (like "Kainos", "University of Birmingham"), use that as the company
- For university projects, use the university name as the company
- Extract any dates mentioned and format as YYYY-MM-DD (e.g., "2024-06-01" for June 2024, use 01 for day when only month/year given)
- If no specific dates are given for experiences, try to infer from education timeline or leave as null
- For ongoing activities, use null for end_date
- Extract all technical and soft skills mentioned
- If a proficiency is stated (like "Advanced Python", "Intermediate SQL", "Beginner JavaScript"), include it
- If no proficiency is given, leave as null
- Always set "source" to "resume"
- DO NOT include any comments (// or /* */) in the JSON output
- Return only pure, valid JSON that can be parsed directly

Use this exact JSON structure:
{
  "skills": [{"skill_name": "string", "proficiency": "Beginner/Intermediate/Advanced or null", "source": "resume"}],
  "education": [{"institution": "string", "period": "string"}],
  "experiences": [{"title": "string", "company": "string", "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null", "description": "string"}]
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

  // Handle code blocks if present
  if (jsonString.includes("```")) {
    const jsonMatch = jsonString.match(/```[a-zA-Z]*\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    } else {
      const codeBlockStart = jsonString.indexOf("```");
      const codeBlockEnd = jsonString.lastIndexOf("```");
      if (codeBlockStart !== -1 && codeBlockEnd !== -1 && codeBlockStart < codeBlockEnd) {
        const codeContent = jsonString.substring(codeBlockStart + 3, codeBlockEnd).trim();
        const firstNewline = codeContent.indexOf("\n");
        if (firstNewline !== -1 && !codeContent.substring(0, firstNewline).includes("{")) {
          jsonString = codeContent.substring(firstNewline + 1).trim();
        } else {
          jsonString = codeContent;
        }
      }
    }
  }

  if (!jsonString.startsWith("{")) {
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }

  jsonString = jsonString.replace(/\/\/.*$/gm, "").trim();

  console.log("Extracted JSON string:", jsonString.substring(0, 100) + "...");

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
    console.log("JSON parse failed. Full extracted string:", jsonString);
    throw new Error(
      "Failed to parse Groq output: " + err.message + "\nExtracted JSON:\n" + jsonString
    );
  }
}
