import ExperienceForm from "../components/ExperienceForm";
import ExperienceList from "../components/ExperienceList";
import {useAuth} from "../auth/AuthProvider";
export default function ExperiencesPage() {
  const logout = useAuth().logout;
  return (
    <div>
      <h1>My Experiences</h1>
      <button onClick={() => logout()}>Logout</button>

      <ExperienceForm />
      <ExperienceList  />
    </div>
  );
}