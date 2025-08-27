import { getSupabaseForToken } from "../lib/supabaseClient.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  
  try {
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    
    const supabase = getSupabaseForToken(token);
    
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        console.error("Token validation failed:", error);
        return res.status(401).json({ error: "Invalid token" });
      }
      
      req.user = { 
        id: user.id,
        email: user.email 
      };
      
      req.supabase = supabase;
      
      next();
    }).catch(err => {
      console.error("Auth error:", err);
      res.status(401).json({ error: "Invalid token" });
    });
    
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}