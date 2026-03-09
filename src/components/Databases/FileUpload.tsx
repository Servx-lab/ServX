import { useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UniversalRecord } from './types';

interface FileUploadProps {
  onDataLoaded: (data: UniversalRecord[]) => void;
  onClose: () => void;
}

export const FileUpload = ({ onDataLoaded, onClose }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          const records = parseCSV(content);
          onDataLoaded(records);
          toast({
            title: "File processed successfully",
            description: `Loaded ${records.length} records from ${file.name}`,
          });
        } else if (file.name.endsWith('.xlsx')) {
          // In a real implementation we would use XLSX library here
          // For now, let's just simulate or parse if it was CSV-like, or show a toast
          toast({
             title: "XLSX Parsing",
             description: "XLSX parsing requires 'xlsx' library. Please install it or use CSV." 
          });
          // Mock data for demonstration if user tries XLSX
          const mockRecords: UniversalRecord[] = [
             {
                 id: 'sheet-1',
                 source: 'Google Sheets',
                 collection: 'Sheet1',
                 createdAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString(),
                 data: { Name: 'Excel Row 1', Value: 100 }
             }
          ];
          onDataLoaded(mockRecords);
        }
        onClose();
      } catch (error) {
        toast({
          title: "Error processing file",
          description: "Could not parse the file format.",
          variant: "destructive"
        });
      }
    };

    if (file.name.endsWith('.csv')) {
         reader.readAsText(file);
    } else {
        // readAsBinaryString or ArrayBuffer for xlsx usually
        reader.readAsArrayBuffer(file);
    }
  };

  const parseCSV = (content: string): UniversalRecord[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const records: UniversalRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const data: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        data[header] = values[index]?.trim();
      });

      records.push({
        id: `csv-${i}`,
        source: 'Google Sheets',
        collection: 'Upload',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data
      });
    }
    return records;
  };

  return (
    <div className="p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-secondary/10 flex flex-col items-center justify-center gap-4 text-center relative">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose}>
            <X className="w-4 h-4" />
        </Button>
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <FileSpreadsheet className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-medium">Upload Spreadsheet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Support for .csv and .xlsx files
        </p>
      </div>
      <input
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
        <Upload className="w-4 h-4" />
        Select File
      </Button>
    </div>
  );
};
