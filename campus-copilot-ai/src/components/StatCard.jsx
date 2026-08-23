export default function StatCard({ value, label, icon: Icon, color = "bg-teal-500" }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}
        >
          {Icon && <Icon size={20} className="text-white" />}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
