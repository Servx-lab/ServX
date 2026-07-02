import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Database, Search, MousePointer2, CheckCircle2, ChevronDown, Server, Type, Edit2, Save, Eye, HelpCircle, Cloud, Wifi, Table } from 'lucide-react';
import { DBState } from './DatabaseShowcase';
import { DatabaseLogo } from '@/features/databases/DatabaseLogo';

export const DatabasePipelineUI = ({ dbState, cycleIndex = 0 }: { dbState: DBState, cycleIndex?: number }) => {
  const cursorControls = useAnimationControls();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const mongoGridBtnRef = useRef<HTMLDivElement>(null);
  const pgGridBtnRef = useRef<HTMLDivElement>(null);
  const fbGridBtnRef = useRef<HTMLDivElement>(null);
  const hostInputRef = useRef<HTMLInputElement>(null);
  const hostTextareaRef = useRef<HTMLTextAreaElement>(null);
  const connectBtnRef = useRef<HTMLButtonElement>(null);
  
  const manageCardRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  const columnBtnRef = useRef<HTMLDivElement>(null);
  const dropdownNameOptionRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  // Cycle Data
  const cycleData = useMemo(() => [
    {
      provider: "MongoDB",
      uri: "mongodb+srv://admin:pass@cluster.mongodb.net",
      nameText: "Production Cluster",
      column: "Name",
      searchTarget: "Alice",
      table: "users_table",
      targetRef: mongoGridBtnRef
    },
    {
      provider: "PostgreSQL",
      uri: "postgresql://user:pass@host:port/db",
      nameText: "Analytics DB",
      column: "Role",
      searchTarget: "Admin",
      table: "activity_logs",
      targetRef: pgGridBtnRef
    },
    {
      provider: "Firebase",
      uri: `{\n  "type": "service_account",\n  "project_id": "your-project",\n  "client_email": "admin@..."\n}`,
      nameText: "Mobile App Backend",
      column: "Email",
      searchTarget: "test@",
      table: "auth_users",
      targetRef: fbGridBtnRef
    }
  ], []);

  const currentCycle = cycleData[cycleIndex % cycleData.length];
  // Accumulate previous connections
  const previousConnections = cycleData.slice(0, cycleIndex % cycleData.length);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("Select");
  const [searchValue, setSearchValue] = useState("");
  
  const [formHost, setFormHost] = useState("");
  const [formName, setFormName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const getRelativeCoords = (targetEl: HTMLElement | null) => {
    if (!targetEl || !containerRef.current) return { top: "50%", left: "50%" };
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    
    const relativeX = targetRect.left - containerRect.left + (targetRect.width / 2);
    const relativeY = targetRect.top - containerRect.top + (targetRect.height / 2);
    
    return { 
      top: `${relativeY}px`, 
      left: `${relativeX}px` 
    };
  };

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    if (dbState === 'idle') {
      cursorControls.set({ opacity: 0, top: "80%", left: "10%", scale: 1 });
      setSelectedColumn("Select");
      setIsDropdownOpen(false);
      setSearchValue("");
      setFormHost("");
      setFormName(currentCycle.provider);
      setIsEditingName(false);
    } else if (dbState === 'clicking_add') {
      cursorControls.start({
        opacity: 1,
        ...getRelativeCoords(addBtnRef.current),
        transition: { duration: 1, ease: "easeInOut" }
      }).then(() => {
        cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.3 } });
      });
    } else if (dbState === 'selecting_provider') {
      timeouts.push(setTimeout(() => {
        cursorControls.start({
          opacity: 1,
          ...getRelativeCoords(currentCycle.targetRef.current),
          transition: { duration: 1, ease: "easeInOut" }
        }).then(() => {
          cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.3 } });
        });
      }, 100));
    } else if (dbState === 'filling_credentials') {
      timeouts.push(setTimeout(() => {
        const targetInput = currentCycle.provider === 'Firebase' ? hostTextareaRef.current : hostInputRef.current;
        cursorControls.start({
          ...getRelativeCoords(targetInput),
          transition: { duration: 0.6, ease: "easeInOut" }
        }).then(() => {
          cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
        });
      }, 100));
      
      const textToType = currentCycle.uri;
      const stepDelay = currentCycle.provider === 'Firebase' ? 15 : 30; // Type JSON faster
      
      for (let i = 1; i <= textToType.length; i++) {
        timeouts.push(setTimeout(() => setFormHost(textToType.slice(0, i) + "|"), 1100 + (i * stepDelay)));
      }
      timeouts.push(setTimeout(() => setFormHost(textToType), 1100 + (textToType.length * stepDelay) + 100));
      
    } else if (dbState === 'connecting') {
      cursorControls.start({
        ...getRelativeCoords(connectBtnRef.current),
        transition: { duration: 0.5, ease: "easeInOut" }
      }).then(() => {
        cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.3 } });
      });
    } else if (dbState === 'renaming_connection') {
      cursorControls.start({
        ...getRelativeCoords(manageCardRef.current),
        transition: { duration: 0.8, ease: "easeInOut" }
      }).then(() => {
        cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } }).then(() => {
          setIsEditingName(true);
          timeouts.push(setTimeout(() => {
            cursorControls.start({
              ...getRelativeCoords(nameInputRef.current),
              transition: { duration: 0.3, ease: "easeInOut" }
            }).then(() => {
              cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
            });
          }, 100));
          
          const newName = currentCycle.nameText;
          for (let i = 1; i <= newName.length; i++) {
            timeouts.push(setTimeout(() => setFormName(newName.slice(0, i) + "|"), 800 + (i * 50)));
          }
          timeouts.push(setTimeout(() => setFormName(newName), 800 + (newName.length * 50) + 100));
          
          timeouts.push(setTimeout(() => {
            cursorControls.start({
              ...getRelativeCoords(saveBtnRef.current),
              transition: { duration: 0.4, ease: "easeInOut" }
            }).then(() => {
              cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } }).then(() => {
                setIsEditingName(false);
              });
            });
          }, 1800));
        });
      });
    } else if (dbState === 'searching') {
      cursorControls.start({
        ...getRelativeCoords(columnBtnRef.current),
        transition: { duration: 0.8, ease: "easeInOut" }
      }).then(() => {
        cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } }).then(() => {
          setIsDropdownOpen(true);
          
          timeouts.push(setTimeout(() => {
            cursorControls.start({
              ...getRelativeCoords(dropdownNameOptionRef.current),
              transition: { duration: 0.4, ease: "easeInOut" }
            }).then(() => {
              cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } }).then(() => {
                setSelectedColumn(currentCycle.column);
                setIsDropdownOpen(false);
                
                cursorControls.start({
                  ...getRelativeCoords(filterInputRef.current),
                  transition: { duration: 0.4, ease: "easeInOut" }
                }).then(() => {
                  cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
                });
              });
            });
          }, 200));
        });
      });
      
      const term = currentCycle.searchTarget;
      for (let i = 1; i <= term.length; i++) {
        timeouts.push(setTimeout(() => setSearchValue(term.slice(0, i) + "|"), 2400 + (i * 60)));
      }
      timeouts.push(setTimeout(() => setSearchValue(term), 2400 + (term.length * 60) + 100));
    }
    
    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [dbState, cursorControls, currentCycle]);

  return (
    <div ref={containerRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-6 w-full h-full font-sans">
      
      <motion.div
        animate={cursorControls}
        initial={{ opacity: 0, top: "80%", left: "10%" }}
        className="absolute z-50 pointer-events-none drop-shadow-2xl"
        style={{ originX: 0, originY: 0 }}
      >
        <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
      </motion.div>

      {/* Box 1: Data Integrations */}
      <div className={`relative isolate bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all duration-500 p-6 flex flex-col h-[500px] ${['idle', 'clicking_add', 'selecting_provider', 'filling_credentials', 'connecting'].includes(dbState) ? 'border-blue-400 shadow-lg shadow-blue-100/50 ring-4 ring-blue-50 scale-[1.02] z-10' : 'border-gray-200 shadow-sm scale-100 z-0'}`}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl text-gray-900 leading-tight tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Source Integration</h3>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Step 01</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 flex-grow relative">
          
          <div className={`absolute inset-0 transition-opacity duration-500 ${dbState === 'idle' || dbState === 'clicking_add' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50">
              <Database className="w-10 h-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-600 mb-1">No Databases</h4>
              <p className="text-xs text-slate-400 text-center mb-6">Connect a data source</p>
              
              <button ref={addBtnRef} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md shadow-sm hover:bg-slate-800 transition-colors">
                + Add Database
              </button>
            </div>
          </div>
          
          <div className={`absolute inset-0 transition-opacity duration-500 ${dbState === 'selecting_provider' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-1">Connect New Database</h4>
              <p className="text-xs text-slate-500 mb-4">Select a provider below</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div ref={mongoGridBtnRef} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-white transition-colors ${currentCycle.provider === 'MongoDB' ? 'border-green-400 bg-green-50 shadow-sm cursor-pointer' : 'border-slate-200 hover:border-slate-300'}`}>
                  <DatabaseLogo type="MongoDB" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">MongoDB</span>
                </div>
                <div ref={fbGridBtnRef} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-white transition-colors ${currentCycle.provider === 'Firebase' ? 'border-yellow-400 bg-yellow-50 shadow-sm cursor-pointer' : 'border-slate-200 hover:border-slate-300'}`}>
                  <DatabaseLogo type="Firebase" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">Firebase</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <DatabaseLogo type="Supabase" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">Supabase</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <DatabaseLogo type="MySQL" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">MySQL</span>
                </div>
                <div ref={pgGridBtnRef} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-white transition-colors ${currentCycle.provider === 'PostgreSQL' ? 'border-blue-400 bg-blue-50 shadow-sm cursor-pointer' : 'border-slate-200 hover:border-slate-300'}`}>
                  <DatabaseLogo type="PostgreSQL" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">PostgreSQL</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <DatabaseLogo type="AWS RDS" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-slate-600">AWS RDS</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`absolute inset-0 transition-opacity duration-500 ${dbState === 'filling_credentials' || dbState === 'connecting' || dbState === 'connected' || dbState === 'renaming_connection' || dbState === 'searching' || dbState === 'expanded' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-6 rounded-full ${currentCycle.provider === 'Firebase' ? 'bg-yellow-500' : currentCycle.provider === 'PostgreSQL' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <h4 className="text-lg font-bold text-gray-900 leading-none">{currentCycle.provider} Configuration</h4>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
                  <input type="checkbox" className="rounded border-slate-300 cursor-pointer" />
                  Show Help <HelpCircle className="w-4 h-4" />
                </label>
              </div>
              
              <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {currentCycle.provider !== 'MongoDB' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider">Connection Name</label>
                    <input type="text" readOnly placeholder="e.g. Production Cluster" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700 outline-none placeholder:text-slate-400" />
                  </div>
                )}
                
                {currentCycle.provider === 'Firebase' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-blue-400" /> Paste Service Account JSON
                      </label>
                      <span className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-700">
                        <Eye className="w-3 h-3" /> Mask JSON
                      </span>
                    </div>
                    <textarea 
                      ref={hostTextareaRef}
                      readOnly 
                      value={formHost}
                      className="w-full px-3 py-3 bg-blue-50/40 border border-blue-200 rounded-lg text-[10px] leading-relaxed text-slate-600 font-mono h-32 outline-none resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider">Connection URI</label>
                    <div className="relative">
                      <input ref={hostInputRef} type="text" readOnly value={formHost} placeholder={`${currentCycle.provider.toLowerCase()}://...`} className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700 outline-none shadow-sm" />
                      <Eye className="w-4 h-4 text-slate-400 absolute right-3 top-3 cursor-pointer hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button className="text-sm text-slate-500 hover:text-slate-700 font-medium px-2 py-2">Cancel</button>
                <button 
                  ref={connectBtnRef} 
                  className={`px-5 py-2.5 rounded-md text-sm font-bold text-white transition-all duration-300 flex items-center gap-2 ${dbState === 'connected' || dbState === 'renaming_connection' || dbState === 'searching' || dbState === 'expanded' ? 'bg-green-500 shadow-md shadow-green-200' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200'}`}
                >
                  {dbState === 'connected' || dbState === 'renaming_connection' || dbState === 'searching' || dbState === 'expanded' ? (
                    <><CheckCircle2 className="w-4 h-4" /> Connected</>
                  ) : (
                    <><Wifi className="w-4 h-4" /> Test Connection</>
                  )}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Box 2: Manage Connections */}
      <div className={`relative isolate bg-white rounded-xl border hover:border-emerald-300 hover:shadow-md transition-all duration-500 p-6 flex flex-col h-[500px] ${['connected', 'renaming_connection'].includes(dbState) ? 'border-emerald-400 shadow-lg shadow-emerald-100/50 ring-4 ring-emerald-50 scale-[1.02] z-10' : 'border-gray-200 shadow-sm scale-100 z-0'}`}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl text-gray-900 leading-tight tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Active Connections</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Step 02</p>
            </div>
          </div>
        </div>
        
        <div className="flex-grow relative">
          <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg p-5 shadow-sm overflow-hidden overflow-y-auto custom-scrollbar">
            
            {/* Newly added connection (Current Cycle) */}
            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${dbState === 'connected' || dbState === 'renaming_connection' || dbState === 'searching' || dbState === 'expanded' ? 'max-h-48 opacity-100 mb-3' : 'max-h-0 opacity-0 mb-0'}`}>
              {!isEditingName ? (
                <div ref={manageCardRef} className="p-3 rounded-lg border border-green-300 bg-green-50 hover:border-green-400 cursor-pointer shadow-sm flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <DatabaseLogo type={currentCycle.provider as any} className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{formName}</p>
                      <p className="text-[10px] text-green-600 font-medium">Active • {currentCycle.provider}</p>
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-green-300 bg-green-50 shadow-sm flex flex-col gap-3 transition-all">
                  <div className="flex items-center gap-3 mb-1">
                    <DatabaseLogo type={currentCycle.provider as any} className="w-5 h-5" />
                    <span className="font-semibold text-gray-900 text-sm">Rename Connection</span>
                  </div>
                  
                  <div>
                    <div className="relative">
                      <Type className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input ref={nameInputRef} type="text" readOnly value={formName} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 outline-none ring-2 ring-green-100" />
                    </div>
                  </div>
                  
                  <button ref={saveBtnRef} className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-md flex items-center justify-center gap-2 shadow-sm shadow-green-200">
                    <Save className="w-4 h-4" /> Save Name
                  </button>
                </div>
              )}
            </div>

            {/* Previously accumulated connections */}
            {previousConnections.map((conn, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between mb-3 opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <DatabaseLogo type={conn.provider as any} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{conn.nameText}</p>
                    <p className="text-[10px] text-gray-500">Active • {conn.provider}</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            ))}
            
            {previousConnections.length === 0 && dbState !== 'connected' && dbState !== 'renaming_connection' && dbState !== 'searching' && dbState !== 'expanded' && (
              <div className="flex flex-col items-center justify-center h-full opacity-50 py-10">
                <Server className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">No active connections</p>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Box 3: Data Explorer */}
      <div className={`relative isolate bg-white rounded-xl border hover:border-purple-300 hover:shadow-md transition-all duration-500 p-6 flex flex-col h-[500px] ${['searching', 'expanded'].includes(dbState) ? 'border-purple-400 shadow-lg shadow-purple-100/50 ring-4 ring-purple-50 scale-[1.02] z-10' : 'border-gray-200 shadow-sm scale-100 z-0'}`}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl text-gray-900 leading-tight tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Data Explorer</h3>
              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">Step 03</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 flex-grow">
          
          <div className="flex items-center gap-2 relative z-20">
            <div className="relative">
              <div ref={columnBtnRef} className={`flex items-center justify-between gap-2 px-3 py-2 w-32 bg-white border rounded-lg text-sm transition-all duration-300 ${dbState === 'idle' || dbState === 'clicking_add' || dbState === 'selecting_provider' || dbState === 'filling_credentials' || dbState === 'connecting' || dbState === 'connected' || dbState === 'renaming_connection' ? 'border-slate-200 opacity-50' : 'border-purple-300 shadow-sm opacity-100 cursor-pointer'}`}>
                <span className="font-medium text-slate-700 truncate">{selectedColumn}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Columns</div>
                  <div className="px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded-md mx-1 text-sm text-slate-700 transition-colors">ID</div>
                  <div ref={dropdownNameOptionRef} className="px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded-md mx-1 text-sm text-slate-700 transition-colors font-medium text-purple-700">{currentCycle.column}</div>
                  <div className="px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded-md mx-1 text-sm text-slate-700 transition-colors">Email</div>
                  <div className="px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded-md mx-1 text-sm text-slate-700 transition-colors">Role</div>
                  <div className="px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded-md mx-1 text-sm text-slate-700 transition-colors">Created At</div>
                </div>
              )}
            </div>
            
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                ref={filterInputRef}
                type="text" 
                readOnly
                value={searchValue}
                placeholder={`Type the ${selectedColumn === 'Select' ? 'filter' : selectedColumn.toLowerCase()}...`} 
                className={`w-full pl-9 pr-4 py-2 bg-white border rounded-lg text-sm focus:outline-none transition-all duration-300 ${dbState === 'idle' || dbState === 'clicking_add' || dbState === 'selecting_provider' || dbState === 'filling_credentials' || dbState === 'connecting' || dbState === 'connected' || dbState === 'renaming_connection' ? 'border-slate-200 opacity-50' : 'border-purple-300 shadow-sm opacity-100 ring-2 ring-purple-100'}`}
              />
            </div>
          </div>

          <div className="flex-grow rounded-lg border border-slate-200 bg-white overflow-hidden relative">
            <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-sm z-10 flex items-center justify-center transition-opacity duration-500" style={{ opacity: dbState === 'expanded' || dbState === 'searching' ? 0 : 1 }}>
              <p className="text-sm text-slate-500 font-medium">Connect a database first</p>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Table className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">{currentCycle.table}</span>
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4">{i}</span>
                    <div className="w-24 h-2 bg-slate-200 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                  </div>
                  <div className="w-16 h-2 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
