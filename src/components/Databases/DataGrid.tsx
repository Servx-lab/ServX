import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, FileJson, Table as TableIcon } from 'lucide-react';

interface DataGridProps {
  data: any[];
  collectionName: string;
}

const DataGrid: React.FC<DataGridProps> = ({ data, collectionName }) => {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Database className="h-12 w-12 opacity-20 mb-4" />
        <p>No documents found in {collectionName}</p>
      </div>
    );
  }

  // Extract all unique keys from the first few documents to build columns
  const flatKeys = new Set<string>();
  data.slice(0, 50).forEach(doc => {
      Object.keys(doc).forEach(key => flatKeys.add(key));
  });
  const columns = Array.from(flatKeys);

  return (
    <div className="flex flex-col h-full bg-card rounded-md border shadow-sm overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/40">
        <div className="flex items-center gap-2">
           <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
             <Database className="h-4 w-4 text-[var(--orizon-teal)]" /> 
             {collectionName}
           </span>
           <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
             {data.length} docs (limited to 50)
           </span>
        </div>
        <div className="flex bg-muted rounded-md p-1 gap-1">
          <button 
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            title="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setViewMode('json')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'json' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            title="JSON Tree View"
          >
            <FileJson className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'table' ? (
          <ScrollArea className="h-full w-full">
             <div className="min-w-max h-full">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b shadow-sm">
                    <TableRow className="hover:bg-transparent border-b-primary/10">
                      {columns.map(col => (
                        <TableHead key={col} className="h-9 px-4 py-2 font-medium text-xs whitespace-nowrap text-[var(--orizon-teal)]">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((doc, i) => (
                      <TableRow key={i} className="hover:bg-accent/50 text-xs border-b border-border/50 transition-colors">
                        {columns.map(col => (
                          <TableCell key={`${i}-${col}`} className="px-4 py-2 max-w-[200px] truncate font-mono text-muted-foreground">
                            {doc[col] && typeof doc[col] === 'object' ? JSON.stringify(doc[col]) : String(doc[col] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </ScrollArea>
        ) : (
             <ScrollArea className="h-full w-full bg-[#0d1117] text-gray-300 p-4 font-mono text-xs">
               <pre>
                  {JSON.stringify(data, null, 2)}
               </pre>
             </ScrollArea>
        )}
      </div>
      
      {/* Footer Status Bar */}
      <div className="h-6 border-t bg-muted/20 px-3 flex items-center text-[10px] text-muted-foreground justify-between">
         <span>Read-only view</span>
         <span className="font-mono opacity-50">JSON Size: {new Blob([JSON.stringify(data)]).size} bytes</span>
      </div>
    </div>
  );
};

export default DataGrid;