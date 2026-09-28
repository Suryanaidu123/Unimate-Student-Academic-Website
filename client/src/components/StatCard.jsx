export default function StatCard({ icon: Icon, label, value, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      {Icon && <div className={`p-3 rounded-lg ${colors[color]}`}><Icon size={20} /></div>}
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}