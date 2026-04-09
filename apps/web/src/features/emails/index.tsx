import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from 'react-router-dom';
import { useGmailStatus, useGmailInbox, useGoogleAuthUrl } from './hooks';
import { EmailError } from './types';

const Emails = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<EmailError>(null);

  // Hooks
  const { 
    data: statusData, 
    isLoading: isLoadingStatus, 
    refetch: refetchStatus 
  } = useGmailStatus();
  
  const isConnected = statusData?.connected || false;

  const { 
    data: emails = [], 
    isLoading: isLoadingEmails, 
    refetch: refetchEmails 
  } = useGmailInbox(isConnected);

  const { refetch: fetchAuthUrl } = useGoogleAuthUrl();

  useEffect(() => {
    // Check for success/error from OAuth redirect
    const success = searchParams.get('success');
    const err = searchParams.get('error');
    
    if (success) {
      // Clear params
      setSearchParams({});
      refetchStatus();
    } else if (err) {
      setError(`Authentication failed: ${err}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetchStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { data } = await fetchAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (err) {
      console.error('Failed to get OAuth URL', err);
      setError('Failed to initiate connection. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleRefresh = () => {
    refetchEmails();
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black font-sans">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                <Mail className="w-5 h-5 text-blue-500" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
                  Communications Hub
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Manage your connected inboxes</p>
             </div>
          </div>
          
          {isConnected && (
            <div className="flex items-center gap-4">
               <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh} 
                  disabled={isLoadingEmails}
                  className="text-gray-500 hover:text-black hover:bg-gray-100"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            
            {isLoadingStatus ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : !isConnected ? (
              /* Connection UI */
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-10 rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto mt-12 text-center relative overflow-hidden"
              >
                <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-100 blur-[100px]" />
                <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-50 blur-[100px]" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-black mb-2">Connect Gmail</h2>
                  <p className="text-gray-500 text-sm mb-8">
                    Link your Google account to read your emails directly inside the ServX dashboard.
                  </p>

                  {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm text-left">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full h-12 relative overflow-hidden transition-all duration-300 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-black font-semibold rounded-xl"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Inbox Viewer */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-black">Recent Emails</h2>
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600">
                    <span className="relative flex h-1.5 w-1.5 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    Connected
                  </Badge>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {isLoadingEmails ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                      <p className="text-sm">Fetching your inbox...</p>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Mail className="w-12 h-12 mb-4 opacity-20" />
                      <p>No recent emails found.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {emails.map((email) => {
                        // Extract just the name or email from the 'From' header
                        const fromMatch = email.from.match(/^(.*?)\s*</);
                        const senderName = fromMatch ? fromMatch[1].replace(/"/g, '') : email.from;
                        
                        return (
                          <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <h4 className="font-medium text-black truncate pr-4">{senderName}</h4>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h5 className="text-sm text-gray-900 font-medium mb-1 truncate">{email.subject}</h5>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: email.snippet }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
    </main>
  );
};

export default Emails;
