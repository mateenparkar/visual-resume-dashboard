import jsPDF from "jspdf";

interface CareerSummary {
  totalSkills: number;
  totalCompanies: number;
  avgDuration: number;
  mostUsedSkill: string | null;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  experience_skills: Array<{
    skill: {
      skill_name: string;
      proficiency: "Beginner" | "Intermediate" | "Advanced";
    };
  }>;
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

interface ReportData {
  summary: CareerSummary;
  experiences: Experience[];
  gaps: Gap[];
  overlaps: Overlap[];
  skillFrequency: Record<string, number>;
}

export const downloadCareerReport = async (data: ReportData) => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  const addSectionHeader = (title: string, fontSize: number = 16) => {
    checkPageBreak(30);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    yPosition += fontSize + 10;
    
    doc.setLineWidth(1);
    doc.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
    yPosition += 10;
  };

  const addText = (text: string, fontSize: number = 12, style: string = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 1.2;
    
    checkPageBreak(lines.length * lineHeight);
    
    lines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    return yPosition;
  };

  const addTable = (headers: string[], rows: string[][], cellHeight: number = 25) => {
    const cellWidth = contentWidth / headers.length;
    const tableHeight = (rows.length + 1) * cellHeight;
    
    checkPageBreak(tableHeight);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    
    headers.forEach((header, i) => {
      doc.rect(margin + i * cellWidth, yPosition, cellWidth, cellHeight, 'FD');
      doc.text(header, margin + i * cellWidth + 5, yPosition + 15);
    });
    
    yPosition += cellHeight;
    
    doc.setFont("helvetica", "normal");
    doc.setFillColor(255, 255, 255);
    
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        doc.rect(margin + cellIndex * cellWidth, yPosition, cellWidth, cellHeight, 'S');
        
        const cellText = doc.splitTextToSize(cell, cellWidth - 10);
        if (cellText.length > 0) {
          doc.text(cellText[0], margin + cellIndex * cellWidth + 5, yPosition + 15);
        }
      });
      yPosition += cellHeight;
    });
    
    yPosition += 10;
  };

  const addKeyValue = (key: string, value: string) => {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${key}:`, margin, yPosition);
    
    doc.setFont("helvetica", "normal");
    const keyWidth = doc.getTextWidth(`${key}: `);
    doc.text(value, margin + keyWidth, yPosition);
    yPosition += 20;
  };

  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const title = "Career Insights Report";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, 100);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const date = `Generated on: ${new Date().toLocaleDateString()}`;
  const dateWidth = doc.getTextWidth(date);
  doc.text(date, (pageWidth - dateWidth) / 2, 130);
  
  yPosition = 200;

  addSectionHeader("Executive Summary", 18);
  
  addKeyValue("Total Skills", data.summary.totalSkills.toString());
  addKeyValue("Companies Worked At", data.summary.totalCompanies.toString());
  addKeyValue("Average Role Duration", `${data.summary.avgDuration.toFixed(1)} months`);
  addKeyValue("Most Used Skill", data.summary.mostUsedSkill || "N/A");
  
  yPosition += 20;

  addSectionHeader("Career Timeline");
  
  if (data.experiences.length > 0) {
    const experienceRows = data.experiences.map(exp => [
      exp.title,
      exp.company,
      new Date(exp.start_date).toLocaleDateString(),
      exp.end_date ? new Date(exp.end_date).toLocaleDateString() : "Present",
      exp.experience_skills.length.toString()
    ]);
    
    addTable(
      ["Position", "Company", "Start Date", "End Date", "Skills"],
      experienceRows
    );
  } else {
    addText("No experience data available.");
  }

  if (data.gaps.length > 0 || data.overlaps.length > 0) {
    addSectionHeader("Timeline Analysis");
    
    if (data.gaps.length > 0) {
      addText("Career Gaps:", 14, "bold");
      data.gaps.forEach(gap => {
        addText(`• ${new Date(gap.start).toLocaleDateString()} - ${new Date(gap.end).toLocaleDateString()} (${gap.duration} days)`);
      });
      yPosition += 10;
    }
    
    if (data.overlaps.length > 0) {
      addText("Overlapping Experiences:", 14, "bold");
      data.overlaps.forEach(overlap => {
        addText(`• ${overlap.experience1} overlaps with ${overlap.experience2}`);
        addText(`  Period: ${new Date(overlap.overlapStart).toLocaleDateString()} - ${new Date(overlap.overlapEnd).toLocaleDateString()}`, 10);
      });
      yPosition += 10;
    }
  } else {
    addSectionHeader("Timeline Analysis");
    addText("✓ No gaps or overlaps detected in your career timeline!", 12, "normal");
  }

  addSectionHeader("Skills Analysis");
  
  if (Object.keys(data.skillFrequency).length > 0) {
    addText("Most Frequently Used Skills:", 14, "bold");
    
    const sortedSkills = Object.entries(data.skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); 
    
    const skillRows = sortedSkills.map(([skill, count]) => [
      skill,
      count.toString(),
      `${((count / data.experiences.length) * 100).toFixed(1)}%`
    ]);
    
    addTable(
      ["Skill", "Usage Count", "% of Experiences"],
      skillRows
    );
  } else {
    addText("No skills data available for analysis.");
  }

  addSectionHeader("Skill Proficiency Breakdown");
  
  const proficiencyCount: Record<string, number> = {
    "Beginner": 0,
    "Intermediate": 0,
    "Advanced": 0
  };
  
  data.experiences.forEach(exp => {
    exp.experience_skills.forEach(skill => {
      if (skill.skill && skill.skill.proficiency) {
        proficiencyCount[skill.skill.proficiency]++;
      }
    });
  });
  
  if (proficiencyCount.Beginner > 0 || proficiencyCount.Intermediate > 0 || proficiencyCount.Advanced > 0) {
    const proficiencyRows = [
      ["Beginner", proficiencyCount.Beginner.toString()],
      ["Intermediate", proficiencyCount.Intermediate.toString()],
      ["Advanced", proficiencyCount.Advanced.toString()]
    ];
    
    addTable(
      ["Proficiency Level", "Number of Skills"],
      proficiencyRows
    );
  } else {
    addText("No proficiency data available.");
  }

  addSectionHeader("Detailed Experience Breakdown");
  
  if (data.experiences.length > 0) {
    data.experiences.forEach((exp, index) => {
      checkPageBreak(120);
      
      addText(`${index + 1}. ${exp.title} at ${exp.company}`, 14, "bold");
      
      const startDate = new Date(exp.start_date).toLocaleDateString();
      const endDate = exp.end_date ? new Date(exp.end_date).toLocaleDateString() : "Present";
      const duration = exp.end_date ? 
        Math.round((new Date(exp.end_date).getTime() - new Date(exp.start_date).getTime()) / (1000 * 60 * 60 * 24)) 
        : Math.round((new Date().getTime() - new Date(exp.start_date).getTime()) / (1000 * 60 * 60 * 24));
      
      addText(`Duration: ${startDate} - ${endDate} (${duration} days)`, 11);
      
      if (exp.experience_skills.length > 0) {
        const skillsByProficiency: Record<string, string[]> = {
          "Beginner": [],
          "Intermediate": [],
          "Advanced": []
        };
        
        exp.experience_skills.forEach(es => {
          if (es.skill && es.skill.skill_name && es.skill.proficiency) {
            skillsByProficiency[es.skill.proficiency].push(es.skill.skill_name);
          }
        });
        
        Object.entries(skillsByProficiency).forEach(([proficiency, skills]) => {
          if (skills.length > 0) {
            addText(`${proficiency} Skills: ${skills.join(", ")}`, 10);
          }
        });
      } else {
        addText("No skills recorded for this position.", 10);
      }
      
      yPosition += 15;
    });
  } else {
    addText("No detailed experience data available.");
  }

  addSectionHeader("Career Insights & Recommendations");
  
  const totalDays = data.experiences.reduce((total, exp) => {
    const start = new Date(exp.start_date).getTime();
    const end = exp.end_date ? new Date(exp.end_date).getTime() : new Date().getTime();
    return total + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);
  
  const avgJobLength = totalDays / data.experiences.length;
  const totalYears = totalDays / 365;
  
  addText("Key Career Metrics:", 14, "bold");
  addText(`• Total career span: ${Math.round(totalYears * 10) / 10} years`);
  addText(`• Average position length: ${Math.round(avgJobLength)} days (${Math.round(avgJobLength / 30)} months)`);
  addText(`• Career progression: ${data.experiences.length} positions across ${data.summary.totalCompanies} companies`);
  
  yPosition += 10;
  
  addText("Recommendations:", 14, "bold");
  
  if (data.gaps.length > 0) {
    addText("• Consider addressing career gaps in interviews by highlighting personal development, education, or project work during those periods.");
  }
  
  if (data.overlaps.length > 0) {
    addText("• Multiple concurrent positions show strong time management and multitasking abilities - highlight this in your professional summary.");
  }
  
  if (avgJobLength < 365) {
    addText("• Consider strategies for longer tenure in future roles to demonstrate stability and growth within organizations.");
  } else if (avgJobLength > 1095) {
    addText("• Your experience shows strong commitment and deep expertise development - leverage this for senior positions.");
  }
  
  if (data.summary.totalSkills > 15) {
    addText("• Your diverse skill set is a strong asset - consider creating a skills matrix to highlight technical breadth.");
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 80, pageHeight - 20);
    doc.text("Generated by Career Dashboard", margin, pageHeight - 20);
  }

  doc.save(`career_report_${new Date().toISOString().split('T')[0]}.pdf`);
};