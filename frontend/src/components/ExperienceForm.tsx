import { useState } from "react";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../auth/AuthProvider"; 

export default function ExperienceForm() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log("Session:", session ? "exists" : "missing");
      console.log("Token (first 20 chars):", token?.substring(0, 20));
      
      if (!token) {
        alert("No access token found. Please login again.");
        return;
      }

      const res = await fetch("http://localhost:5001/api/experiences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          company,
          title,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        console.error("API Error:", json);
        alert(`Error: ${json.error || "Unknown error"}`);
        return;
      }
      
      alert("Experience added successfully!");
      
      setTitle("");
      setCompany("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      
    } catch (error) {
      console.error("Request failed:", error);
      alert("Failed to add experience. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please login to add experiences.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={company} 
        onChange={e => setCompany(e.target.value)} 
        placeholder="Company" 
        required 
      />
      <input 
        value={title} 
        onChange={e => setTitle(e.target.value)} 
        placeholder="Title" 
        required 
      />
      <input 
        type="date"
        value={startDate} 
        onChange={e => setStartDate(e.target.value)} 
        placeholder="Start Date" 
      />
      <input 
        type="date"
        value={endDate} 
        onChange={e => setEndDate(e.target.value)} 
        placeholder="End Date" 
      />
      <textarea 
        value={description} 
        onChange={e => setDescription(e.target.value)} 
        placeholder="Description" 
        rows={4}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Experience"}
      </button>
    </form>
  );
}