import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

export default function ExperienceList() {
  const [experiences, setExperiences] = useState<any[]>([]);

  useEffect(() => {
    const fetchExperiences = async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) return alert(error.message);
      setExperiences(data);
    };

    fetchExperiences();
  }, []);

  return (
    <div>
      <h2>My Experiences</h2>
      {experiences.map(exp => (
        <div key={exp.id}>
          <h3>{exp.title} @ {exp.company}</h3>
          <p>{exp.start_date} - {exp.end_date}</p>
          <p>{exp.description}</p>
        </div>
      ))}
    </div>
  );
}
