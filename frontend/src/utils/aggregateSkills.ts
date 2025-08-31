export type Skill = {
  id: string;
  skill_name: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced" | null;
};

export const aggregateSkills = (skills: Skill[]) => {
  const map = new Map<string, { skill_name: string; count: number }>();

  skills.forEach((skill) => {
    if (!map.has(skill.skill_name)) {
      map.set(skill.skill_name, { skill_name: skill.skill_name, count: 1 });
    } else {
      const existing = map.get(skill.skill_name)!;
      existing.count += 1;
      map.set(skill.skill_name, existing);
    }
  });

  return Array.from(map.values());
};
