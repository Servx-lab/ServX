import { useState, useMemo } from 'react';
import { DatabaseType, UniversalRecord } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Eye, Plus, Database } from 'lucide-react';
import { QuickViewDrawer } from './QuickViewDrawer';
import { FileUpload } from './FileUpload';
import AddDatabaseForm from './AddDatabaseForm';
import { DatabaseLogo } from './DatabaseLogo';

const MOCK_DATA: UniversalRecord[] = [
// ... (keep mock data same)
  {
    id: '1',
    source: 'Firebase',
    collection: 'users',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
    data: { name: 'Alice', email: 'alice@example.com', role: 'admin' }
  },
  {
    id: '2',
    source: 'MongoDB',
    collection: 'logs',
    createdAt: '2024-03-02T12:30:00Z',
    updatedAt: '2024-03-02T12:30:00Z',
    data: { level: 'error', message: 'Connection timeout', service: 'auth' }
  },
  {
    id: '3',
    source: 'MySQL',
    collection: 'products',
    createdAt: '2024-01-15T08:15:00Z',
    updatedAt: '2024-03-05T09:20:00Z',
    data: { sku: 'PROD-123', price: 99.99, stock: 150 }
  },
  {
    id: '4',
    source: 'Supabase',
    collection: 'profiles',
    createdAt: '2024-02-20T14:45:00Z',
    updatedAt: '2024-02-28T16:10:00Z',
    data: { username: 'dev_master', bio: 'Full stack developer', avatar_url: 'https://...' }
  },
   {
    id: '5',
    source: 'AWS',
    collection: 's3-objects',
    createdAt: '2024-03-08T11:00:00Z',
    updatedAt: '2024-03-08T11:00:00Z',
    data: { key: 'report-2024.pdf', size: 102450, bucket: 'reports-bucket' }
  }
];

interface DatabaseControllerProps {
    initialSource?: DatabaseType;
}

export const DatabaseController = ({ initialSource }: DatabaseControllerProps) => {
  const [selectedSource, setSelectedSource] = useState<DatabaseType | 'All'>(initialSource || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<UniversalRecord[]>(MOCK_DATA);
  const [selectedRecord, setSelectedRecord] = useState<UniversalRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Computed properties
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Source filter
      if (selectedSource !== 'All' && record.source !== selectedSource) return false;
      
      // Text search
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      // Search in data keys and values
      const inData = Object.values(record.data).some(val => 
        String(val).toLowerCase().includes(searchLower)
      );
      // Search in collection name or ID
      const inMeta = record.collection.toLowerCase().includes(searchLower) || 
                     record.id.toLowerCase().includes(searchLower);
                     
      return inData || inMeta;
    });
  }, [records, selectedSource, searchQuery]);

  const handleDataLoaded = (newRecords: UniversalRecord[]) => {
      setRecords(prev => [...prev, ...newRecords]);
      setSelectedSource('Google Sheets');
  };

  const currentDatabaseOptions = [
      { id: 'All', label: 'All Databases' },
      { id: 'Firebase', label: 'Firebase' },
      { id: 'MongoDB', label: 'MongoDB' },
      { id: 'Supabase', label: 'Supabase' },
      { id: 'MySQL', label: 'MySQL' },
      { id: 'PostgreSQL', label: 'PostgreSQL' },
      { id: 'AWS', label: 'AWS' },
      { id: 'Oracle', label: 'Oracle' },
      { id: 'Google Sheets', label: 'Google Sheets' },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Controls - Just Search now */}
      <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search records..."
                className="pl-8 bg-background max-w-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
            <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="default" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Connection</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Connect New Database</DialogTitle>
                    </DialogHeader>
                    <AddDatabaseForm onSuccess={() => setIsAddDialogOpen(false)} />
                </DialogContent>
            </Dialog>
      </div>

     {/* Main Content Area with Right Sidebar */}
     <div className="flex flex-1 gap-6 overflow-hidden">
         {/* Left: Scrollable Content - Table */}
         <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            {/* Upload Area (Conditional) */}
            {showUpload && selectedSource === 'Google Sheets' && (
                <div className="mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
                    <FileUpload onDataLoaded={handleDataLoaded} onClose={() => setShowUpload(false)} />
                </div>
            )}

            {/* Main Table */}
            <div className="rounded-md border bg-card/50 backdrop-blur-sm">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead className="w-[120px]">Source</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Preview Data</TableHead>
                    <TableHead className="w-[150px]">Last Updated</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                        <TableRow key={record.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRecord(record)}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{record.id}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="font-normal border-primary/20 bg-primary/10 text-primary-foreground/90">
                                    {record.source}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{record.collection}</TableCell>
                            <TableCell className="max-w-[300px]">
                                <div className="truncate text-muted-foreground text-xs font-mono opacity-80">
                                    {JSON.stringify(record.data)}
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {new Date(record.updatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <Database className="h-8 w-8 opacity-20" />
                                    <p>No records found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
         </div>

         {/* Right Sidebar: Database Selection */}
         <div className="w-64 flex-none border-l pl-6 pt-1 hidden md:block overflow-y-auto no-scrollbar">
             <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                 Databases
             </div>
             <div className="flex flex-col gap-1">
                {currentDatabaseOptions.map(option => (
                    <Button
                        key={option.id}
                        variant={selectedSource === option.id ? "secondary" : "ghost"}
                        className={`justify-start gap-3 ${selectedSource === option.id ? 'bg-secondary font-medium shadow-sm' : 'text-muted-foreground'}`}
                        onClick={() => {
                            const newSource = option.id as DatabaseType | 'All';
                            setSelectedSource(newSource);
                            if (newSource === 'Google Sheets') {
                               if(!showUpload) setShowUpload(true)
                            } else {
                                setShowUpload(false);
                            }
                        }}
                    >
                        <DatabaseLogo type={option.id} className="w-8 h-8 flex-shrink-0" />
                        {option.label}
                    </Button>
                ))}
             </div>
         </div>

     </div>

      <QuickViewDrawer 
        record={selectedRecord} 
        isOpen={!!selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
      />
    </div>
  );
};
