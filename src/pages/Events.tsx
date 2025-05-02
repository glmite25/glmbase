
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import EventCard from "@/components/EventCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Events = () => {
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
    },
    {
      id: "4",
      title: "Community Outreach",
      date: "July 15, 2023",
      time: "10:00 AM",
      location: "City Park",
      image: "https://images.unsplash.com/photo-1593113630400-ea4288922497?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
    },
    {
      id: "5",
      title: "Women's Fellowship",
      date: "July 20, 2023",
      time: "6:00 PM",
      location: "Fellowship Hall",
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1632&q=80"
    },
    {
      id: "6",
      title: "Men's Breakfast",
      date: "July 22, 2023",
      time: "8:00 AM",
      location: "Fellowship Hall",
      image: "https://images.unsplash.com/photo-1608354580875-30bd4168b351?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
    }
  ];

  // Sample special events
  const specialEvents = [
    {
      id: "7",
      title: "Summer Revival",
      date: "August 5-7, 2023",
      time: "7:00 PM",
      location: "Main Sanctuary",
      image: "https://images.unsplash.com/photo-1587778082149-bd5b1bf5d3fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
    },
    {
      id: "8",
      title: "Back to School Prayer Service",
      date: "August 20, 2023",
      time: "11:00 AM",
      location: "Main Sanctuary",
      image: "https://images.unsplash.com/photo-1629102978563-a752a0a3c258?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
    },
    {
      id: "9",
      title: "Church Anniversary Celebration",
      date: "September 10, 2023",
      time: "10:00 AM",
      location: "Main Sanctuary & Fellowship Hall",
      image: "https://images.unsplash.com/photo-1646463509176-3d9f9a6e5ca4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
    },
    {
      id: "10",
      title: "Missions Conference",
      date: "October 15-17, 2023",
      time: "Various Times",
      location: "Main Sanctuary",
      image: "https://images.unsplash.com/photo-1638032585088-fc1d1d596a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero
          title="Events Calendar"
          subtitle="Join us for worship, fellowship, and community outreach"
          backgroundImage="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1169&q=80"
        />

        {/* Events Tabs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList>
                  <TabsTrigger value="upcoming" className="text-lg px-6">Upcoming Events</TabsTrigger>
                  <TabsTrigger value="special" className="text-lg px-6">Special Events</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="upcoming">
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
              </TabsContent>

              <TabsContent value="special">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {specialEvents.map((event) => (
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
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Calendar Info */}
        <section className="py-16 bg-church-yellow/10">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Event Information</h2>
            <div className="prose prose-lg max-w-none">
              <p>
                Our church calendar is always full of opportunities to connect, grow, and serve. From regular weekly services to special events and outreach programs, there's something for everyone at Gospel Labour Ministry.
              </p>
              <p>
                Most events are open to the public unless otherwise noted. For specific information about an event, please contact the church office at (123) 456-7890 or email us at info@gospellabour.org.
              </p>
              <h3>Planning Your Visit</h3>
              <p>
                When attending an event at Gospel Labour Ministry for the first time, we recommend arriving 15 minutes early. Our welcome team will be happy to help you find your way around and answer any questions you might have.
              </p>
              <h3>Volunteer Opportunities</h3>
              <p>
                Many of our events rely on the support of volunteers. If you're interested in serving at any of our events, please let us know by filling out the volunteer form on our contact page.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
