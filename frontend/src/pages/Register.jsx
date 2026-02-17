import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    const userData = { name, email };

    login(userData);
    navigate("/");
  };

  return (
    <div className="page-container">

      <h2 className="page-title">Create Account</h2>

      <form className="card" onSubmit={handleRegister} style={{maxWidth:"420px"}}>

        <label>Name</label>
        <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />

        <label>Email</label>
        <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" className="input" value={password} onChange={(e)=>setPassword(e.target.value)} />

        <button className="btn" style={{marginTop:"12px"}}>
          Register
        </button>

      </form>

    </div>
  );
}

export default Register;