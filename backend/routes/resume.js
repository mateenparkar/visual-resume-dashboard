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

    const structuredData = await parseResumeWithGroq(req.file);
    const supabase = req.supabase;

    // Insert experiences
    if (structuredData.experiences?.length > 0) {
      const { error: expError } = await supabase
        .from("experiences")
        .insert(
          structuredData.experiences.map((exp) => ({
            user_id: req.user.id,
            title: exp.title,
            company: exp.company,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description,
          }))
        );
      if (expError) return res.status(400).json({ error: expError.message });
    }

    // Insert skills
    if (structuredData.skills?.length > 0) {
      const { error: skillsError } = await supabase
        .from("skills")
        .insert(
          structuredData.skills.map((skill) => ({
            user_id: req.user.id,
            skill_name: skill.skill_name,
            proficiency: skill.proficiency,
            source: skill.source || "resume",
          }))
        );
      if (skillsError) return res.status(400).json({ error: skillsError.message });
    }

    res.json({
      message: "Resume parsed and data saved",
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
