import React, { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface Skill {
  id: string;
  skill_name: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced";
}

interface ExperienceSkill {
  skill: Skill;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  experience_skills: ExperienceSkill[];
}

interface SupabaseExperience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  experience_skills: {
    skills: Skill;
  }[];
}

interface TimelineExperience {
  title: string;
  company: string;
  start: Date;
  end: Date;
  startTime: number;
  endTime: number;
}

interface Gap {
  start: number;
  end: number;
  duration: number;
  type: 'gap';
}

interface Overlap {
  experience1: string;
  experience2: string;
  overlapStart: number;
  overlapEnd: number;
  type: 'overlap';
}

const GanttTimeline: React.FC<{ 
  experiences: TimelineExperience[], 
  gaps: Gap[], 
  overlaps: Overlap[] 
}> = ({ experiences, gaps }) => {
  if (experiences.length === 0) {
    return <div className="text-gray-500">No timeline data available</div>;
  }

  const minTime = Math.min(...experiences.map(exp => exp.startTime));
  const maxTime = Math.max(...experiences.map(exp => exp.endTime));
  const totalDuration = maxTime - minTime;
  
  const getTimelinePosition = (start: number, end: number) => {
    const left = ((start - minTime) / totalDuration) * 100;
    const width = ((end - start) / totalDuration) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  const yearMarkers = [];
  const startYear = new Date(minTime).getFullYear();
  const endYear = new Date(maxTime).getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1).getTime();
    if (yearStart >= minTime && yearStart <= maxTime) {
      const position = ((yearStart - minTime) / totalDuration) * 100;
      yearMarkers.push({ year, position });
    }
  }

  return (
    <div className="w-full" style={{ minWidth: '800px' }}>
      <div className="relative h-8 mb-4 border-b border-gray-200">
        {yearMarkers.map(({ year, position }) => (
          <div
            key={year}
            className="absolute text-sm text-gray-600 transform -translate-x-1/2"
            style={{ left: `${position}%`, top: '0' }}
          >
            {year}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {experiences.map((exp, index) => {
          const position = getTimelinePosition(exp.startTime, exp.endTime);
          const duration = Math.round((exp.endTime - exp.startTime) / (1000 * 60 * 60 * 24));
          
          const hasOverlap = experiences.some((otherExp, otherIndex) => 
            otherIndex !== index && 
            (exp.startTime < otherExp.endTime && exp.endTime > otherExp.startTime)
          );

          return (
            <div key={`${exp.title}-${exp.company}-${index}`} className="relative">
              <div className="text-sm font-medium mb-1 text-gray-700">
                {exp.title} @ {exp.company}
              </div>
              
              <div className="relative h-8 bg-gray-100 rounded">
                <div
                  className={`absolute h-full rounded flex items-center px-2 text-white text-xs font-medium ${
                    hasOverlap ? 'bg-blue-600 border-2 border-yellow-400' : 'bg-blue-500'
                  }`}
                  style={position}
                  title={`${exp.title} @ ${exp.company}\n${exp.start.toLocaleDateString()} - ${exp.end.toLocaleDateString()}\nDuration: ${duration} days`}
                >
                  <span className="truncate">
                    {duration}d
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {gaps.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium mb-2 text-orange-600">
              Career Gaps
            </div>
            <div className="relative h-6 bg-gray-100 rounded">
              {gaps.map((gap, index) => {
                const position = getTimelinePosition(gap.start, gap.end);
                return (
                  <div
                    key={index}
                    className="absolute h-full bg-orange-400 rounded flex items-center justify-center text-white text-xs font-medium"
                    style={position}
                    title={`Gap: ${new Date(gap.start).toLocaleDateString()} - ${new Date(gap.end).toLocaleDateString()}\nDuration: ${gap.duration} days`}
                  >
                    {gap.duration}d gap
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Experience</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 border-2 border-yellow-400 rounded"></div>
          <span>Overlapping Experience</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 rounded"></div>
          <span>Career Gap</span>
        </div>
      </div>
    </div>
  );
};

const TimelineSummary: React.FC<{ gaps: Gap[], overlaps: Overlap[] }> = ({ gaps, overlaps }) => (
  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
    <h3 className="font-semibold mb-2">Timeline Analysis</h3>
    
    {gaps.length > 0 && (
      <div className="mb-2">
        <h4 className="text-sm font-medium text-orange-600">Career Gaps:</h4>
        <ul className="text-sm text-gray-600">
          {gaps.map((gap, index) => (
            <li key={index}>
              {new Date(gap.start).toLocaleDateString()} - {new Date(gap.end).toLocaleDateString()} 
              ({gap.duration} days)
            </li>
          ))}
        </ul>
      </div>
    )}
    
    {overlaps.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-blue-600">Overlapping Experiences:</h4>
        <ul className="text-sm text-gray-600">
          {overlaps.map((overlap, index) => (
            <li key={index}>
              {overlap.experience1} overlaps with {overlap.experience2}
              <br />
              <span className="text-xs">
                ({new Date(overlap.overlapStart).toLocaleDateString()} - {new Date(overlap.overlapEnd).toLocaleDateString()})
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {gaps.length === 0 && overlaps.length === 0 && (
      <p className="text-sm text-green-600">No gaps or overlaps detected in your career timeline!</p>
    )}
  </div>
);

export default function Dashboard() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalSkills: number;
    totalCompanies: number;
    avgDuration: number;
    mostUsedSkill: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error fetching user:", userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("experiences")
        .select(
          `
          id, title, company, start_date, end_date,
          experience_skills (
            skills (
              id, skill_name, proficiency
            )
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching experiences:", error);
      } else {
        const typedData = data as unknown as SupabaseExperience[];
        const transformedData: Experience[] =
          typedData?.map((exp) => ({
            ...exp,
            experience_skills:
              exp.experience_skills?.map((es) => ({
                skill: es.skills,
              })) || [],
          })) || [];
        setExperiences(transformedData);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: experiences } = await supabase
        .from("experiences")
        .select("id, company, start_date, end_date")
        .eq("user_id", user.id);

      const { data: expSkills } = await supabase
        .from("experience_skills")
        .select("skill_id, experiences(id)")
        .in(
          "experience_id",
          experiences?.map((e) => e.id) || []
        );

      const { data: skills } = await supabase
        .from("skills")
        .select("id, skill_name")
        .eq("user_id", user.id);

      if (!experiences || !skills) return;

      const totalSkills = new Set(skills.map((s) => s.skill_name)).size;
      const totalCompanies = new Set(
        experiences.map((e) => e.company)
      ).size;

      const durations = experiences.map((e) => {
        const start = new Date(e.start_date);
        const end = e.end_date ? new Date(e.end_date) : new Date();
        return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      });
      const avgDuration =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

      const skillCount: Record<string, number> = {};
      expSkills?.forEach((es) => {
        const skill = skills.find((s) => s.id === es.skill_id);
        if (skill) {
          skillCount[skill.skill_name] = (skillCount[skill.skill_name] || 0) + 1;
        }
      });
      const mostUsedSkill =
        Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      setSummary({
        totalSkills,
        totalCompanies,
        avgDuration,
        mostUsedSkill,
      });
    };

    fetchSummary();
  }, []);

  const analyzeTimeline = () => {
    const sortedExperiences: TimelineExperience[] = experiences
      .map((exp) => ({
        title: exp.title,
        company: exp.company,
        start: new Date(exp.start_date),
        end: exp.end_date ? new Date(exp.end_date) : new Date(),
        startTime: new Date(exp.start_date).getTime(),
        endTime: exp.end_date ? new Date(exp.end_date).getTime() : Date.now(),
      }))
      .sort((a, b) => a.startTime - b.startTime);

    const gaps: Gap[] = [];
    for (let i = 1; i < sortedExperiences.length; i++) {
      const prevEnd = sortedExperiences[i - 1].endTime;
      const currentStart = sortedExperiences[i].startTime;
      
      const gapDays = (currentStart - prevEnd) / (1000 * 60 * 60 * 24);
      if (gapDays > 30) {
        gaps.push({
          start: prevEnd,
          end: currentStart,
          duration: Math.round(gapDays),
          type: 'gap'
        });
      }
    }

    const overlaps: Overlap[] = [];
    for (let i = 0; i < sortedExperiences.length - 1; i++) {
      const current = sortedExperiences[i];
      const next = sortedExperiences[i + 1];
      
      if (current.endTime > next.startTime) {
        overlaps.push({
          experience1: `${current.title} @ ${current.company}`,
          experience2: `${next.title} @ ${next.company}`,
          overlapStart: next.startTime,
          overlapEnd: Math.min(current.endTime, next.endTime),
          type: 'overlap'
        });
      }
    }

    return { experiences: sortedExperiences, gaps, overlaps };
  };

  if (loading) return <p>Loading dashboard...</p>;

  const allSkills: Skill[] = experiences.flatMap(
    (exp) =>
      exp.experience_skills
        ?.map((es) => es.skill)
        .filter((skill): skill is Skill => !!skill) || []
  );

  const skillFrequency: Record<string, number> = {};
  allSkills.forEach((s) => {
    if (s?.skill_name) {
      skillFrequency[s.skill_name] =
        (skillFrequency[s.skill_name] || 0) + 1;
    }
  });

  const barChartData = Object.entries(skillFrequency).map(
    ([name, count]) => ({
      skill: name,
      count,
    })
  );

  const proficiencyLevels = ["Beginner", "Intermediate", "Advanced"];
  const heatmapData = Object.values(
    allSkills
      .filter((skill) => skill?.skill_name && skill.proficiency)
      .reduce(
        (acc, skill) => {
          if (!acc[skill.skill_name]) {
            acc[skill.skill_name] = {
              id: skill.skill_name,
              data: proficiencyLevels.map((p) => ({
                x: p,
                y: 0,
              })),
            };
          }
          const levelIndex = acc[skill.skill_name].data.findIndex(
            (d) => d.x === skill.proficiency
          );
          if (levelIndex !== -1) {
            acc[skill.skill_name].data[levelIndex].y += 1;
          }
          return acc;
        },
        {} as Record<
          string,
          { id: string; data: { x: string; y: number }[] }
        >
      )
  );

  const { experiences: timelineExperiences, gaps, overlaps } = analyzeTimeline();

  return (
    <div className="p-6 space-y-12">
      <h1 className="text-2xl font-bold">Your Dashboard</h1>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Total Skills</h3>
            <p className="text-3xl font-bold text-blue-600">{summary.totalSkills}</p>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Companies Worked At</h3>
            <p className="text-3xl font-bold text-green-600">{summary.totalCompanies}</p>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Avg. Role Duration</h3>
            <p className="text-3xl font-bold text-purple-600">
              {summary.avgDuration.toFixed(1)} mo
            </p>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Most Used Skill</h3>
            <p className="text-2xl font-bold text-orange-600">
              {summary.mostUsedSkill || "N/A"}
            </p>
          </div>
        </div>
      )}

      {experiences.length === 0 ? (
        <p className="text-gray-500">
          No experiences found. Add some experiences to see your analytics!
        </p>
      ) : (
        <>
          <div className="h-80">
            <h2 className="text-xl mb-4">Skill Frequency</h2>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="skill" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">
                No skills data available for chart.
              </p>
            )}
          </div>

          <div className="h-96">
            <h2 className="text-xl mb-4">
              Skill vs Proficiency Heatmap
            </h2>
            {heatmapData.length > 0 ? (
              <ResponsiveHeatMap
                data={heatmapData}
                margin={{ top: 40, right: 60, bottom: 60, left: 80 }}
                valueFormat=">-.0f"
                axisTop={{
                  tickRotation: -30,
                }}
                axisRight={null}
                axisBottom={{
                  legend: "Proficiency",
                  legendPosition: "middle",
                  legendOffset: 40,
                }}
                axisLeft={{
                  legend: "Skills",
                  legendPosition: "middle",
                  legendOffset: -60,
                }}
                colors={{
                  type: "sequential",
                  scheme: "blues",
                }}
                emptyColor="#eeeeee"
              />
            ) : (
              <p className="text-gray-500">
                No skills data available for heatmap.
              </p>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl">Career Timeline</h2>
            
            {timelineExperiences.length > 0 ? (
              <>
                <TimelineSummary gaps={gaps} overlaps={overlaps} />

                <div className="h-96">
                  <h3 className="text-lg mb-4">Interactive Career Timeline</h3>
                  <div className="bg-white border rounded-lg p-4 overflow-x-auto">
                    <GanttTimeline 
                      experiences={timelineExperiences}
                      gaps={gaps}
                      overlaps={overlaps}
                    />
                  </div>
                </div>

                <div className="h-80">
                  <h3 className="text-lg mb-4">Experience Durations</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={timelineExperiences.map(exp => ({
                        name: `${exp.title} @ ${exp.company}`,
                        duration: exp.endTime - exp.startTime,
                        days: Math.round((exp.endTime - exp.startTime) / (1000 * 60 * 60 * 24))
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${Math.round(value / (1000 * 60 * 60 * 24))} days`}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Math.round(Number(value) / (1000 * 60 * 60 * 24))} days`,
                          'Duration'
                        ]}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar 
                        dataKey="duration" 
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-gray-500">
                No timeline data available.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}