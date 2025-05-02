
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import SermonCard from "@/components/SermonCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const Sermons = () => {
  // Sample sermons
  const sermons = [
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
    },
    {
      id: "4",
      title: "Overcoming Challenges Through Prayer",
      speaker: "Pastor John Smith",
      date: "May 22, 2023",
      type: "video",
      image: "https://images.unsplash.com/photo-1536890274788-51c764dd33d9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id: "5",
      title: "The Beatitudes: Living a Blessed Life",
      speaker: "Pastor Sarah Johnson",
      date: "May 15, 2023",
      type: "audio",
      image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
    },
    {
      id: "6",
      title: "Building Strong Foundations",
      speaker: "Pastor Michael Williams",
      date: "May 8, 2023",
      type: "text",
      image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id: "7",
      title: "The Good Shepherd",
      speaker: "Pastor John Smith",
      date: "May 1, 2023",
      type: "video",
      image: "https://images.unsplash.com/photo-1489659639091-8b687bc4386e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1173&q=80"
    },
    {
      id: "8",
      title: "Living in God's Promises",
      speaker: "Pastor Sarah Johnson",
      date: "April 24, 2023",
      type: "audio",
      image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id: "9",
      title: "Serving with Humility",
      speaker: "Pastor Michael Williams",
      date: "April 17, 2023",
      type: "text",
      image: "https://images.unsplash.com/photo-1458449446800-6255178339bd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    }
  ] as const;

  // Filter sermons by type
  const videoSermons = sermons.filter((sermon) => sermon.type === "video");
  const audioSermons = sermons.filter((sermon) => sermon.type === "audio");
  const textSermons = sermons.filter((sermon) => sermon.type === "text");

  return (
    <div className="min-h-screen flex flex-col">

      <main className="flex-grow">
        {/* Hero Section */}
        <Hero
          title="Sermon Library"
          subtitle="Explore our collection of messages to deepen your faith and understanding"
          backgroundImage="https://images.unsplash.com/photo-1536893827774-411e1dc7c902?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
        />

        {/* Search Section */}
        <section className="py-10 bg-church-blue/10">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              <div className="flex gap-2">
                <Input
                  placeholder="Search sermons by title, speaker, or topic..."
                  className="border-church-blue/30 focus-visible:ring-church-blue"
                />
                <Button className="bg-church-red hover:bg-church-red/90 text-white">
                  <Search size={20} />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Sermon Tabs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList>
                  <TabsTrigger value="all" className="text-lg px-5">All</TabsTrigger>
                  <TabsTrigger value="video" className="text-lg px-5">Video</TabsTrigger>
                  <TabsTrigger value="audio" className="text-lg px-5">Audio</TabsTrigger>
                  <TabsTrigger value="text" className="text-lg px-5">Text</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sermons.map((sermon) => (
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
              </TabsContent>

              <TabsContent value="video">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videoSermons.map((sermon) => (
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
              </TabsContent>

              <TabsContent value="audio">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {audioSermons.map((sermon) => (
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
              </TabsContent>

              <TabsContent value="text">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {textSermons.map((sermon) => (
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
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Subscribe Section */}
        <section className="py-16 bg-church-yellow/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Never Miss a Message</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Subscribe to receive our latest sermons directly in your inbox every week.
            </p>

            <div className="max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Your email address"
                  type="email"
                  className="sm:flex-1"
                />
                <Button className="bg-church-blue hover:bg-church-blue/90 text-white">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Sermons;
