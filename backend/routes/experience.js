import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();


router.post("/", requireAuth, async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { title, company, startDate, endDate, description } = req.body;

    const insertData = {
      user_id: userId,
      title,
      company,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    const { data, error } = await supabase
      .from("experiences")
      .insert([insertData])
      .select()
      .single();
      
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data || []);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;