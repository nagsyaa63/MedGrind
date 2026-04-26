import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/questions', label: 'Feed' },
    { to: '/questions/new', label: 'Add Question' },
    { to: '/questions/challenged', label: 'Challenged' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: `/profile/${user?._id}`, label: 'Profile' },
    ...(isAdmin ? [{ to: '/admin', label: '⚙ Admin', admin: true }] : []),
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/questions" className="text-xl font-bold text-indigo-600">MedGrind</Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm ${link.admin ? 'text-red-500 hover:text-red-700 font-medium' : 'text-gray-600 hover:text-indigo-600'}`}
            >
              {link.label}
            </Link>
          ))}
          <span className="text-sm text-indigo-600 font-medium">{user?.points || 0} pts</span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden p-2 text-gray-600 hover:text-indigo-600"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="block text-gray-600 hover:text-indigo-600 text-sm py-1"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-indigo-600 font-medium">{user?.points || 0} pts</span>
            <button onClick={() => { logout(); setMenuOpen(false); }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
}
