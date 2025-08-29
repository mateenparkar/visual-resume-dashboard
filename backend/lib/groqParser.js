import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import axios from "axios";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

// Helper function to convert date strings to PostgreSQL format
function formatDateForPostgres(dateString) {
  if (!dateString || dateString === 'null') return null;
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle "Month YYYY" format (e.g., "June 2024")
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
  
  // Handle "YYYY-MM" format
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    return `${dateString}-01`;
  }
  
  // If we can't parse it, return null
  console.warn(`Could not parse date: ${dateString}`);
  return null;
}

export async function parseResumeWithGroq(file) {
  // file: multer file object { buffer, mimetype, originalname }

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
- Include all technical skills mentioned
- DO NOT include any comments (// or /* */) in the JSON output
- Return only pure, valid JSON that can be parsed directly

Use this exact JSON structure:
{
  "skills": ["skill1", "skill2"],
  "education": [{"institution": "name", "period": "dates"}],
  "experiences": [{"title": "job title", "company": "company name", "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null", "description": "description"}]
}

Resume text:
${text}
`;

  const response = await axios.post(
    GROQ_CHAT_URL,
    {
      model: "llama3-8b-8192", // Changed from "gpt-4o-mini" to a Groq model
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

  // Extract JSON from markdown code blocks or other wrapper text
  let jsonString = rawOutput.trim();
  
  // Remove markdown code blocks if present
  if (jsonString.includes('```')) {
    // More flexible regex that handles code blocks with or without language identifiers
    const jsonMatch = jsonString.match(/```[a-zA-Z]*\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    } else {
      // Fallback: extract between first { and last } after ```
      const codeBlockStart = jsonString.indexOf('```');
      const codeBlockEnd = jsonString.lastIndexOf('```');
      if (codeBlockStart !== -1 && codeBlockEnd !== -1 && codeBlockStart < codeBlockEnd) {
        const codeContent = jsonString.substring(codeBlockStart + 3, codeBlockEnd).trim();
        // Remove any language identifier on the first line
        const firstNewline = codeContent.indexOf('\n');
        if (firstNewline !== -1 && !codeContent.substring(0, firstNewline).includes('{')) {
          jsonString = codeContent.substring(firstNewline + 1).trim();
        } else {
          jsonString = codeContent;
        }
      }
    }
  }
  
  // Final fallback: extract everything between first { and last }
  if (!jsonString.startsWith('{')) {
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }

  // Remove JSON comments (// comments) which are not valid in JSON
  jsonString = jsonString.replace(/\/\/.*$/gm, '').trim();

  // Debug logging
  console.log("Extracted JSON string:", jsonString.substring(0, 100) + "...");

  try {
    const parsedData = JSON.parse(jsonString);
    
    // Format dates for PostgreSQL
    if (parsedData.experiences) {
      parsedData.experiences = parsedData.experiences.map(exp => ({
        ...exp,
        start_date: formatDateForPostgres(exp.start_date),
        end_date: formatDateForPostgres(exp.end_date)
      }));
    }
    
    return parsedData;
  } catch (err) {
    console.log("JSON parse failed. Full extracted string:", jsonString);
    throw new Error("Failed to parse Groq output: " + err.message + "\nExtracted JSON:\n" + jsonString);
  }
}