const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  brand: 'bg-brand-100 text-brand-700',
};
export default function Badge({ variant = 'default', children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>;
}