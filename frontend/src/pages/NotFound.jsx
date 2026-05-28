import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-8xl font-black text-white/10 leading-none">404</h1>
      <h2 className="mt-4 text-2xl font-black text-white">Page not found</h2>
      <p className="mt-3 text-sm text-slate-500 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-8 text-indigo-400 font-bold text-sm hover:text-indigo-300">
        Back to Dashboard
      </Link>
    </div>
  );
}
