import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-6xl font-bold text-brand-600">404</h1>
      <p className="text-slate-600 mt-2">The page you're looking for doesn't exist.</p>
      <Link className="btn-primary mt-6" to="/">Back to Home</Link>
    </div>
  );
}