import { User } from "lucide-react";

export default function StudentCard({ student, onClick, actions }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 ${
        onClick ? "cursor-pointer hover:border-teal-200 transition-colors" : ""
      }`}
    >
      <div className="w-12 h-12 bg-navy-800 rounded-full flex items-center justify-center flex-shrink-0">
        <User size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">
          {student.name}
        </p>
        <p className="text-xs text-slate-500">
          {student.id} • {student.department}
        </p>
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
