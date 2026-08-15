import { motion } from "framer-motion";
import FlowVisualization from "@/components/FlowVisualization";
import MetricCards from "@/components/MetricCards";
import { PageLayout } from "@/components/layout/PageLayout";

const Index = () => {
  return (
    <PageLayout
      title="Exposure Command Center"
      subtitle="Dashboard › Exposure Command Center"
      fullWidth={true}
    >
      <div className="flex flex-1 items-stretch gap-8 w-full">
        {/* Sources label */}
        <motion.div
          className="relative flex-1 min-h-0 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-sm text-gray-500 font-bold mb-4 tracking-widest uppercase">Sources</p>
          <div className="flex-1 w-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden min-h-[400px]">
            <FlowVisualization />
          </div>
        </motion.div>

        {/* Right side metric cards */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-[300px] shrink-0"
        >
          <MetricCards />
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default Index;
