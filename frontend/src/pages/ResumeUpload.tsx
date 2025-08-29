import { useState } from "react";
import { supabase } from "../api/supabaseClient";

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage("You must be logged in to upload a resume.");
        return;
      }

      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("http://localhost:5001/api/resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(data.message || "Resume uploaded successfully!");
      setParsedData(data);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Resume</h2>
      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>
      {message && <p>{message}</p>}

      {parsedData && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Parsed Resume Data</h3>

          {parsedData.skills && parsedData.skills.length > 0 && (
            <>
              <h4>Skills</h4>
              <ul>
                {parsedData.skills.map((skill: string, idx: number) => (
                  <li key={idx}>{skill}</li>
                ))}
              </ul>
            </>
          )}

          {parsedData.education && parsedData.education.length > 0 && (
            <>
              <h4>Education</h4>
              <ul>
                {parsedData.education.map((edu: any, idx: number) => (
                  <li key={idx}>
                    {edu.institution} ({edu.period?.start_date} - {edu.period?.end_date || "Present"})
                  </li>
                ))}
              </ul>
            </>
          )}

          {parsedData.experiences && parsedData.experiences.length > 0 && (
            <>
              <h4>Experiences</h4>
              <ul>
                {parsedData.experiences.map((exp: any, idx: number) => (
                  <li key={idx}>
                    <strong>{exp.title}</strong> @ {exp.company} 
                    {exp.start_date && exp.end_date && ` (${exp.start_date} - ${exp.end_date})`}
                    {exp.description && <p>{exp.description}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
