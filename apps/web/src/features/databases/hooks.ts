import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ConnectionListItem, DbInfo, FirebaseUser } from './types';
import {
  getConnections,
  deleteConnection as apiDeleteConnection,
  exploreDatabases,
  exploreCollections,
  exploreDocuments,
  listFirebaseUsers,
  searchFirebaseUser,
} from './api';

/** Fetches all user connections on mount and exposes a `refetch` callback. */
export function useConnections() {
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setConnections(await getConnections());
    } catch (err) {
      console.error('Failed to fetch connections', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { connections, loading, refetch };
}

/** Returns a function that deletes a connection by id, with toast feedback. */
export function useDeleteConnection(onSuccess: () => void) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      try {
        await apiDeleteConnection(id);
        toast({ title: 'Connection Deleted', description: 'The database connection has been removed.' });
        onSuccess();
      } catch {
        toast({ title: 'Error', description: 'Failed to delete connection.', variant: 'destructive' });
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess, toast],
  );

  return { deleteConnection: handleDelete, isDeleting };
}

/** Fetches MongoDB databases whenever `connectionId` is non-null. */
export function useExploreDatabases(connectionId: string | null) {
  const [databases, setDatabases] = useState<DbInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectionId) {
      setDatabases([]);
      return;
    }
    setLoading(true);
    setDatabases([]);
    exploreDatabases(connectionId)
      .then((res) => setDatabases(res.databases))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connectionId]);

  return { databases, loading };
}

/** Fetches collections for a given database whenever both args are non-null. */
export function useExploreCollections(connectionId: string | null, dbName: string | null) {
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectionId || !dbName) {
      setCollections([]);
      return;
    }
    setLoading(true);
    setCollections([]);
    exploreCollections(connectionId, dbName)
      .then((res) => setCollections(res.collections))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connectionId, dbName]);

  return { collections, loading };
}

/** Fetches documents for a given collection whenever all three args are non-null. */
export function useExploreDocuments(
  connectionId: string | null,
  dbName: string | null,
  collection: string | null,
) {
  const [documents, setDocuments] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectionId || !dbName || !collection) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    setDocuments([]);
    exploreDocuments(connectionId, dbName, collection)
      .then((res) => setDocuments(res.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connectionId, dbName, collection]);

  return { documents, loading };
}

/** Loads Firebase Auth users on mount and exposes `search` + `refetch`. */
export function useFirebaseUsers(connectionId?: string) {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFirebaseUsers(connectionId, 100);
      setUsers(res.users);
    } catch {
      toast({ title: 'Error', description: 'Failed to load user list', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [connectionId, toast]);

  const search = useCallback(
    async (email: string) => {
      if (!email) return fetchAll();
      setLoading(true);
      try {
        const user = await searchFirebaseUser(email, connectionId);
        setUsers([user]);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          toast({ description: 'User not found', variant: 'default' });
          setUsers([]);
        } else {
          toast({ title: 'Error', description: 'Search failed', variant: 'destructive' });
        }
      } finally {
        setLoading(false);
      }
    },
    [connectionId, fetchAll, toast],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { users, loading, search, refetch: fetchAll };
}
