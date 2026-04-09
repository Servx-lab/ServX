import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UniversalRecord } from "./types";
import { Badge } from "@/components/ui/badge";

interface QuickViewDrawerProps {
  record: UniversalRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewDrawer = ({ record, isOpen, onClose }: QuickViewDrawerProps) => {
  if (!record) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] border-l-border bg-card/95 backdrop-blur-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            Record Details
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {record.id}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Viewing record from {record.source} - {record.collection}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Metadata Section */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metadata</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Created At</span>
                  <span className="font-mono">{new Date(record.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Updated At</span>
                  <span className="font-mono">{new Date(record.updatedAt).toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-muted-foreground block text-xs">Source</span>
                    <span>{record.source}</span>
                </div>
              </div>
            </div>

            {/* Main Data JSON View */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Object</h4>
              <div className="relative rounded-lg border bg-slate-950 p-4 font-mono text-xs text-blue-100 overflow-x-auto">
                <pre>{JSON.stringify(record.data, null, 2)}</pre>
              </div>
            </div>
            
            {/* Key Value Table View */}
             <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fields</h4>
               <div className="rounded-md border">
                 {Object.entries(record.data).map(([key, value], i) => (
                    <div key={key} className={`flex border-b last:border-0 px-4 py-3 text-sm ${i % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'}`}>
                        <div className="w-1/3 font-medium text-muted-foreground truncate" title={key}>{key}</div>
                        <div className="w-2/3 break-all font-mono">{String(value)}</div>
                    </div>
                 ))}
               </div>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
