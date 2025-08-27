import { supabase } from "../api/supabaseClient";

export default function Logout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("Logged out!");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
