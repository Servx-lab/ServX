import { useState } from 'react';
import { DatabaseLogo } from './DatabaseLogo';

const AddDatabaseForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [dbName, setDbName] = useState('');
  const [dbType, setDbType] = useState('MongoDB');
  const [connectionString, setConnectionString] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const databaseTypes = ['MongoDB', 'MySQL', 'PostgreSQL', 'Supabase', 'Firebase', 'Oracle', 'AWS'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    try {
      const response = await fetch('http://localhost:5000/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbName, dbType, connectionString }),
      });

      if (!response.ok) {
        throw new Error('Failed to save connection');
      }

      setStatus({ type: 'success', message: 'Database connection saved successfully.' });
      setDbName('');
      setConnectionString('');
      // Reset to default type or keep selection? Keeping selection is usually friendlier.
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Error saving connection. Please check your inputs.' });
    }
  };

  return (
    <div className="border border-border bg-card p-6 shadow-sm w-full max-w-md">
      <h3 className="text-lg font-semibold text-foreground mb-5 uppercase tracking-wide">Add New Connection</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dbName" className="text-sm font-medium text-muted-foreground">
            Connection Name
          </label>
          <input
            id="dbName"
            type="text"
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-sm"
            placeholder="e.g. Production Cluster"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dbType" className="text-sm font-medium text-muted-foreground">
            Database Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {databaseTypes.map(type => (
               <button
                  key={type}
                  type="button"
                  onClick={() => setDbType(type)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-md border transition-all ${
                     dbType === type 
                     ? 'bg-primary/10 border-primary text-primary' 
                     : 'bg-background border-input hover:bg-secondary/50'
                  }`}
               >
                  <DatabaseLogo type={type} className="w-8 h-8" />
                  <span className="text-[10px] font-medium">{type}</span>
               </button>
            ))}
          </div>
          {/* Hidden select for compatibility if needed, or just use state directly */}
          <input type="hidden" name="dbType" value={dbType} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="connString" className="text-sm font-medium text-muted-foreground">
            Connection String / URI
          </label>
          <input
            id="connString"
            type="password"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-mono text-sm"
            placeholder="mongodb://..."
            required
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary rounded-sm transition-colors"
        >
          SAVE CONNECTION
        </button>

        {status && (
          <div
            className={`mt-1 p-3 text-sm font-medium border ${
              status.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                : 'bg-red-500/10 border-red-500/20 text-red-600'
            }`}
          >
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default AddDatabaseForm;
