import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MetricCardProps {
  value: string;
  label: string;
  change: string;
  changePositive?: boolean;
  accentColor: "red" | "blue";
  delay: number;
}

const MetricCard = ({ value, label, change, changePositive = false, accentColor, delay }: MetricCardProps) => (
  <motion.div
    className="glass-card px-5 py-4 grid grid-cols-[4rem_1fr_auto] items-baseline gap-2"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <span className={`text-cyber-stat text-2xl ${accentColor === "red" ? "text-destructive" : "text-primary"}`}>
      {value}
    </span>
    <span className={`text-xs font-mono font-bold ${changePositive ? "text-emerald-400" : "text-destructive"}`}>
      {change}
    </span>
    <span className="text-muted-foreground text-sm font-medium">{label}</span>
  </motion.div>
);

const MetricCards = () => {
  return (
    <div className="flex flex-col gap-10 w-72 pt-10">
      {/* Active Cases */}
      <div>
        <motion.div
          className="flex items-center gap-2 mb-4 ml-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold text-foreground tracking-wide">Active Cases (595)</span>
        </motion.div>
        <div className="flex flex-col gap-4">
          <MetricCard value="62" label="Critical" change="+12.9%" changePositive={false} accentColor="red" delay={0.6} />
          <MetricCard value="318" label="Medium" change="-0.9%" changePositive={true} accentColor="red" delay={0.7} />
          <MetricCard value="215" label="Low" change="+3.5%" changePositive={false} accentColor="red" delay={0.8} />
        </div>
      </div>

      {/* Resolved Cases */}
      <div>
        <motion.div
          className="flex items-center gap-2 mb-4 ml-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground tracking-wide">Resolved Cases</span>
        </motion.div>
        <div className="flex flex-col gap-4">
          <MetricCard value="85" label="Confirmed" change="" accentColor="blue" delay={1.0} />
          <MetricCard value="176" label="Under Review" change="" accentColor="blue" delay={1.1} />
          <MetricCard value="51" label="Waiting For Review" change="" accentColor="blue" delay={1.2} />
        </div>
      </div>
    </div>
  );
};

export default MetricCards;
