import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

interface Experience {
  id:string;
  title:string;
  company:string;
  start_date:string;
  end_date:string | null;
  description:string;
}

export default function ExperienceList() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const[formData, setFormData] = useState<Partial<Experience>>({});

  useEffect(() => {
    const fetchExperiences = async () => {
      const user = supabase.auth.getUser();
      const { data: { user: currentUser } } = await user;
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", currentUser.id) 
        .order("start_date", { ascending: false });

      if (error) return alert(error.message);
      setExperiences(data || []);
    };

    fetchExperiences();
  }, []);

  const saveEdit = async(id:string) => {
    if(!formData) return;
    const{error} = await supabase.from("experiences").update(formData).eq("id", id);

    if(error){
      alert("Error saving experiences: " + error.message);
    }else{
      setExperiences(experiences.map(exp =>
        exp.id == id ? {...exp, ...formData} : exp
      ));
      setEditingId(null);
      setFormData({});
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">My Experiences</h2>

      {experiences.length === 0 && (
        <p className="text-gray-500">No experiences found. Try uploading a resume!</p>
      )}

      <div className="space-y-4">
        {experiences.map(exp => (
          <div key={exp.id} className="p-4 border rounded-lg shadow-sm">
            {editingId === exp.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={exp.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="border p-2 w-full rounded"
                />
                <input
                  type="text"
                  defaultValue={exp.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="border p-2 w-full rounded"
                />
                <div className="flex space-x-2">
                  <input
                    type="date"
                    defaultValue={exp.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <input
                    type="date"
                    defaultValue={exp.end_date || ""}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="border p-2 rounded"
                  />
                </div>
                <textarea
                  defaultValue={exp.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="border p-2 w-full rounded"
                />
                <button
                  onClick={() => saveEdit(exp.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 ml-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold">{exp.title} @ {exp.company}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} –{" "}
                  {exp.end_date
                    ? new Date(exp.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    : "Present"}
                </p>
                <p className="mt-2">{exp.description}</p>
                <button
                  onClick={() => {
                    setEditingId(exp.id);
                    setFormData(exp);
                  }}
                  className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
