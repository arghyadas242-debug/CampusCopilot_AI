import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function Header({ title, showBack = true, actions, dark = true }) {
  const navigate = useNavigate();

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 ${
        dark
          ? "bg-navy-900 text-white"
          : "bg-white text-slate-900 border-b border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className={`p-1.5 rounded-lg transition-colors ${
              dark ? "hover:bg-white/10" : "hover:bg-slate-100"
            }`}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
