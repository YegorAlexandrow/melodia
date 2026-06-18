import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AppRoutes } from "./routes";
import { useTheme } from "./theme";
import { getHealth } from "./api/client";

type HealthState = "loading" | "ok" | "err";

function HealthIndicator() {
  const [state, setState] = useState<HealthState>("loading");
  const [plants, setPlants] = useState<number | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setState(h.status === "ok" ? "ok" : "err");
        setPlants(h.plants);
      })
      .catch(() => setState("err"));
  }, []);

  const text =
    state === "loading"
      ? "проверка связи с бэкендом…"
      : state === "ok"
        ? `бэкенд на связи · заводов: ${plants}`
        : "бэкенд недоступен";

  return (
    <div className={`health ${state === "ok" ? "ok" : state === "err" ? "err" : ""}`}>
      <span className="dot" />
      <span>{text}</span>
    </div>
  );
}

export default function App() {
  const { theme, toggle, icon, label } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`app ${theme}`.trim()}>
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <NavLink to="/" className="wordmark">
            Фонотека
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Коллекция
            </NavLink>
            <NavLink
              to="/notes"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              Заметки
            </NavLink>
            <NavLink
              to="/stats"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              Статистика
            </NavLink>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-primary" onClick={() => navigate("/add")}>
            + Добавить пластинку
          </button>
          <button className="theme-toggle" onClick={toggle} aria-label="Переключить тему">
            {icon} {label}
          </button>
        </div>
      </header>

      <main>
        <AppRoutes />
        <div className="page" style={{ paddingTop: 0 }}>
          <HealthIndicator />
        </div>
      </main>
    </div>
  );
}
