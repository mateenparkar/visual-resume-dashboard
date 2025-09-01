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
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

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
      setLoading(false);
    };

    fetchExperiences();
  }, []);

  const saveEdit = async (id: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!formData || !currentUser) return;

    setSaveLoading(true);
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
    } finally {
      setSaveLoading(false);
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

  const startEdit = (exp: Experience) => {
    setEditingId(exp.id);
    setFormData(exp);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
    const originalSkills: Record<string, Skill[]> = {};
    experiences.forEach(exp => (originalSkills[exp.id] = [...exp.skills]));
    setSkillsData(originalSkills);
  };

  const getProficiencyColor = (proficiency: string | null) => {
    switch (proficiency) {
      case "Beginner": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Intermediate": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Advanced": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const end = endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present";
    return `${start} – ${end}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your experiences...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-6 transform transition-transform duration-500 hover:scale-110 hover:rotate-12">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zm0 0h-8m0 0v10a2 2 0 002 2h4a2 2 0 002-2V6" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            My Professional Journey
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Track and showcase your career milestones, skills, and achievements
          </p>
        </div>

        {experiences.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-all duration-500 hover:scale-110">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">No experiences yet</h3>
            <p className="text-gray-500 text-lg mb-8">Start building your professional timeline by uploading a resume!</p>
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto border border-white/20">
              <div className="text-left space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Upload your resume</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Automatically extract experiences</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Edit and enhance your details</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div 
              key={exp.id} 
              className="group transform transition-all duration-500 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500">
                {editingId === exp.id ? (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-800">Edit Experience</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600">Editing mode</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                          <input 
                            type="text" 
                            defaultValue={exp.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })} 
                            className="w-full px-4 py-3 bg-white/50 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white group-hover:border-gray-300" 
                            placeholder="e.g. Senior Software Engineer"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                          <input 
                            type="text" 
                            defaultValue={exp.company} 
                            onChange={e => setFormData({ ...formData, company: e.target.value })} 
                            className="w-full px-4 py-3 bg-white/50 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white group-hover:border-gray-300" 
                            placeholder="e.g. Google Inc."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <input 
                            type="date" 
                            defaultValue={exp.start_date} 
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
                            className="w-full px-4 py-3 bg-white/50 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white group-hover:border-gray-300" 
                          />
                        </div>
                        <div className="group">
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <input 
                            type="date" 
                            defaultValue={exp.end_date || ""} 
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })} 
                            className="w-full px-4 py-3 bg-white/50 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white group-hover:border-gray-300" 
                            placeholder="Leave empty if current"
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea 
                          defaultValue={exp.description} 
                          onChange={e => setFormData({ ...formData, description: e.target.value })} 
                          className="w-full px-4 py-3 bg-white/50 border-2 border-gray-200 rounded-xl transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white group-hover:border-gray-300 min-h-[120px] resize-none" 
                          placeholder="Describe your role, responsibilities, and achievements..."
                        />
                      </div>

                      <div className="bg-gray-50/50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-800">Skills & Technologies</h4>
                          <button 
                            onClick={() => addSkill(exp.id)} 
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Skill
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {(skillsData[exp.id] || []).map((skill, idx) => (
                            <div key={idx} className="flex items-center space-x-3 bg-white/60 p-4 rounded-xl border border-gray-200/50">
                              <div className="flex-1">
                                <input 
                                  type="text" 
                                  value={skill.skill_name} 
                                  onChange={e => updateSkill(exp.id, idx, "skill_name", e.target.value)} 
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                                  placeholder="e.g. React, Python, AWS..."
                                />
                              </div>
                              <div className="w-36">
                                <select 
                                  value={skill.proficiency || ""} 
                                  onChange={e => updateSkill(exp.id, idx, "proficiency", e.target.value || null)} 
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                  <option value="">Select Level</option>
                                  <option value="Beginner">Beginner</option>
                                  <option value="Intermediate">Intermediate</option>
                                  <option value="Advanced">Advanced</option>
                                </select>
                              </div>
                              <button 
                                onClick={() => removeSkill(exp.id, idx)} 
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200/50">
                        <button 
                          onClick={cancelEdit} 
                          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500/20"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => saveEdit(exp.id)} 
                          disabled={saveLoading}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center"
                        >
                          {saveLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                          {exp.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-gray-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                            </svg>
                            <span className="font-medium">{exp.company}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDateRange(exp.start_date, exp.end_date)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => startEdit(exp)} 
                        className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-yellow-500/50 group/edit"
                      >
                        <svg className="w-5 h-5 group-hover/edit:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>

                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">{exp.description}</p>
                    </div>

                    {exp.skills.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Skills & Technologies
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {exp.skills.map((skill, idx) => (
                            <div 
                              key={idx} 
                              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 hover:scale-105 ${getProficiencyColor(skill.proficiency)}`}
                            >
                              <span>{skill.skill_name}</span>
                              {skill.proficiency && (
                                <span className="ml-2 text-xs opacity-75">
                                  {skill.proficiency}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .group {
            animation: slideUp 0.6s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}