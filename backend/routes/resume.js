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

    let expIds = {};
    if (structuredData.experiences?.length > 0) {
      const { data: insertedExps, error: expError } = await supabase
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
        )
        .select("id,title");
      if (expError) return res.status(400).json({ error: expError.message });

      insertedExps.forEach(exp => {
        expIds[exp.title] = exp.id;
      });
    }

    let skillMap = {};
    structuredData.experiences.forEach(exp => {
      if (!exp.skills) return;
      exp.skills.forEach(skill => {
        skillMap[skill.skill_name] = skill;
      });
    });

    const skillArray = Object.values(skillMap);

    let skillIds = {};
    if (skillArray.length > 0) {
      const { data: insertedSkills, error: skillsError } = await supabase
        .from("skills")
        .upsert(
          skillArray.map(skill => ({
            user_id: req.user.id,
            skill_name: skill.skill_name,
            proficiency: skill.proficiency,
            source: skill.source || "resume",
          })),
          { onConflict: ["user_id", "skill_name"] }
        )
        .select("id,skill_name");
      if (skillsError) return res.status(400).json({ error: skillsError.message });

      insertedSkills.forEach(skill => {
        skillIds[skill.skill_name] = skill.id;
      });
    }

    for (const exp of structuredData.experiences) {
      const expId = expIds[exp.title];
      if (!exp.skills || !expId) continue;

      for (const skillObj of exp.skills) {
        const skillId = skillIds[skillObj.skill_name];
        if (!skillId) continue;

        await supabase.from("experience_skills").insert({
          experience_id: expId,
          skill_id: skillId,
        });
      }
    }

    res.json({
      message: "Resume parsed, experiences and skills saved, linked to each experience",
      skills: skillArray,
      education: structuredData.education,
      experiences: structuredData.experiences,
    });

  } catch (err) {
    console.error("Resume parse error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
