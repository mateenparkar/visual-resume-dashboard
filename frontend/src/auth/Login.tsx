import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom"; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      alert("Logged in successfully!");
      navigate("/experiences"); 
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        placeholder="Email" 
        type="email"
        required
      />
      <input 
        type="password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        placeholder="Password" 
        required
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
      <p className="text-sm mt-4 text-center">
        Dont have an account?{" "}
        <Link to="/register" className="text-blue-500 underline">
        Register
        </Link>
        </p>

    </div>
  );
}