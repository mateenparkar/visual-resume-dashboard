import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

export default function SkillsList() {
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching skills:", error.message);
        return;
      }

      setSkills(data || []);
    };

    fetchSkills();
  }, []);

  if (!skills.length) {
    return <p>No skills found. Upload a resume to populate skills.</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">My Skills</h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            {skill.name}
          </span>
        ))}
      </div>
    </div>
  );
}
