import React, { useEffect, useState } from "react";
import { getDeviceUUID } from "@/lib/deviceUtils";
import { Switch } from "@/components/ui/switch";
import { Monitor, ShieldCheck } from "lucide-react";

const SecurityInfo = () => {
  const [deviceUUID, setDeviceUUID] = useState<string>("");
  const [isTrusted, setIsTrusted] = useState<boolean>(true);

  useEffect(() => {
    const fetchID = async () => {
      const id = await getDeviceUUID();
      setDeviceUUID(id);
    };
    fetchID();
  }, []);

  return (
    <div className="bg-[#0B0E14] border border-[#00C2CB]/20 rounded-lg p-3 my-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-[#00C2CB]" />
        <span className="text-xs font-semibold text-[#00C2CB] uppercase tracking-wider">
          Security Info
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
          <span className="flex items-center gap-1">
            <Monitor className="w-3 h-3" /> Hardware ID
          </span>
          <span className="font-mono text-[#00C2CB]/80">
            DEVICE-{deviceUUID.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-300">Trust This Device</span>
          <Switch
            checked={isTrusted}
            onCheckedChange={setIsTrusted}
            className="data-[state=checked]:bg-[#00C2CB]"
          />
        </div>
      </div>
    </div>
  );
};

export default SecurityInfo;
