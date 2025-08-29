import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth.js";
import { parseResumeWithGroq } from "../lib/groqParser.js";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", requireAuth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // parse structured data using the shared parser
    const structuredData = await parseResumeWithGroq(req.file);

    // save experiences to Supabase
    const supabase = req.supabase;
    if (structuredData.experiences.length > 0) {
      const { error } = await supabase
        .from("experiences")
        .insert(
          structuredData.experiences.map(exp => ({
            user_id: req.user.id,
            title: exp.title,
            company: exp.company,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description,
          }))
        );
      if (error) return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Resume parsed and experiences saved",
      skills: structuredData.skills,
      education: structuredData.education,
      experiences: structuredData.experiences,
    });
  } catch (err) {
    console.error("Resume parse error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
