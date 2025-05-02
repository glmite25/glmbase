
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import EventCard from "@/components/EventCard";
import SermonCard from "@/components/SermonCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Sample upcoming events
  const upcomingEvents = [
    {
      id: "1",
      title: "Sunday Worship Service",
      date: "Every Sunday",
      time: "9:00 AM & 11:00 AM",
      location: "Main Sanctuary",
      image: "https://images.unsplash.com/photo-1507036066871-b7e8032b3dea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1032&q=80"
    },
    {
      id: "2",
      title: "Bible Study",
      date: "Every Wednesday",
      time: "7:00 PM",
      location: "Fellowship Hall",
      image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
    },
    {
      id: "3",
      title: "Youth Night",
      date: "Every Friday",
      time: "6:30 PM",
      location: "Youth Center",
      image: "https://images.unsplash.com/photo-1523803326055-13445f69f610?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
    }
  ];

  // Sample recent sermons
  const recentSermons = [
    {
      id: "1",
      title: "Finding Peace in Troubled Times",
      speaker: "Pastor John Smith",
      date: "June 12, 2023",
      type: "video",
      image: "https://images.unsplash.com/photo-1616442373543-0a872d5f42bf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1033&q=80"
    },
    {
      id: "2",
      title: "The Power of Faith",
      speaker: "Pastor Sarah Johnson",
      date: "June 5, 2023",
      type: "audio",
      image: "https://images.unsplash.com/photo-1498146831523-fbe41acdc5ad?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80"
    },
    {
      id: "3",
      title: "Walking in Divine Grace",
      speaker: "Pastor Michael Williams",
      date: "May 29, 2023",
      type: "text",
      image: "https://images.unsplash.com/photo-1611281806384-c5f91cb86cb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1148&q=80"
    }
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero
          title="Welcome to Gospel Labour Ministry"
          subtitle="Join us as we spread God's love through worship, community, and service"
          ctaText="Join Us This Sunday"
          ctaLink="/about"
          backgroundImage="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80"
        />

        {/* Mission Statement */}
        <section className="py-16 bg-church-yellow/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Our Mission</h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto font-serif">
              "To spread the Gospel of Jesus Christ, make disciples of all nations, and serve our community with God's love."
            </p>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-xl font-bold mb-3 text-church-red">Worship</h3>
                <p className="text-gray-600">Connecting hearts to God through authentic, spirit-led worship experiences.</p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-xl font-bold mb-3 text-church-blue">Community</h3>
                <p className="text-gray-600">Building meaningful relationships and supporting one another in faith and life.</p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-xl font-bold mb-3 text-church-red">Service</h3>
                <p className="text-gray-600">Demonstrating God's love through compassionate service to our neighbors and world.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
              <Link to="/events" className="text-church-blue font-medium flex items-center hover:text-church-blue/80 transition-colors">
                View All <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  location={event.location}
                  image={event.image}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Recent Sermons */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Recent Sermons</h2>
              <Link to="/sermons" className="text-church-red font-medium flex items-center hover:text-church-red/80 transition-colors">
                View All <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSermons.map((sermon) => (
                <SermonCard
                  key={sermon.id}
                  id={sermon.id}
                  title={sermon.title}
                  speaker={sermon.speaker}
                  date={sermon.date}
                  type={sermon.type}
                  image={sermon.image}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 bg-church-blue text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Community</h2>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90">
              Be a part of our growing community of believers. Come worship with us this Sunday!
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/about">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-church-blue">
                  Learn More
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" className="bg-church-red hover:bg-church-red/90 text-white">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
