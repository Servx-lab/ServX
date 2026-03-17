import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { DatabaseController } from "@/components/Databases/DatabaseList";
import { DatabaseType } from "@/components/Databases/types";

const Databases = () => {
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get('source');
  
  return (
    <main className="flex-1 p-8 flex flex-col h-full overflow-hidden">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span>Dashboard</span>
          <span className="text-border">›</span>
          <span className="text-foreground">Universal Database Controller</span>
        </motion.div>

        {/* Title */}
        <div className="mb-8">
            <motion.h1
            className="text-3xl font-semibold text-foreground tracking-tight"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            >
            Data Sources
            </motion.h1>
            <motion.p 
                className="text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                Manage and analyze data from multiple connected sources.
            </motion.p>
        </div>

        {/* Controller Content */}
        <motion.div
            className="flex-1 overflow-auto pr-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
        >
            <DatabaseController key={sourceParam} initialSource={sourceParam as DatabaseType} />
        </motion.div>
    </main>
  );
};

export default Databases;
