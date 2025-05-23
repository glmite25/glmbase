
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import EventCard from "@/components/EventCard";
import SermonCard from "@/components/SermonCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Events should be fetched from the database
  // For now, use real recurring events
  const upcomingEvents = [
    {
      id: "1",
      title: "Sunday Worship Service",
      date: "Every Sunday",
      time: "8:00 AM",
      location: "Upper Room",
      image: "https://images.unsplash.com/photo-1507036066871-b7e8032b3dea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1032&q=80"
    },
    {
      id: "2",
      title: "Wednesday Joint Auxano",
      date: "Every Wednesday",
      time: "4:00 PM",
      location: "Upper Room",
      image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
    }
  ];

  // Sermons should be fetched from the database
  // For now, use an empty array
  const recentSermons = [] as const;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Hero
          title="Welcome to Gospel Labour Ministry"
          subtitle="Join us as we spread God's love through worship and service"
          ctaText="Join Us This Sunday"
          ctaLink="/about"
          backgroundImage="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80"
        />  <div className="bg-white py-16 px-4" data-aos="fade-up">
          {/* Right-aligned heading section */}
          <div className="max-w-6xl mx-auto mb-12 text-right" data-aos="fade-right">
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold text-black inline-block pb-2">
              This is Church!
            </h2>
            <div className="w-32 h-1 bg-[#ff0000] ml-auto"></div>
            <p className="text-lg text-gray-600 mt-4">
              Our mission is to inspire, uplift, and bring people closer to God through faith, love, and service.
            </p>
          </div>

          {/* Grid cards with embedded message */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 - Contains "I" */}
            <div
              className="border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              data-aos="zoom-in"
            >
              <img
                src="https://res.cloudinary.com/dsaqsxtup/image/upload/v1746371168/584_g8yxvz.jpg"
                alt="Worship"
                className="w-full h-48 object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2">Deep Worship</h3>
                <p className="text-gray-600 mb-4">
                  <span className="text-[#ff0000] font-bold">I</span>n our worship, we connect hearts to God through authentic spiritual experiences.
                </p>
                <button className="text-church-red font-medium px-0 py-1 hover:underline">
                  Learn more
                </button>
              </div>
            </div>

            {/* Card 2 - Contains "LOVE" */}
            <div
              className="border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              data-aos="zoom-in"
              data-aos-delay="100"
            >
              <img
                src="https://res.cloudinary.com/dsaqsxtup/image/upload/v1746373650/2149187035_zlg8tp.jpg"
                alt="Community"
                className="w-full h-48 object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2">Edifying Fellowship</h3>
                <p className="text-gray-600 mb-4">
                  We <span className="text-[#ff0000] font-bold">LOVE</span> building Christ-centered relationships that last eternally.
                </p>
                <button className="text-church-blue font-medium px-0 py-1 hover:underline">
                  Learn more
                </button>
              </div>
            </div>

            {/* Card 3 - Contains "IT" */}
            <div
              className="border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              data-aos="zoom-in"
              data-aos-delay="200"
            >
              <img
                src="https://res.cloudinary.com/dsaqsxtup/image/upload/v1746371305/2149008918_dlptqv.jpg"
                alt="Service"
                className="w-full h-48 object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2">Strong Service</h3>
                <p className="text-gray-600 mb-4">
                  When we serve others, <span className="text-[#ff0000] font-bold">IT</span> reflects God's compassion in action.
                </p>
                <button className="text-church-red font-medium px-0 py-1 hover:underline">
                  Learn more
                </button>
              </div>
            </div>

          </div>
        </div>


        {/* Call to Action */}
        <div className="bg-black py-24 px-4" data-aos="fade-up">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl text-white md:text-4xl font-light mb-12 tracking-wider" data-aos="fade-down">
              WE BELIEVE IN
            </h2>

            <div className="space-y-8 md:space-y-28">
              <h1 className="text-7xl md:text-9xl font-black text-gray-50 leading-tight" data-aos="fade-right">
                BIGGER
                <span className="text-[#ff0000]">.</span>
              </h1>

              <h1 className="text-6xl md:text-9xl font-black text-gray-50 leading-tight md:pl-20" data-aos="fade-left">
                STRONGER
                <span className="text-[#ff0000]">.</span>
              </h1>

              <h1 className="text-5xl md:text-9xl font-black text-gray-50 leading-tight md:pl-40" data-aos="fade-right">
                FASTER
                <span className="text-[#ff0000]">.</span>
              </h1>
            </div>
          </div>
        </div>




        <section className="py-16 bg-white" data-aos="fade-up">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10" data-aos="fade-right">
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold text-black inline-block pb-2">Upcoming Events</h2>
              <Link to="/events" className="text-church-blue font-medium flex flex-shrink-0 items-center hover:text-church-blue/80 transition-colors">
                View All <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <div key={event.id} data-aos="zoom-in" data-aos-delay={index * 100}>
                  <EventCard
                    id={event.id}
                    title={event.title}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    image={event.image}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="relative py-32 bg-black overflow-hidden"
          data-aos="fade"
          data-aos-duration="1000"
        >
          {/* Diagonal red slash background - Animated */}
          <div
            className="absolute inset-0 z-0 overflow-hidden"
            data-aos="zoom-out"
            data-aos-duration="1500"
            data-aos-delay="200"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[#ff0000] transform -skew-y-6 origin-top-left opacity-10"></div>
          </div>

          {/* Floating elements with individual animations */}
          <div
            className="hidden md:block absolute top-1/4 right-20 w-16 h-16 rounded-full bg-[#ff0000] opacity-20 mix-blend-screen"
            data-aos="fade-left"
            data-aos-delay="800"
            data-aos-duration="1200"
          ></div>
          <div
            className="hidden md:block absolute bottom-1/3 left-10 w-24 h-24 rounded-full bg-[#ff0000] opacity-15 mix-blend-screen"
            data-aos="fade-right"
            data-aos-delay="600"
            data-aos-duration="1200"
          ></div>

          {/* Content */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              {/* Section header with MASSIVE animated text */}
              <div
                className="mb-20"
                data-aos="fade-up"
                data-aos-delay="300"
              >
                <h2
                  className="text-[#ff0000] text-8xl md:text-[180px] lg:text-[220px] font-black leading-[0.8] tracking-tighter"
                  data-aos="fade-right"
                  data-aos-delay="400"
                >
                  TAKE
                </h2>
                <h2
                  className="text-white text-8xl md:text-[180px] lg:text-[220px] font-black leading-[0.8] tracking-tighter -mt-8 md:-mt-16"
                  data-aos="fade-left"
                  data-aos-delay="500"
                >
                  IT
                </h2>
              </div>

              {/* Program details - Staggered animations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <p
                    className="text-[#ff0000] text-3xl md:text-4xl font-bold mb-6"
                    data-aos="fade-right"
                    data-aos-delay="600"
                  >
                    MONTHLY SPIRITUAL UPLIFTING
                  </p>
                  <p
                    className="text-white text-5xl md:text-6xl font-bold mb-8 leading-tight"
                    data-aos="fade-right"
                    data-aos-delay="700"
                  >
                    First Saturday <br />of Every Month
                  </p>
                  <div
                    className="h-2 w-32 bg-[#ff0000] mb-8"
                    data-aos="zoom-in-right"
                    data-aos-delay="800"
                  ></div>
                  <p
                    className="text-gray-300 text-xl md:text-2xl max-w-lg"
                    data-aos="fade-up"
                    data-aos-delay="900"
                  >
                    A transformative monthly gathering where we explore fresh spiritual themes,
                    deepen our faith, and equip believers for Kingdom impact.
                  </p>
                </div>

                <div className="space-y-8">
                  <div
                    className="pl-8 border-l-4 border-[#ff0000]"
                    data-aos="flip-up"
                    data-aos-delay="700"
                  >
                    <p className="text-white text-2xl uppercase tracking-widest mb-2">Current Theme</p>
                    <p className="text-[#ff0000] text-4xl md:text-5xl font-bold">"Excellence"</p>
                  </div>

                  <div
                    className="pl-8 border-l-4 border-[#ff0000]"
                    data-aos="flip-up"
                    data-aos-delay="800"
                  >
                    <p className="text-white text-2xl uppercase tracking-widest mb-2">Next Session</p>
                    <p className="text-white text-4xl md:text-5xl font-bold">May 3, 2025</p>
                    <p className="text-gray-400 text-xl mt-2">8:00 AM - 11:00 AM</p>
                  </div>

                  {/* CTA Button - Epic entrance */}
                  <div
                    data-aos="zoom-in-up"
                    data-aos-delay="1000"
                    data-aos-anchor-placement="top-bottom"
                  >
                    <button className="mt-12 px-16 py-6 bg-[#ff0000] text-white text-2xl font-black tracking-wider hover:bg-[#cc0000] transition-all transform hover:scale-105 shadow-lg shadow-[#ff0000]/30">
                      MARK YOUR CALENDAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex justify-center items-center py-32 h-screen bg-black overflow-hidden" data-aos="fade-up">
          {/* Video background */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-70"
            >
              <source src="/ydr-2025-teaser.mp4" type="video/mp4" />
              {/* Fallback image */}
              <img
                src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
                alt="YDR 2025"
                className="w-full h-full object-cover"
              />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center" data-aos="fade-down">
              {/* Subtitle */}
              <div className="text-[#FF0000] text-lg md:text-xl font-medium mb-6 tracking-widest" data-aos="fade-right">
                YOUNG DISCIPLE'S RETREAT
              </div>

              {/* Main Title */}
              <h2 className="text-6xl md:text-9xl lg:text-9xl font-bold text-white mb-8 leading-none tracking-tight" data-aos="zoom-in">
                YDR 2025
              </h2>

              {/* Tagline */}
              <p className="text-2xl md:text-3xl text-white/90 mb-12 max-w-3xl mx-auto" data-aos="fade-left">
                HOLYGHOST
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center" data-aos="fade-up">
                {/* <button className="px-8 py-4 bg-[#FF0000] text-white text-xl font-bold hover:bg-red-700 transition-colors">
            REGISTER NOW
          </button> */}
                <button className="px-8 py-4 bg-transparent border-2 border-white text-white text-xl font-bold hover:bg-white hover:text-black transition-colors">
                  WATCH HIGHLIGHTS
                </button>
              </div>
            </div>
          </div>

          {/* Scrolling indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2" data-aos="fade-up">
            <div className="animate-bounce w-6 h-10 border-2 border-white rounded-full flex justify-center">
              <div className="w-1 h-2 bg-white mt-2 rounded-full"></div>
            </div>
          </div>
        </section>


        {/* Recent Sermons */}
        <section className="py-24 bg-white" data-aos="fade-up">
          <div className="container mx-auto px-4">
            {/* Header with dramatic typography */}
            <div className="mb-16 text-center" data-aos="fade-down">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
                RECENT SERMONS
              </h2>
              <div className="w-24 h-1 bg-church-red mx-auto"></div>
            </div>

            {/* Sermon list with minimalist design */}
            <div className="max-w-4xl mx-auto space-y-16">
              {recentSermons.length > 0 ? (
                recentSermons.map((sermon, index) => (
                  <div key={sermon.id} className="group" data-aos="zoom-in" data-aos-delay={index * 100}>
                    <Link to={`/sermons/${sermon.id}`} className="block">
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Image with hover effect */}
                        <div className="w-full md:w-1/3 overflow-hidden">
                          <img
                            src={sermon.image}
                            alt={sermon.title}
                            className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>

                        {/* Content */}
                        <div className="w-full md:w-2/3">
                          <div className="text-church-red text-sm font-medium mb-2">
                            {sermon.type.toUpperCase()}
                          </div>
                          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                            {sermon.title}
                          </h3>
                          <div className="text-xl text-gray-600 mb-4">
                            {sermon.speaker}
                          </div>
                          <div className="text-gray-500">
                            {sermon.date}
                          </div>
                          <div className="mt-6">
                            <span className="inline-block border-b-2 border-church-red pb-1 text-church-red font-medium group-hover:border-church-blue group-hover:text-church-blue transition-colors">
                              Listen Now →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-12" data-aos="fade-up">
                  <p className="text-xl text-gray-600 mb-6">Our sermon library is being updated. Check back soon for the latest messages.</p>
                  <Link to="/sermons" className="inline-block text-church-red hover:text-church-red/80 font-medium">
                    Browse All Sermons →
                  </Link>
                </div>
              )}
            </div>

            {/* View All link */}
            <div className="mt-20 text-center" data-aos="fade-up">
              <Link
                to="/sermons"
                className="inline-block text-2xl font-medium text-gray-900 hover:text-church-red transition-colors border-b-2 border-transparent hover:border-church-red pb-1"
              >
                View All Sermons
              </Link>
            </div>
          </div>
        </section>



        <section className="py-28 bg-white text-gray-900" data-aos="fade-up">
          <div className="container mx-auto px-4 text-center">
            {/* Main Heading - Extra Large */}
            <h2
              className="text-5xl md:text-7xl lg:text-8xl TEXT-BLACK font-bold mb-8 leading-tight"
              data-aos="fade-down"
            >
              BECOME A MEMBER
            </h2>

            {/* Subheading - Large */}
            <p
              className="text-3xl md:text-4xl mb-16 max-w-4xl mx-auto leading-relaxed"
              data-aos="fade-right"
            >
              Be part of our vibrant family of believers. Worship with us this Sunday!
            </p>

            {/* Buttons - Extra Large */}
            <div
              className="flex flex-col sm:flex-row justify-center gap-6"
              data-aos="fade-up"
            >
              <Link to="/about">
                <Button
                  size="xl"
                  variant="outline"
                  className="text-2xl border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-12 py-6"
                >
                  LEARN MORE
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="xl"
                  className="bg-[#FF0000] hover:bg-church-red/90 text-white text-2xl px-12 py-6"
                >
                  CONTACT US
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
