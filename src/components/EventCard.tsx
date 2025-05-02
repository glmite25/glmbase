
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image?: string;
}

const EventCard = ({ id, title, date, time, location, image }: EventCardProps) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      {image && (
        <div className="w-full h-48 overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      )}
      
      <CardContent className="pt-6 pb-2">
        <h3 className="font-serif text-xl font-semibold mb-3 text-gray-900">{title}</h3>
        
        <div className="space-y-2 text-gray-600">
          <div className="flex items-center">
            <CalendarDays size={16} className="mr-2 text-church-red" />
            <span>{date}</span>
          </div>
          
          <div className="flex items-center">
            <Clock size={16} className="mr-2 text-church-blue" />
            <span>{time}</span>
          </div>
          
          <div className="flex items-center">
            <MapPin size={16} className="mr-2 text-church-red" />
            <span>{location}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 pb-6">
        <Link to={`/events/${id}`} className="w-full">
          <Button 
            variant="outline" 
            className="w-full border-church-blue text-church-blue hover:bg-church-blue hover:text-white"
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
