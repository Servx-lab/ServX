import React, { useState } from 'react';
import { Search, Copy, UserX, KeyRound, Loader2, User, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AuthUserDetail {
    id: string;
    email: string;
    displayName: string;
    creationTime: string;
    lastSignInTime: string;
    disabled: boolean;
}

export function AuthUserManager({ connectionId }: { connectionId?: string }) {
    const [searchEmail, setSearchEmail] = useState('');
    const [users, setUsers] = useState<AuthUserDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const params = new URLSearchParams({ limit: '100' });
            if (connectionId) params.set('connectionId', connectionId);
            const res = await fetch(`${API_URL}/api/auth/users/list?${params}`);
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to load user list",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchEmail) return fetchUsers();

        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const params = new URLSearchParams({ email: searchEmail });
            if (connectionId) params.set('connectionId', connectionId);
            const res = await fetch(`${API_URL}/api/auth/users/search?${params}`);
            
            if (res.status === 404) {
                 toast({ description: "User not found", variant: "default" });
                 setUsers([]);
            } else if (!res.ok) {
                 throw new Error('Search failed');
            } else {
                 const user = await res.json();
                 setUsers([user]);
            }
        } catch (error) {
            console.error(error);
             toast({
                title: "Error",
                description: "Search failed",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    React.useEffect(() => {
        fetchUsers();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ description: "ID copied to clipboard" });
    };

    return (
        <div className="flex flex-col h-full gap-4 p-4 text-foreground w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#00C2CB]">User Management</h2>
                    <p className="text-sm text-muted-foreground">Manage your Supabase Auth users.</p>
                </div>
                <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Teal Styled Search */}
            <form onSubmit={handleSearch} className="flex gap-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00C2CB]" />
                <Input 
                    placeholder="Search by email..." 
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-9 border-[#00C2CB]/30 focus-visible:ring-[#00C2CB]"
                />
                <Button type="submit" className="bg-[#00C2CB] hover:bg-[#00C2CB]/90 text-black">
                    Search
                </Button>
            </form>

            {/* Glassmorphic Table */}
            <div className="rounded-md border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden flex-1">
                <div className="h-full overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-white/5 sticky top-0 backdrop-blur-sm z-10">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-gray-300">User</TableHead>
                                <TableHead className="text-gray-300">Status</TableHead>
                                <TableHead className="text-gray-300">Auth ID</TableHead>
                                <TableHead className="text-gray-300">Last Sign-In</TableHead>
                                <TableHead className="text-gray-300 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#00C2CB]" />
                                    </TableCell>
                                </TableRow>
                            ) : users.length > 0 ? (
                                users.map((user) => (
                                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-[#00C2CB]/20 flex items-center justify-center text-[#00C2CB]">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-200">{user.displayName || 'No Name'}</span>
                                                    <span className="text-xs text-gray-400">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.disabled ? "destructive" : "secondary"} className={!user.disabled ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                                                {user.disabled ? 'Disabled' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-400">
                                            {user.id.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-400">
                                            {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#00C2CB]" title="Copy ID" onClick={() => copyToClipboard(user.id)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-yellow-500" title="Reset Password" onClick={() => toast({description: "Reset password triggered (Demo only)"})}>
                                                    <KeyRound className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" title="Disable Account" onClick={() => toast({description: "Disable account triggered (Demo only)"})}>
                                                    <UserX className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
