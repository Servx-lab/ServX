import { useState, useMemo, useEffect } from 'react';
import { DatabaseType } from './types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Database, RefreshCw, Table as TableIcon, Loader2, Trash2, AlertTriangle, HardDrive } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import AddDatabaseForm from './AddDatabaseForm';
import { DatabaseLogo } from './DatabaseLogo';
import DataGrid from './DataGrid';
import { StatsPanel } from './StatsPanel';
import apiClient from '@/lib/apiClient';

interface DatabaseControllerProps {
    initialSource?: DatabaseType;
}

export const DatabaseController = ({ initialSource }: DatabaseControllerProps) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(initialSource || null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Explorer State
  const [databases, setDatabases] = useState<{name: string; sizeOnDisk: number}[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [collections, setCollections] = useState<{name: string; type: string; rowCount?: number}[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [explorerDocuments, setExplorerDocuments] = useState<any[]>([]);
  
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Delete Connection State
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const initiateDelete = (e: React.MouseEvent, option: any) => {
      e.stopPropagation(); 
      setDeleteTarget(option);
      setConfirmDelete(false);
  };

  const executeDelete = async () => {
      if (!deleteTarget || !confirmDelete) return;
      setIsDeleting(true);
      try {
          await apiClient.delete(`/connections/${deleteTarget.id}`);
          toast({ title: "Connection Deleted" });
          fetchConnections();
          if (selectedSource === deleteTarget.id) {
              setSelectedSource(null);
          }
          setDeleteTarget(null);
      } catch (err) {
          toast({ title: "Error", description: "Failed to delete connection.", variant: "destructive" });
      } finally {
          setIsDeleting(false);
      }
  };

  const loadDatabases = async (connectionId: string) => {
      setLoadingDatabases(true);
      setDatabases([]);
      setSelectedDatabase(null);
      setCollections([]); 
      setSelectedCollection(null);
      setExplorerDocuments([]);

      try {
        const res = await apiClient.get(`/db/explore/databases?connectionId=${connectionId}`);
        setDatabases(res.data.databases || []);
      } catch(err) {
          toast({ title: "Error", description: "Failed to explore databases.", variant: "destructive" });
      } finally {
          setLoadingDatabases(false);
      }
  };

  const handleSourceSelect = async (option: any) => {
      setSelectedSource(option.id);
      setSelectedProvider(option.provider);
      loadDatabases(option.id);
  };

  const handleDatabaseSelect = async (dbName: string) => {
      setSelectedDatabase(dbName);
      setCollections([]);
      setSelectedCollection(null);
      setExplorerDocuments([]);
      setLoadingCollections(true);
      try {
          const res = await apiClient.get(`/db/explore/collections?connectionId=${selectedSource}&dbName=${encodeURIComponent(dbName)}`);
          // Adapters return an array of objects or strings, map to object here
          const normalized = (res.data.collections || []).map((c: any) => 
            typeof c === 'string' ? { name: c, type: 'table' } : c
          );
          setCollections(normalized);
      } catch(err) {
          toast({ title: "Error", description: "Failed to list collections.", variant: "destructive" });
      } finally {
          setLoadingCollections(false);
      }
  };

  const handleCollectionSelect = async (colName: string) => {
      if (!selectedSource || !selectedDatabase) return;
      
      setSelectedCollection(colName);
      setLoadingDocuments(true);
      try {
          const res = await apiClient.post(`/db/explore/documents`, { 
              connectionId: selectedSource,
              dbName: selectedDatabase, 
              collectionName: colName 
          });
          setExplorerDocuments(res.data.documents || []);
      } catch(err) {
          toast({ title: "Error", description: "Failed to query rows.", variant: "destructive" });
      } finally {
          setLoadingDocuments(false);
      }
  };

  const fetchConnections = async () => {
    try {
        setLoadingConnections(true);
        const res = await apiClient.get('/connections');
        setConnections(res.data);
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

  const HOSTING_PROVIDERS = ['vercel', 'render', 'railway', 'digitalocean', 'fly.io', 'aws'];

  const connectionOptions = useMemo(() => {
      const options: { id: string, label: string, provider: string }[] = [];

      connections
          .filter(conn => {
              const provider = (conn.provider || '').trim().toLowerCase();
              const name = (conn.name || '').trim().toLowerCase();
              return !HOSTING_PROVIDERS.includes(provider) && !name.includes('hosting');
          })
          .forEach(conn => {
              options.push({ 
                  id: conn._id, 
                  label: conn.name, 
                  provider: conn.provider
              });
          });

      return options;
  }, [connections]);


  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center gap-2 justify-end w-full">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="default" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Connection</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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

     <div className="flex flex-1 gap-6 overflow-hidden">
         {/* Right Sidebar: Connection Selection - kept on the left for DB controller natively? Let's keep it on the right to match layout context */}
         <div className="w-64 flex-none border-r pr-6 pt-1 hidden md:block overflow-y-auto no-scrollbar order-first">
             <div className="flex items-center justify-between mb-4 pr-2">
                 <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                     Connections
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
                {connectionOptions.map((option) => (
                    <div key={option.id} className="relative group/item">
                        <Button
                            variant={selectedSource === option.id ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-3 h-auto py-2 px-3 pr-8 ${selectedSource === option.id ? 'bg-secondary font-medium shadow-sm border-blue-500/20' : 'text-muted-foreground'}`}
                            onClick={() => handleSourceSelect(option)}
                        >
                            <div className="flex-shrink-0">
                                <DatabaseLogo type={option.provider} className="w-5 h-5" />
                            </div>
                            <span className="truncate text-sm">{option.label}</span>
                        </Button>
                        
                        <Button
                            variant="ghost" 
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => initiateDelete(e, option)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
         </div>

         {/* Center Content: Explorer */}
         <div className="flex-1 overflow-hidden h-full flex flex-col gap-0 border rounded-xl bg-card/50">
             {selectedSource ? (
                 <>
                     {/* Stats Panel */}
                     <StatsPanel connectionId={selectedSource} />
                     
                     {/* Database Selection Bar */}
                     <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 overflow-x-auto flex-none bg-muted/10">
                         <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mr-2 flex-shrink-0 flex items-center gap-1.5">
                            <HardDrive className="w-3 h-3" /> Databases
                            {loadingDatabases && <Loader2 className="h-3 w-3 animate-spin"/>}
                         </div>
                         {databases.map(db => (
                             <Button 
                                key={db.name} 
                                variant={selectedDatabase === db.name ? "secondary" : "outline"} 
                                size="sm" 
                                className={`h-7 px-3 text-xs flex-shrink-0 ${selectedDatabase === db.name ? 'bg-secondary font-medium shadow-sm' : 'text-muted-foreground border-border/50 bg-background/50'}`}
                                onClick={() => handleDatabaseSelect(db.name)}
                             >
                                 {db.name}
                             </Button>
                         ))}
                         {databases.length === 0 && !loadingDatabases && (
                             <span className="text-[11px] text-muted-foreground">No schemas/databases found.</span>
                         )}
                     </div>

                     <div className="flex flex-1 overflow-hidden">
                         {/* Collections Sidebar */}
                         {selectedDatabase && (
                             <div className="w-52 border-r overflow-y-auto pt-3 px-2 flex-none bg-muted/5">
                                 <div className="text-[10px] font-bold text-muted-foreground/60 mb-2 px-1 uppercase tracking-wider flex items-center justify-between">
                                    <span>Tables / Collections</span>
                                    {loadingCollections && <Loader2 className="h-3 w-3 animate-spin"/>}
                                 </div>
                                 <div className="flex flex-col gap-0.5">
                                     {collections.map(col => (
                                         <Button 
                                            key={col.name} 
                                            variant={selectedCollection === col.name ? "secondary" : "ghost"} 
                                            size="sm" 
                                            className={`justify-start h-8 px-2 text-xs ${selectedCollection === col.name ? 'bg-secondary font-medium' : 'text-muted-foreground'}`}
                                            onClick={() => handleCollectionSelect(col.name)}
                                         >
                                             <TableIcon className="w-3.5 h-3.5 mr-2 opacity-50 flex-shrink-0" />
                                             <span className="truncate" title={col.name}>{col.name}</span>
                                             {col.rowCount !== undefined && (
                                                <span className="ml-auto text-[9px] opacity-50 font-mono">{col.rowCount}</span>
                                             )}
                                         </Button>
                                     ))}
                                     {collections.length === 0 && !loadingCollections && (
                                         <div className="text-[11px] text-muted-foreground px-2 py-1">No collections.</div>
                                     )}
                                 </div>
                             </div>
                         )}

                         {/* Documents Viewer */}
                         <div className="flex-1 overflow-hidden h-full">
                             {selectedCollection ? (
                                 loadingDocuments ? (
                                     <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                                         <Loader2 className="h-4 w-4 animate-spin"/> Querying rows...
                                     </div>
                                 ) : (
                                     <DataGrid data={explorerDocuments} collectionName={selectedCollection} />
                                 )
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                     <Database className="h-12 w-12 opacity-20 mb-4" />
                                     <p className="text-sm">{!selectedDatabase ? 'Select a database' : 'Select a table to view data'}</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 bg-muted/10">
                     <Database className="h-16 w-16 opacity-20 mb-4 text-blue-500" />
                     <h3 className="text-lg font-medium text-foreground">Universal Database Controller</h3>
                     <p className="text-sm mt-2 max-w-md text-center opacity-80">
                         Select a connection from the sidebar to monitor live stats, view schemas, and query data directly from your database.
                     </p>
                 </div>
             )}
         </div>
     </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Connection?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the connection "<strong>{deleteTarget?.label}</strong>".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="flex items-start space-x-2 py-4">
                    <Checkbox id="confirm-delete" checked={confirmDelete} onCheckedChange={(c) => setConfirmDelete(c as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                         <Label htmlFor="confirm-delete" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I understand that this action is permanent.
                         </Label>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); executeDelete(); }} 
                        disabled={!confirmDelete || isDeleting}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete Connection
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};
