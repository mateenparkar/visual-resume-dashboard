import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

interface Skill {
  id: string;
  skill_name: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced" | null;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string;
  skills: Skill[];
}

export default function ExperienceList() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Experience>>({});
  const [skillsData, setSkillsData] = useState<Record<string, Skill[]>>({});

  useEffect(() => {
    const fetchExperiences = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("experiences")
        .select(`
          *,
          experience_skills (
            skill: skills (*)
          )
        `)
        .eq("user_id", currentUser.id)
        .order("start_date", { ascending: false });

      if (error) return alert(error.message);

      const expWithSkills: Experience[] = (data || []).map((exp: any) => ({
        ...exp,
        skills: exp.experience_skills?.map((es: any) => es.skill).flat() || []
      }));

      setExperiences(expWithSkills);

      const skillsInit: Record<string, Skill[]> = {};
      expWithSkills.forEach(exp => (skillsInit[exp.id] = [...exp.skills]));
      setSkillsData(skillsInit);
    };

    fetchExperiences();
  }, []);

  const saveEdit = async (id: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!formData || !currentUser) return;

    try {
      const experienceUpdate = {
        title: formData.title,
        company: formData.company,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description
      };
      
      const { error: expError } = await supabase
        .from("experiences")
        .update(experienceUpdate)
        .eq("id", id);
      
      if (expError) {
        alert("Error saving experience: " + expError.message);
        return;
      }

      const updatedSkills = skillsData[id] || [];

      const { error: deleteError } = await supabase
        .from("experience_skills")
        .delete()
        .eq("experience_id", id);

      if (deleteError) {
        console.warn("Error removing old skills:", deleteError.message);
      }

      for (const skill of updatedSkills) {
        if (!skill.skill_name.trim()) continue; 

        const { data: skillData, error: skillError } = await supabase
          .from("skills")
          .upsert(
            [{ 
              skill_name: skill.skill_name.trim(), 
              proficiency: skill.proficiency, 
              user_id: currentUser.id 
            }],
            { onConflict: "user_id,skill_name" }
          )
          .select("id");

        if (skillError) {
          console.warn("Error upserting skill:", skillError.message);
          continue;
        }

        if (skillData && skillData.length > 0) {
          const { error: linkError } = await supabase
            .from("experience_skills")
            .insert({
              experience_id: id,
              skill_id: skillData[0].id,
            });

          if (linkError) {
            console.warn("Error linking skill to experience:", linkError.message);
          }
        }
      }

      setExperiences(experiences.map(exp => 
        exp.id === id ? { ...exp, ...formData, skills: skillsData[id] } : exp
      ));

      setEditingId(null);
      setFormData({});
      
    } catch (error) {
      alert("An unexpected error occurred while saving.");
      console.error("Save error:", error);
    }
  };

  const addSkill = (expId: string) => {
    const newSkill: Skill = { id: "", skill_name: "", proficiency: null };
    setSkillsData({ ...skillsData, [expId]: [...(skillsData[expId] || []), newSkill] });
  };

  const removeSkill = (expId: string, index: number) => {
    const updated = [...(skillsData[expId] || [])];
    updated.splice(index, 1);
    setSkillsData({ ...skillsData, [expId]: updated });
  };

  const updateSkill = (expId: string, index: number, field: keyof Skill, value: any) => {
    const updated = [...(skillsData[expId] || [])];
    updated[index] = { ...updated[index], [field]: value };
    setSkillsData({ ...skillsData, [expId]: updated });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">My Experiences</h2>

      {experiences.length === 0 && <p className="text-gray-500">No experiences found. Try uploading a resume!</p>}

      <div className="space-y-4">
        {experiences.map(exp => (
          <div key={exp.id} className="p-4 border rounded-lg shadow-sm">
            {editingId === exp.id ? (
              <div className="space-y-2">
                <input type="text" defaultValue={exp.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="border p-2 w-full rounded" />
                <input type="text" defaultValue={exp.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="border p-2 w-full rounded" />
                <div className="flex space-x-2">
                  <input type="date" defaultValue={exp.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="border p-2 rounded" />
                  <input type="date" defaultValue={exp.end_date || ""} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="border p-2 rounded" />
                </div>
                <textarea defaultValue={exp.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="border p-2 w-full rounded" />

                <div className="mt-2">
                  <h4 className="font-semibold">Skills</h4>
                  {(skillsData[exp.id] || []).map((skill, idx) => (
                    <div key={idx} className="flex space-x-2 items-center mb-1">
                      <input type="text" value={skill.skill_name} onChange={e => updateSkill(exp.id, idx, "skill_name", e.target.value)} className="border p-1 rounded w-40" placeholder="Skill name" />
                      <select value={skill.proficiency || ""} onChange={e => updateSkill(exp.id, idx, "proficiency", e.target.value || null)} className="border p-1 rounded">
                        <option value="">Select</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                      <button onClick={() => removeSkill(exp.id, idx)} className="px-2 py-1 bg-red-500 text-white rounded">Remove</button>
                    </div>
                  ))}
                  <button onClick={() => addSkill(exp.id)} className="mt-1 px-2 py-1 bg-green-500 text-white rounded">Add Skill</button>
                </div>

                <button onClick={() => saveEdit(exp.id)} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                <button onClick={() => setEditingId(null)} className="mt-2 px-3 py-1 ml-2 bg-gray-300 rounded">Cancel</button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold">{exp.title} @ {exp.company}</h3>
                <p className="text-sm text-gray-600">{new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} – {exp.end_date ? new Date(exp.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present"}</p>
                <p className="mt-2">{exp.description}</p>
                {exp.skills.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold">Skills:</h4>
                    <ul className="list-disc ml-5">
                      {exp.skills.map(skill => (
                        <li key={skill.id}>{skill.skill_name} {skill.proficiency ? `(${skill.proficiency})` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={() => { setEditingId(exp.id); setFormData(exp); }} className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded">Edit</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}