import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "./Header";

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
    <div className="relative">
      {/* Header placed absolutely on top of the hero */}
      <div className="absolute top-0 left-0 w-full z-30">
        <Header />
      </div>
      
      <div 
        className="relative h-screen md:h-screen flex items-end justify-start mb-8 overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {overlay && (
          <div className="absolute inset-0 bg-black/50 z-10"></div>
        )}
        
        <div className="container max-w-7xl w-full relative z-20 px-4 md:px-6 lg:px-6 pb-16 text-left">
            <p className="text-sm md:text-base text-[#ff0000]/70 uppercase tracking-wide mb-2">
            Empowering Lives Through Faith
            </p>
          <h1 className="text-4xl md:text-5xl lg:text-8xl MD:pr-28 font-bold text-white mb-4 drop-shadow-lg">
            {title}
            {/* Welcome to Gospel Labour Ministry */}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow">
            {subtitle}
          </p>
          
          {/* {ctaText && (
            <Link to={ctaLink}>
                <Button 
                size="lg" 
                className="bg-transparent  text-white font-medium px-6 py-8  border-2 border-white rounded-none"
                >
                {ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </Link>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default Hero;