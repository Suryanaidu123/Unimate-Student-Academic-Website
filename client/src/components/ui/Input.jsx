export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input className="input" {...props} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}