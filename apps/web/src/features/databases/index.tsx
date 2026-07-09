import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { DatabaseController } from "./DatabaseList";
import type { DatabaseType } from "./types";
import { PageLayout } from "@/components/layout/PageLayout";

const Databases = () => {
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get('source');

  return (
    <PageLayout 
      title="Data Sources" 
      subtitle="Manage and analyze data from multiple connected sources."
      fullWidth={true}
    >
        <motion.div
            className="flex-1 overflow-auto pr-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
        >
            <DatabaseController key={sourceParam} initialSource={sourceParam as DatabaseType} />
        </motion.div>
    </PageLayout>
  );
};

export default Databases;
