import ExperienceForm from "../components/ExperienceForm";
import ExperienceList from "../components/ExperienceList";

export default function ExperiencesPage() {
  const userId = "4e0e6cbc-d955-423b-97be-f97acb7d6ad2";

  return (
    <div>
      <h1>My Experiences</h1>
      <ExperienceForm />
      <ExperienceList  />
    </div>
  );
}