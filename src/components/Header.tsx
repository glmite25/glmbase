
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperUser } = useAuth();

  console.log('Header rendering with:', {
    user: user ? 'User logged in' : 'No user',
    isAdmin,
    isSuperUser,
    email: user?.email
  });

  const navItems = [
    { name: "About", path: "/about" },
    { name: "Events", path: "/events" },
    { name: "Sermons", path: "/sermons" },
    { name: "Contact", path: "/contact" },
    { name: "Partnership", path: "/partnership" },
  ];



  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src="/images/logo.png" alt="Gospel Labour Ministry" className="h-12" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`hover-underline transition-colors py-2 ${
                location.pathname === item.path
                  ? "text-church-red font-medium"
                  : "text-gray-700"
              }`}
            >
              {item.name}
            </Link>
          ))}
          {user ? (
            <UserAvatar />
          ) : (
            <Button
              className="bg-church-blue hover:bg-church-blue/90 text-white"
              onClick={() => navigate("/auth")}
            >
              Login
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`py-2 px-4 rounded-md ${
                  location.pathname === item.path
                    ? "bg-gray-100 text-church-red font-medium"
                    : "text-gray-700"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <div className="flex flex-col items-center py-2">
                <UserAvatar />
              </div>
            ) : (
              <Button
                className="bg-church-blue hover:bg-church-blue/90 text-white w-full"
                onClick={() => {
                  navigate("/auth");
                  setIsMenuOpen(false);
                }}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
