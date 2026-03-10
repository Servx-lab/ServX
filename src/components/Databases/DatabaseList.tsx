import { useState, useMemo, useEffect } from 'react';
import { DatabaseType, UniversalRecord } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Search, Filter, Eye, Plus, Database, RefreshCw, Table as TableIcon, Loader2 } from 'lucide-react';
import { QuickViewDrawer } from './QuickViewDrawer';
import { FileUpload } from './FileUpload';
import AddDatabaseForm from './AddDatabaseForm';
import { DatabaseLogo } from './DatabaseLogo';
import DataGrid from './DataGrid';

const MOCK_DATA: UniversalRecord[] = [
  {
    id: '1',
    source: 'Firebase',
    collection: 'users',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
    data: { name: 'Alice', email: 'alice@example.com', role: 'admin' }
  },
  {
    id: '1b',
    source: 'Firebase',
    collection: 'users',
    createdAt: '2024-03-03T09:00:00Z',
    updatedAt: '2024-03-03T09:30:00Z',
    data: { name: 'Bob', email: 'bob@example.com', role: 'user' }
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
    id: '2b',
    source: 'MongoDB',
    collection: 'logs',
    createdAt: '2024-03-02T12:35:00Z',
    updatedAt: '2024-03-02T12:35:00Z',
    data: { level: 'info', message: 'User logged in', service: 'auth', userId: 'usr_123' }
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
    id: '3b',
    source: 'MySQL',
    collection: 'products',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-03-05T09:20:00Z',
    data: { sku: 'PROD-456', price: 149.99, stock: 85 }
  },
  {
    id: '4',
    source: 'Supabase',
    collection: 'profiles',
    createdAt: '2024-02-20T14:45:00Z',
    updatedAt: '2024-02-28T16:10:00Z',
    data: { username: 'dev_master', bio: 'Full stack developer', avatar_url: 'https://github.com/u/1.png' }
  },
  {
    id: '4b',
    source: 'Supabase',
    collection: 'posts',
    createdAt: '2024-02-21T09:00:00Z',
    updatedAt: '2024-02-21T09:00:00Z',
    data: { title: 'Hello World', content: 'First post content...', author_id: 'user_1' }
  },
   {
    id: '5',
    source: 'AWS RDS',
    collection: 's3-objects',
    createdAt: '2024-03-08T11:00:00Z',
    updatedAt: '2024-03-08T11:00:00Z',
    data: { key: 'report-2024.pdf', size: 102450, bucket: 'reports-bucket' }
  },
  {
    id: '5b',
    source: 'AWS RDS',
    collection: 'dynamodb-items',
    createdAt: '2024-03-09T14:20:00Z',
    updatedAt: '2024-03-09T14:20:00Z',
    data: { pk: 'USER#123', sk: 'PROFILE', displayName: 'John Doe', plan: 'premium' }
  },
  {
    id: '6',
    source: 'PostgreSQL',
    collection: 'transactions',
    createdAt: '2024-03-10T08:00:00Z',
    updatedAt: '2024-03-10T08:05:00Z',
    data: { tx_id: 'tx_999', amount: 500.00, currency: 'USD', status: 'completed' }
  },
  {
    id: '7',
    source: 'Oracle',
    collection: 'employees',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T09:00:00Z',
    data: { emp_id: 1001, last_name: 'Smith', dept_id: 20, salary: 85000 }
  },
  {
    id: '8',
    source: 'Redis',
    collection: 'cache',
    createdAt: '2024-03-10T15:30:00Z',
    updatedAt: '2024-03-10T15:30:05Z',
    data: { key: 'session:xyz', ttl: 3600, value: '{"user_id": 42}' }
  },
  {
    id: '9',
    source: 'MariaDB',
    collection: 'comments',
    createdAt: '2024-03-05T11:15:00Z',
    updatedAt: '2024-03-05T11:20:00Z',
    data: { comment_id: 55, post_id: 102, content: 'Great article!', approved: true }
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
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Explorer State
  const [explorerMode, setExplorerMode] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [explorerDocuments, setExplorerDocuments] = useState<any[]>([]);
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  const handleSourceSelect = async (option: any) => {
      setSelectedSource(option.id);
      
      const isRealConnection = option.group === 'Your Connections';
      const isMongoDB = option.provider === 'MongoDB';

      if (isRealConnection && isMongoDB) {
          setExplorerMode(true);
          setLoadingExplorer(true);
          setCollections([]); 
          setSelectedCollection(null);
          setExplorerDocuments([]);

          try {
             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
             const res = await fetch(`${API_URL}/api/db/explore/collections?connectionId=${option.id}`);
             if (!res.ok) throw new Error('Failed to fetch collections');
             const data = await res.json();
             setCollections(data.collections || []);
          } catch(err) {
              console.error(err);
          } finally {
              setLoadingExplorer(false);
          }
      } else {
          setExplorerMode(false);
      }

      if (option.id === 'Google Sheets') {
        if(!showUpload) setShowUpload(true)
      } else {
        setShowUpload(false);
      }
  };

  const handleCollectionSelect = async (colName: string) => {
      if (!selectedSource || typeof selectedSource !== 'string') return;
      
      setSelectedCollection(colName);
      setLoadingExplorer(true);
      try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/db/explore/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  connectionId: selectedSource, 
                  collectionName: colName 
              })
          });
          if (!res.ok) throw new Error('Failed to fetch documents');
          const data = await res.json();
          setExplorerDocuments(data.documents || []);
      } catch(err) {
          console.error(err);
      } finally {
          setLoadingExplorer(false);
      }
  };

  const fetchConnections = async () => {
    try {
        setLoadingConnections(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/connections`);
        if (res.ok) {
            const data = await res.json();
            setConnections(data);
        }
    } catch (err) {
        console.error("Failed to fetch connections", err);
    } finally {
        setLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnectionAdded = () => {
      setIsAddDialogOpen(false);
      fetchConnections();
  };

  // Computed properties
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Source filter
      let sourceMatch = true;
      if (selectedSource !== 'All') {
          // Check if selectedSource is a provider name from mock (e.g. MongoDB) or connection ID
          const connection = connections.find(c => c._id === selectedSource);
          const targetProvider = connection ? connection.provider : selectedSource;
          
          if (record.source !== targetProvider && record.source !== selectedSource) {
              sourceMatch = false;
          }
      }
      if (!sourceMatch) return false;
      
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
  }, [records, selectedSource, searchQuery, connections]);

  const handleDataLoaded = (newRecords: UniversalRecord[]) => {
      setRecords(prev => [...prev, ...newRecords]);
      setSelectedSource('Google Sheets');
  };

  const currentDatabaseOptions = useMemo(() => {
      const options: { id: string, label: string, provider?: string, group: string }[] = [
          { id: 'All', label: 'All Databases', group: 'General' }
      ];

      // Add actual connections
      if (connections.length > 0) {
          connections.forEach(conn => {
              options.push({ 
                  id: conn._id, 
                  label: conn.name, 
                  provider: conn.provider,
                  group: 'Your Connections' 
              });
          });
      }

      // Add specific mock/demo sources if they aren't covered
      const demoSources = ['Firebase', 'MongoDB', 'Supabase', 'MySQL', 'AWS RDS', 'PostgreSQL', 'Oracle', 'Redis', 'MariaDB'];
      demoSources.forEach(src => {
           options.push({ id: src, label: `${src} (Demo)`, provider: src, group: 'Demo Databases' });
      });
      
      options.push({ id: 'Google Sheets', label: 'Google Sheets', provider: 'Google Sheets', group: 'Uploads' });

      return options;
  }, [connections]);


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
                        <DialogDescription>
                            Enter connection details to add a new database source.
                        </DialogDescription>
                    </DialogHeader>
                    <AddDatabaseForm onSuccess={handleConnectionAdded} />
                </DialogContent>
            </Dialog>
      </div>

     {/* Main Content Area with Left Sidebar */}
     <div className="flex flex-1 gap-6 overflow-hidden">
         {/* Left Sidebar: Database Selection */}
         <div className="w-64 flex-none border-r pr-6 pt-1 hidden md:block overflow-y-auto no-scrollbar">
             <div className="flex items-center justify-between mb-4 pr-2">
                 <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                     Databases
                 </div>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={fetchConnections}
                    disabled={loadingConnections}
                 >
                    <RefreshCw className={`h-3 w-3 ${loadingConnections ? 'animate-spin' : ''}`} />
                 </Button>
             </div>
             <div className="flex flex-col gap-1">
                {currentDatabaseOptions.map((option, index) => {
                    const isFirstInGroup = index > 0 && option.group !== currentDatabaseOptions[index - 1].group;
                    return (
                    <div key={option.id}>
                        {isFirstInGroup && (
                            <div className="text-[10px] font-bold text-muted-foreground/60 mb-2 mt-4 px-2 uppercase tracking-wider">
                                {option.group}
                            </div>
                        )}
                        <Button
                            variant={selectedSource === option.id ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-3 h-auto py-2 px-3 ${selectedSource === option.id ? 'bg-secondary font-medium shadow-sm' : 'text-muted-foreground'}`}
                            onClick={() => handleSourceSelect(option)}
                        >
                            <div className="flex-shrink-0">
                                <DatabaseLogo type={option.provider || option.id} className="w-5 h-5" />
                            </div>
                            <span className="truncate text-sm">{option.label}</span>
                        </Button>
                    </div>
                )})}
            </div>
         </div>

         {/* Right: Scrollable Content - Table */}
         {/* Right: Scrollable Content - Table or Explorer */}
         <div className="flex-1 overflow-hidden h-full pr-2">
            {explorerMode ? (
                 <div className="flex h-full gap-4">
                     {/* Collections Sidebar */}
                     <div className="w-48 border-r pr-2 overflow-y-auto no-scrollbar pt-2">
                         <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider flex items-center justify-between">
                            <span>Collections</span>
                            {loadingExplorer && <Loader2 className="h-3 w-3 animate-spin"/>}
                         </div>
                         <div className="flex flex-col gap-1">
                             {collections.map(col => (
                                 <Button 
                                    key={col} 
                                    variant={selectedCollection === col ? "secondary" : "ghost"} 
                                    size="sm" 
                                    className={`justify-start h-8 px-2 text-xs truncate ${selectedCollection === col ? 'bg-secondary font-medium' : 'text-muted-foreground'}`}
                                    onClick={() => handleCollectionSelect(col)}
                                 >
                                     <TableIcon className="w-3 h-3 mr-2 opacity-70" />
                                     <span className="truncate" title={col}>{col}</span>
                                 </Button>
                             ))}
                             {collections.length === 0 && !loadingExplorer && (
                                 <div className="text-xs text-muted-foreground p-2">No collections found.</div>
                             )}
                         </div>
                     </div>
                     
                     {/* Documents Explorer */}
                     <div className="flex-1 overflow-hidden h-full rounded-md border bg-card/50">
                         {selectedCollection ? (
                             loadingExplorer ? (
                                 <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                                     <Loader2 className="h-4 w-4 animate-spin"/> Loading data...
                                 </div>
                             ) : (
                                 <DataGrid data={explorerDocuments} collectionName={selectedCollection} />
                             )
                         ) : (
                             <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                 <Database className="h-12 w-12 opacity-20 mb-4" />
                                 <p>Select a collection to browse documents</p>
                             </div>
                         )}
                     </div>
                 </div>
            ) : (
                <div className="h-full overflow-y-auto no-scrollbar">
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
                                            {JSON.stringify(record.data || {})}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}
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
                                            <p>{selectedSource === 'All' ? 'No records found.' : 'No mock records available for this connection.'}</p>
                                            {selectedSource !== 'All' && selectedSource !== 'Google Sheets' && !['Firebase', 'MongoDB', 'Supabase', 'MySQL', 'AWS RDS', 'PostgreSQL', 'Oracle', 'Redis', 'MariaDB'].includes(selectedSource as string) && (
                                                <p className="text-xs text-muted-foreground/60 max-w-xs">
                                                    (Since this is a demo, we only have mock data for specific providers.)
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </div>
            )}
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
