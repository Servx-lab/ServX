import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GraduationCap,
    Briefcase,
    Rocket,
    Laptop,
    MoreHorizontal,
    CheckCircle2,
    ArrowRight,
    Loader2,
    Sparkles,
    MapPin,
    Link as LinkIcon,
    Type
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './hooks';
import { useNavigate } from 'react-router-dom';

type Occupation = 'student' | 'employee' | 'founder' | 'freelancer' | 'other' | null;

export const ProfileSetupExample = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    
    // Step 1: Basic
    const [name, setName] = useState('');
    const [dobMonth, setDobMonth] = useState('');
    const [dobDay, setDobDay] = useState('');
    const [dobYear, setDobYear] = useState('');
    
    // Step 2: Occupation
    const [occupation, setOccupation] = useState<Occupation>(null);
    
    // Step 3: Professional Details
    const [headline, setHeadline] = useState('');
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    // Calculate min/max dates
    const maxYear = 2050;
    const minYear = 1950;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i); // Descending order

    // Pre-fill name if available
    useEffect(() => {
        if (user?.displayName && user.displayName !== 'User') {
            setName(user.displayName);
        }
    }, [user]);

    // Auto-fetch location
    useEffect(() => {
        const fetchLocation = async () => {
            setIsFetchingLocation(true);
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                if (data.city && data.country_name) {
                    setLocation(`${data.city}, ${data.country_name}`);
                }
            } catch (err) {
                console.error("Failed to auto-fetch location:", err);
            } finally {
                setIsFetchingLocation(false);
            }
        };
        fetchLocation();
    }, []);

    const occupations = [
        { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Learning and building' },
        { id: 'employee', label: 'Employee', icon: Briefcase, desc: 'Working at a company' },
        { id: 'founder', label: 'Founder / CEO', icon: Rocket, desc: 'Building a startup' },
        { id: 'freelancer', label: 'Freelancer', icon: Laptop, desc: 'Independent contractor' },
        { id: 'other', label: 'Other', icon: MoreHorizontal, desc: 'Something else' },
    ];

    const handleNext = async () => {
        if (step === 1 && name.trim() && dobMonth && dobDay && dobYear) {
            setStep(2);
        } else if (step === 2 && occupation) {
            setStep(3);
        } else if (step === 3 && headline.trim()) {
            setIsSubmitting(true);
            try {
                const combinedDob = `${dobYear}-${dobMonth}-${dobDay}`;
                // Update Supabase User Metadata securely
                const { error } = await supabase.auth.updateUser({
                    data: {
                        displayName: name.trim(),
                        full_name: name.trim(),
                        dateOfBirth: combinedDob,
                        occupation: occupation,
                        headline: headline.trim(),
                        location: location.trim(),
                        website: website.trim()
                    }
                });

                if (error) throw error;
                
                // Show success screen
                setStep(4);
                
                // Redirect after a short delay
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } catch (err) {
                console.error("Failed to update user profile:", err);
                setIsSubmitting(false);
                alert("Failed to save profile. Please try again.");
            }
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Glows (Light Mode) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-100/50 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none invert" />

            <div className="relative z-10 w-full max-w-2xl">
                
                {/* Progress Indicators */}
                {step < 4 && (
                    <div className="flex items-center justify-center gap-3 mb-12">
                        <div className={`h-1.5 w-12 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                        <div className={`h-1.5 w-12 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                        <div className={`h-1.5 w-12 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                    </div>
                )}

                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: NAME & AGE */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">What should we call you?</h2>
                                <p className="text-slate-500 text-lg">Let's set up your personal workspace.</p>
                            </div>

                            <div className="flex flex-col gap-6 mb-10">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1">Preferred Name</label>
                                    <input 
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium placeholder:text-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1">When is your birthday?</label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <select 
                                                value={dobMonth}
                                                onChange={(e) => setDobMonth(e.target.value)}
                                                className="w-full px-4 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Month</option>
                                                {months.map((m, i) => (
                                                    <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        <div className="relative flex-1">
                                            <select 
                                                value={dobDay}
                                                onChange={(e) => setDobDay(e.target.value)}
                                                className="w-full px-4 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Day</option>
                                                {days.map(d => (
                                                    <option key={d} value={d.toString().padStart(2, '0')}>{d}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        <div className="relative flex-1">
                                            <select 
                                                value={dobYear}
                                                onChange={(e) => setDobYear(e.target.value)}
                                                className="w-full px-4 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Year</option>
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleNext}
                                    disabled={!name.trim() || !dobMonth || !dobDay || !dobYear}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                                        name.trim() && dobMonth && dobDay && dobYear
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: OCCUPATION */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50 relative overflow-hidden"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">What's your primary role?</h2>
                                <p className="text-slate-500 text-lg">We'll tailor your dashboard to fit your needs.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                {occupations.map((occ) => (
                                    <button
                                        key={occ.id}
                                        onClick={() => setOccupation(occ.id as Occupation)}
                                        className={`group relative text-left p-6 rounded-3xl border transition-all duration-300 flex flex-col items-start gap-4 ${
                                            occupation === occ.id 
                                            ? 'bg-cyan-50/50 border-cyan-500 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)] scale-[1.02]' 
                                            : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:scale-[1.01]'
                                        }`}
                                    >
                                        <div className="flex w-full justify-between items-start">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                                occupation === occ.id ? 'bg-cyan-100 text-cyan-600' : 'bg-white text-slate-400 group-hover:text-slate-600 shadow-sm border border-slate-100'
                                            }`}>
                                                <occ.icon className="w-5 h-5" />
                                            </div>
                                            {occupation === occ.id && (
                                                <motion.div 
                                                    initial={{ scale: 0 }} 
                                                    animate={{ scale: 1 }}
                                                    className="text-cyan-500 shrink-0"
                                                >
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </motion.div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold mb-1 transition-colors ${occupation === occ.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {occ.label}
                                            </h3>
                                            <p className="text-sm text-slate-500">{occ.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-slate-400 hover:text-slate-900 font-bold px-4 py-2 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!occupation}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                                        occupation 
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: PROFESSIONAL DETAILS */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50 relative overflow-hidden"
                        >
                            {/* Loading Overlay */}
                            {isSubmitting && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem]"
                                >
                                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                                    <p className="text-cyan-600 font-bold animate-pulse">Saving your profile securely...</p>
                                </motion.div>
                            )}

                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Professional Details</h2>
                                <p className="text-slate-500 text-lg">Help others discover and connect with you.</p>
                            </div>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1">Professional Headline</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Type className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <input 
                                            type="text"
                                            value={headline}
                                            onChange={(e) => setHeadline(e.target.value)}
                                            placeholder="e.g. Senior Product Designer at Google"
                                            className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1">Location</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <MapPin className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <input 
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="City, Country"
                                            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium placeholder:text-slate-300"
                                        />
                                        {isFetchingLocation && (
                                            <div className="absolute inset-y-0 right-4 flex items-center">
                                                <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 ml-1">We tried to fetch this automatically based on your network.</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1">Website (Optional)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <LinkIcon className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <input 
                                            type="url"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            placeholder="https://yourwebsite.com"
                                            className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all text-slate-900 text-lg font-medium placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => setStep(2)}
                                    className="text-slate-400 hover:text-slate-900 font-bold px-4 py-2 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!headline.trim() || isSubmitting}
                                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${
                                        headline.trim()
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Complete Setup <Sparkles className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-transparent p-12 rounded-[2.5rem] text-center"
                        >
                            <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                            >
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </motion.div>
                            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Hello, {name}!</h2>
                            <p className="text-slate-500 text-lg">Your workspace is ready.</p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};
