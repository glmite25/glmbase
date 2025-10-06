import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    // Add scroll listener on mount
    window.addEventListener('scroll', handleScroll);
    
    // Clean up on unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img 
            src="/images/logo 2.png" 
            alt="Gospel Labour Ministry" 
            className={`transition-all duration-300 ${isScrolled ? 'h-16' : 'h-20'}`} 
          />
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
                  : "text-gray-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center space-x-4">
              <UserAvatar />
            </div>
          ) : (
            <Button
              className="bg-[#ff0000] rounded-none px-10 py-6 rounded hover:bg-[#ff0000]/90 text-white"
              onClick={() => navigate("/auth")}
            >
              Login
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button and User Avatar */}
        <div className="md:hidden flex items-center space-x-3">
          {user && <UserAvatar />}
          <button
            className="text-gray-50 focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {/* User section at top for mobile */}
            {user ? (
              <div className="border-b border-gray-200 pb-4 mb-2">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <UserAvatar />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">Logged in</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-b border-gray-200 pb-4 mb-2">
                <Button
                  className="bg-[#FF0000] hover:bg-[#FF0000]/90 text-white w-full"
                  onClick={() => {
                    navigate("/auth");
                    setIsMenuOpen(false);
                  }}
                >
                  Login
                </Button>
              </div>
            )}
            
            {/* Navigation items */}
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
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;