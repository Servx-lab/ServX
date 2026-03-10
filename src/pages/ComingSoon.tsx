import React from "react";
import Sidebar from "@/components/Sidebar";
import { Clock, Rocket, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ComingSoon = () => {
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 relative flex flex-col items-center justify-center p-8 ml-56">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px] mix-blend-screen" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center text-center max-w-2xl"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 cyber-glow-blue">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Soon</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-xl">
            We're working hard to bring you this feature. Our team is crafting something special that will enhance your experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
            <div className="glass-card p-6 flex flex-col items-center text-center rounded-xl border border-white/5 bg-white/5">
              <Clock className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-medium mb-1">In Development</h3>
              <p className="text-sm text-muted-foreground">This module is currently being built by our engineering team.</p>
            </div>
            <div className="glass-card p-6 flex flex-col items-center text-center rounded-xl border border-white/5 bg-white/5">
              <Sparkles className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-medium mb-1">Stay Tuned</h3>
              <p className="text-sm text-muted-foreground">Check back later for updates on this exciting new capability.</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ComingSoon;
