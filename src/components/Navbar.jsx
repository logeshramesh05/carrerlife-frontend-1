import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <nav className="navbar navbar-public">
        <Link className="navbar-brand" to="/">
          <span className="brand-symbol">C</span>
          <span>CareerLife</span>
        </Link>
        <div className="navbar-public-actions">
          <Link className="nav-quiet" to="/login">Sign in</Link>
          <Link className="nav-small-button" to="/register">Get started</Link>
        </div>
      </nav>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <nav className="navbar">
      <Link className="navbar-brand" to="/dashboard">
        <span className="brand-symbol">C</span>
        <span>CareerLife</span>
      </Link>

      <button className="navbar-toggle" aria-label="Open navigation" onClick={() => setOpen((o) => !o)}>☰</button>

      <div className={`navbar-links${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Overview</NavLink>
        <NavLink to="/interview" className={({ isActive }) => isActive ? "active" : ""}>Interview</NavLink>
        <NavLink to="/resumes" className={({ isActive }) => isActive ? "active" : ""}>Resumes</NavLink>
        <NavLink to="/suggestions" className={({ isActive }) => isActive ? "active" : ""}>Suggestions</NavLink>
      </div>

      <div className="navbar-user">
        <div className="navbar-avatar">{initial}</div>
        <span>{user.name}</span>
        <button className="nav-logout" onClick={handleLogout}>Sign out</button>
      </div>
    </nav>
  );
}
