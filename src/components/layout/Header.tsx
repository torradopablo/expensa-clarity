import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Logo } from "./ui/logo";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              ExpensaCheck
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/analizar"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/analizar")
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Analizar
            </Link>
            <Link
              to="/evolucion"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/evolucion")
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Evolución
            </Link>
            <Link
              to="/historial"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/historial")
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Historial
            </Link>
            <Link
              to="/comparar"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/comparar")
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Comparar
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7a2 2 0 002-2v6a2 2 0 002 2h-7a2 2 0 00-2-2v6a2 2 0 002 2z"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/analizar"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive("/analizar")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Analizar
              </Link>
              <Link
                to="/evolucion"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive("/evolucion")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Evolución
              </Link>
              <Link
                to="/historial"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive("/historial")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Historial
              </Link>
              <Link
                to="/comparar"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive("/comparar")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Comparar
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
