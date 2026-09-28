import { Link } from 'react-router-dom';
export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <p className="text-slate-600 mt-2">You don't have permission to access this page.</p>
      <Link className="btn-primary mt-6" to="/">Go Home</Link>
    </div>
  );
}