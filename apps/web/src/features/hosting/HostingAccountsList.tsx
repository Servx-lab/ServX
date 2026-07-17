import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useConnections } from '@/features/databases/hooks';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { PROVIDER_CONFIGS } from './constants/providerConfigs';
import { useLocalCache } from '@/hooks/useLocalCache';
import imageCompression from 'browser-image-compression';
import { MoreHorizontal, ImagePlus, Edit2, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HostingAccountsListProps {
  activeConnectionId?: string;
}

const HostingAccountsList: React.FC<HostingAccountsListProps> = ({ activeConnectionId }) => {
  const { connections, refetch } = useConnections();
  const { data: cachedData } = useLocalCache();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingConnectionId, setUploadingConnectionId] = useState<string | null>(null);

  // Removed manual useEffect autofocus, using React's native autoFocus on the input

  // Filter only hosting connections
  const hostingConnections = connections.filter(c => 
    Object.values(PROVIDER_CONFIGS).some(config => config.key.toLowerCase() === c.provider.toLowerCase() || config.label.toLowerCase() === c.provider.toLowerCase())
  );

  if (hostingConnections.length === 0) {
    return null;
  }

  const handleRename = async (id: string, originalName: string) => {
    if (!editValue.trim() || editValue.trim() === originalName) {
      setEditingId(null);
      return;
    }

    try {
      await apiClient.put(`/connections/${id}/alias`, { alias: editValue.trim() });
      await refetch();
      toast({ title: 'Account Renamed', description: 'The API key has been renamed successfully.' });
    } catch (err: any) {
      toast({ 
        title: 'Rename Failed', 
        description: err.response?.data?.message || 'Could not rename account.',
        variant: 'destructive'
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingConnectionId) return;

    try {
      setIsUploading(uploadingConnectionId);
      
      // Auto-compress the image to strictly < 50KB
      const options = {
        maxSizeMB: 0.05, // 50 KB
        maxWidthOrHeight: 256, // Sufficient for avatars
        useWebWorker: true,
      };
      
      const compressedBlob = await imageCompression(file, options);
      
      // Safety check just in case the compression algorithm fails to hit the exact target
      if (compressedBlob.size > 50 * 1024) {
          toast({
            title: 'File Too Large',
            description: 'Even after maximum compression, the photo is still too large (must be < 50KB).',
            variant: 'destructive',
          });
          return;
      }
      
      const formData = new FormData();
      // We append the blob but give it the original file's name
      formData.append('avatar', compressedBlob, file.name);
      
      await apiClient.post(`/connections/${uploadingConnectionId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast({ title: 'Avatar Updated', description: 'Your profile photo was successfully uploaded to Cloudinary.' });
      await refetch();
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || 'Could not upload avatar. Please try again.';
      
      // If the compression library threw the error, it's likely a format issue (e.g. PDF instead of PNG)
      if (err.message && err.message.toLowerCase().includes('not an image')) {
        errorMessage = 'Invalid file format. Please select a valid image (PNG, JPG, WEBP).';
      }

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(null);
      setUploadingConnectionId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the API Key for ${name}?`)) {
      try {
        await apiClient.delete(`/connections/${id}`);
        await refetch();
        toast({ title: 'Connection Deleted', description: 'The API key has been removed successfully.' });
      } catch (err: any) {
        toast({ title: 'Error', description: 'Could not delete the connection.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white/50 flex flex-col py-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileUpload} 
      />
      <div className="px-6 mb-6 flex justify-between items-center">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Accounts</h2>
      </div>
      <nav className="flex-1 space-y-1 px-3 max-h-64 overflow-y-auto no-scrollbar">
        {hostingConnections.map((conn) => {
          const configKey = Object.keys(PROVIDER_CONFIGS).find(
            k => PROVIDER_CONFIGS[k].label.toLowerCase() === conn.provider.toLowerCase() || 
                 PROVIDER_CONFIGS[k].key.toLowerCase() === conn.provider.toLowerCase()
          ) as keyof typeof PROVIDER_CONFIGS;
          const config = PROVIDER_CONFIGS[configKey] || PROVIDER_CONFIGS.Render;
          const displayName = conn.alias || conn.name;
          const isActive = activeConnectionId === conn._id;

          // Attempt to find the user avatar from cached hosting statuses
          const cachedAccounts = cachedData?.hostingStatuses?.[config.key]?.accounts || [];
          const matchedAccount = cachedAccounts.find((a: any) => a.connectionId === conn._id);
          const rawAvatar = (conn as any).avatarUrl || matchedAccount?.user?.avatar || null;
          
          let resolvedAvatarUrl = rawAvatar;
          if (rawAvatar && !rawAvatar.startsWith('http')) {
              resolvedAvatarUrl = `https://vercel.com/api/www/avatar/${rawAvatar}?s=120`;
          }

          const initial = displayName.charAt(0).toUpperCase();

          const avatarBlock = (
            <div className="relative w-8 h-8 shrink-0">
              {resolvedAvatarUrl ? (
                <img
                  src={resolvedAvatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-md object-cover ring-1 ring-gray-200/80 shadow-sm"
                />
              ) : (
                <div className="w-full h-full rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs ring-1 ring-gray-200/80 shadow-sm">
                  {initial}
                </div>
              )}
              
              {/* Provider Logo Overlay */}
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center ring-1 ring-gray-200 shadow-sm [&>svg]:w-2 [&>svg]:h-2 [&>svg]:!fill-gray-700 [&>svg]:!text-gray-700">
                {config.logoSmall}
              </div>
              
              {/* Upload Overlay (Loading State) */}
              {isUploading === conn._id && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-md flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-gray-700 animate-spin" />
                </div>
              )}
            </div>
          );

          return (
            <div key={conn._id} className={`relative group flex items-center rounded-lg transition-all duration-200 ${isActive ? 'bg-white border border-gray-200 shadow-sm' : 'hover:bg-gray-100 border border-transparent'}`}>
              {editingId === conn._id ? (
                <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0 cursor-default">
                  {avatarBlock}
                  <input
                    ref={inputRef}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleRename(conn._id, displayName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-0.5 -ml-2 text-sm font-medium outline-none ring-2 ring-gray-200 text-gray-900 shadow-sm"
                  />
                </div>
              ) : (
                <>
                  <NavLink
                    to={`/hosting/${config.key}/${conn._id}`}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0"
                  >
                    {avatarBlock}
                    <span className={`flex-1 truncate text-sm ${isActive ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}>
                      {displayName}
                    </span>
                  </NavLink>
                  
                  <div className="shrink-0 px-2 flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-200 text-gray-500 transition-opacity outline-none">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-48 bg-white border-gray-200 shadow-lg"
                        onCloseAutoFocus={(e) => {
                           // CRITICAL: Prevent Radix from stealing focus back to the 3-dots button when it closes!
                           e.preventDefault(); 
                        }}
                      >
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-gray-700 hover:text-gray-900 focus:bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                          onSelect={() => {
                            setUploadingConnectionId(conn._id);
                            fileInputRef.current?.click();
                          }}
                        >
                          <ImagePlus className="w-4 h-4 text-gray-500" />
                          Upload Profile Photo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-gray-700 hover:text-gray-900 focus:bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                          onSelect={() => {
                            setEditValue(displayName);
                            setEditingId(conn._id);
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                          onClick={(e) => e.stopPropagation()}
                          onSelect={() => {
                            handleDelete(conn._id, displayName);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          Delete API Key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default HostingAccountsList;
