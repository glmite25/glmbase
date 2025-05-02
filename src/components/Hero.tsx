
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface HeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  overlay?: boolean;
}

const Hero = ({
  title,
  subtitle,
  ctaText,
  ctaLink = "/",
  backgroundImage = "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80",
  overlay = true,
}: HeroProps) => {
  return (
    <div 
      className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {overlay && (
        <div className="absolute inset-0 bg-black/50 z-10"></div>
      )}
      
      <div className="container relative z-20 px-4 md:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow">
          {subtitle}
        </p>
        
        {ctaText && (
          <Link to={ctaLink}>
            <Button 
              size="lg" 
              className="bg-church-red hover:bg-church-red/90 text-white font-medium px-6"
            >
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Hero;
