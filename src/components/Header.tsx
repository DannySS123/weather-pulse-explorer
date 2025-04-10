
import { Home, BarChart2, LightbulbIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-accent";
  };

  return (
    <header className="w-full border-b shadow-sm bg-background py-2 px-4 mb-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="font-bold text-xl mr-6">Astronomical Data Explorer</h1>
        </div>
        <nav className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            className={isActive("/")}
            asChild
          >
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            className={isActive("/visualize")}
            asChild
          >
            <Link to="/visualize" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">Visualize</span>
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            className={isActive("/conclusions")}
            asChild
          >
            <Link to="/conclusions" className="flex items-center gap-1">
              <LightbulbIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Conclusions</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
