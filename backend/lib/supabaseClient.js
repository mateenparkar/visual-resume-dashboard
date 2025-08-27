import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export function getSupabaseForToken(accessToken) {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
