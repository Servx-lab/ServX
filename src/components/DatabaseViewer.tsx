import { useState, useEffect } from 'react';
import { Search, AlertCircle, RefreshCw, Database } from 'lucide-react';

interface DatabaseRecord {
  _id?: string;
  [key: string]: any;
}

const DatabaseViewer = () => {
  const [data, setData] = useState<DatabaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/databases/mongodb/users');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      
      if (Array.isArray(jsonData)) {
        setData(jsonData);
      } else {
        // Handle case where response might be wrapped { data: [...] }
        setData([]);
        console.warn('API response was not an array:', jsonData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get dynamic headers from the first record, if available
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  // Filter logic
  const filteredData = data.filter((record) => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    
    // Check if ANY value in the record object contains the search term
    return Object.values(record).some((value) => 
      String(value).toLowerCase().includes(lowerTerm)
    );
  });

  const renderCellValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (value instanceof Date) return value.toLocaleDateString();
      return JSON.stringify(value); 
    }
    return String(value);
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground font-sans">
      {/* Header Section */}
      <div className="px-6 py-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center justify-between bg-card/30">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            MongoDB Explorer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Viewing records from <span className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">users</span> collection
          </p>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-secondary/50 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 md:w-80 transition-all"
                />
            </div>
            <button 
                onClick={fetchData} 
                disabled={loading}
                className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Refresh Data"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 relative">
        {loading && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
             <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p>Loading database records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-destructive gap-3 border border-destructive/20 bg-destructive/5 rounded-lg m-4">
             <AlertCircle className="w-8 h-8" />
             <p className="font-medium">Failed to load data</p>
             <p className="text-sm opacity-80">{error}</p>
             <button 
                onClick={fetchData}
                className="mt-2 px-4 py-2 bg-background border border-border rounded text-foreground text-sm hover:bg-accent transition-colors"
             >
                Try Again
             </button>
          </div>
        ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No records found in this collection.</p>
            </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-6 py-3 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length > 0 ? (
                    filteredData.map((row, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        {headers.map((header) => (
                          <td key={`${index}-${header}`} className="px-6 py-4 whitespace-nowrap text-card-foreground">
                            {header === '_id' ? (
                                <span className="font-mono text-xs text-muted-foreground">{renderCellValue(row[header])}</span>
                            ) : (
                                renderCellValue(row[header])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={headers.length} className="px-6 py-8 text-center text-muted-foreground">
                        No matches found for "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">
                <span>Showing {filteredData.length} of {data.length} records</span>
                {data.length > 0 && <span className="font-mono text-[10px] opacity-70">Source: MongoDB</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseViewer;