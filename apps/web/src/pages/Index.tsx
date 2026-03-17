import { motion } from "framer-motion";
import FlowVisualization from "@/components/FlowVisualization";
import MetricCards from "@/components/MetricCards";

const Index = () => {
  return (
    <main className="flex-1 p-8 flex flex-col min-h-full">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span>Dashboard</span>
          <span className="text-border">›</span>
          <span className="text-foreground">Exposure Command Center</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl font-semibold text-foreground tracking-tight mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Exposure Command Center
        </motion.h1>

        {/* Dashboard Content */}
        <div className="flex-1 flex items-start gap-0 w-full">
          {/* Sources label */}
          <motion.div
            className="relative flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-sm text-muted-foreground mb-2 ml-16 tracking-widest uppercase">Sources</p>
            <div className="w-full" style={{ height: "600px" }}>
              <FlowVisualization />
            </div>
          </motion.div>

          {/* Right side metric cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MetricCards />
          </motion.div>
        </div>
    </main>
  );
};

export default Index;
