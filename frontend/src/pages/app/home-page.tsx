import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Users, Shield, Zap, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <motion.div whileHover={{ scale: 1.05 }} className="p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
    <Icon className="w-12 h-12 mb-4 text-primary" />
    <h3 className="mb-2 text-xl font-semibold">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </motion.div>
);

const HomePage: React.FC = () => (
  <div className="flex-grow overflow-y-auto p-4">
    <div className="container px-4 mx-auto">
      <section className="py-20 text-center">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 text-5xl font-bold leading-tight">
          Connect Instantly with MNK Chat
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="max-w-2xl mx-auto mb-8 text-xl text-muted-foreground">
          Experience seamless real-time communication with friends and family. Share messages, photos, and create lasting connections.
        </motion.p>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Link to={"login/"}>
            <Button size="lg" className="mr-4">
              Get Started <ChevronRight className="ml-2" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </motion.div>
      </section>

      <section className="py-20">
        <h2 className="mb-12 text-3xl font-bold text-center">Key Features</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={MessageSquare} title="Real-time Messaging" description="Send and receive messages instantly with our lightning-fast chat system." />
          <FeatureCard icon={Users} title="Group Chats" description="Create and manage group conversations with ease for team collaboration or social circles." />
          <FeatureCard icon={Shield} title="End-to-End Encryption" description="Your conversations are secure with our state-of-the-art encryption technology." />
          <FeatureCard icon={Zap} title="Fast & Reliable" description="Enjoy a smooth chatting experience with our optimized and reliable infrastructure." />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl p-8 mx-auto bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <h2 className="mb-6 text-3xl font-bold text-center">Join MNK Chat Today</h2>
          <p className="mb-8 text-center text-muted-foreground">Sign up now and start chatting with your friends and family in seconds!</p>
          <form className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <Input type="email" placeholder="Enter your email" className="w-full md:w-2/3" />
            <Button type="submit" size="lg" className="w-full md:w-auto">
              Get Started
            </Button>
          </form>
        </div>
      </section>
    </div>
  </div>
);

export default HomePage;
