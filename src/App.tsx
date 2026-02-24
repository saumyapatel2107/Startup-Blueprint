/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Brain, 
  RefreshCw, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Layers,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface EvaluationResult {
  businessName: string;
  elevatorPitch: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  risks: {
    market: { score: number; description: string };
    financial: { score: number; description: string };
    operational: { score: number; description: string };
    competitive: { score: number; description: string };
  };
  successRate: number;
  strategicSuggestions: string[];
  psychologicalAspects: {
    founderMindset: string;
    consumerPsychology: string;
  };
  prototypePrompt: string;
}

// --- Constants ---
const SYSTEM_INSTRUCTION = `You are an expert Startup Consultant and Venture Capitalist. 
Analyze the provided business idea and provide a comprehensive evaluation in JSON format.
Be critical but constructive. 
The success rate should be a percentage (0-100).
Risk scores should be from 1 (low risk) to 10 (high risk).
Psychological aspects should cover both the founder's mental challenges and the consumer's behavior/motivation.
The prototypePrompt should be a detailed description for an AI image generator to create a "3D product render" or "app interface prototype" for this business.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    businessName: { type: Type.STRING },
    elevatorPitch: { type: Type.STRING },
    swot: {
      type: Type.OBJECT,
      properties: {
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        threats: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["strengths", "weaknesses", "opportunities", "threats"],
    },
    risks: {
      type: Type.OBJECT,
      properties: {
        market: { 
          type: Type.OBJECT, 
          properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } },
          required: ["score", "description"]
        },
        financial: { 
          type: Type.OBJECT, 
          properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } },
          required: ["score", "description"]
        },
        operational: { 
          type: Type.OBJECT, 
          properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } },
          required: ["score", "description"]
        },
        competitive: { 
          type: Type.OBJECT, 
          properties: { score: { type: Type.NUMBER }, description: { type: Type.STRING } },
          required: ["score", "description"]
        },
      },
      required: ["market", "financial", "operational", "competitive"],
    },
    successRate: { type: Type.NUMBER },
    strategicSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    psychologicalAspects: {
      type: Type.OBJECT,
      properties: {
        founderMindset: { type: Type.STRING },
        consumerPsychology: { type: Type.STRING },
      },
      required: ["founderMindset", "consumerPsychology"],
    },
    prototypePrompt: { type: Type.STRING },
  },
  required: ["businessName", "elevatorPitch", "swot", "risks", "successRate", "strategicSuggestions", "psychologicalAspects", "prototypePrompt"],
};

// --- Components ---

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: any, colorClass: string }) => (
  <div className="glass-card p-6 flex flex-col gap-2">
    <div className="flex items-center gap-3 text-white/60">
      <Icon size={18} />
      <span className="text-xs uppercase tracking-widest font-medium">{title}</span>
    </div>
    <div className={cn("text-3xl font-display font-bold", colorClass)}>
      {value}
    </div>
  </div>
);

const SWOTSection = ({ title, items, icon: Icon, color }: { title: string, items: string[], icon: any, color: string }) => (
  <div className="glass-card p-6 flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
      <Icon size={20} className={color} />
      <h3 className="font-display font-bold uppercase tracking-wider text-sm">{title}</h3>
    </div>
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
          <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", color.replace('text-', 'bg-'))} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default function App() {
  const [step, setStep] = useState<'landing' | 'loading' | 'results'>('landing');
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [prototypeUrl, setPrototypeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluateIdea = async () => {
    if (!idea.trim()) return;
    
    setStep('loading');
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // 1. Text Analysis
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Evaluate this startup idea: ${idea}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const data = JSON.parse(response.text || '{}') as EvaluationResult;
      setResult(data);

      // 2. Prototype Generation
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A high-quality 3D product render or sleek app UI prototype for: ${data.prototypePrompt}. Cinematic lighting, professional studio setup, 4k, minimalist aesthetic.` }],
        },
        config: {
          imageConfig: { aspectRatio: "16:9" },
        },
      });

      for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setPrototypeUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }

      setStep('results');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during evaluation.");
      setStep('landing');
    }
  };

  const reset = () => {
    setStep('landing');
    setIdea('');
    setResult(null);
    setPrototypeUrl(null);
  };

  const riskData = result ? [
    { subject: 'Market', A: result.risks.market.score, fullMark: 10 },
    { subject: 'Financial', A: result.risks.financial.score, fullMark: 10 },
    { subject: 'Operational', A: result.risks.operational.score, fullMark: 10 },
    { subject: 'Competitive', A: result.risks.competitive.score, fullMark: 10 },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Rocket size={18} className="text-black" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Ideator<span className="text-emerald-500">AI</span></span>
        </div>
        {step === 'results' && (
          <button 
            onClick={reset}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Restart
          </button>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto py-20 flex flex-col gap-12"
            >
              <div className="space-y-6 text-center">
                <motion.h1 
                  className="text-6xl md:text-8xl font-display font-bold leading-[0.9] tracking-tighter"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  VALIDATE YOUR <br />
                  <span className="gradient-text">NEXT BIG IDEA.</span>
                </motion.h1>
                <p className="text-white/50 text-lg max-w-xl mx-auto">
                  Get a comprehensive VC-grade analysis of your startup concept in seconds. 
                  SWOT, risk assessment, and visual prototyping powered by Gemini.
                </p>
              </div>

              <div className="glass-card p-2 flex flex-col md:flex-row gap-2">
                <textarea 
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your startup idea in detail..."
                  className="flex-1 bg-transparent p-4 outline-none resize-none min-h-[120px] text-lg font-light"
                />
                <button 
                  onClick={evaluateIdea}
                  disabled={!idea.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  Analyze Idea
                  <ArrowRight size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm flex items-center gap-3">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                  { icon: Target, title: "SWOT Analysis", desc: "Deep dive into internal and external factors." },
                  { icon: ShieldAlert, title: "Risk Scoring", desc: "Quantitative assessment of potential pitfalls." },
                  { icon: Layers, title: "3D Prototyping", desc: "Visual representation of your concept." }
                ].map((feature, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4">
                    <feature.icon className="text-emerald-500" size={24} />
                    <h3 className="font-display font-bold text-sm uppercase tracking-wider">{feature.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40 gap-8"
            >
              <div className="relative">
                <motion.div 
                  className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-display font-bold">Analyzing Market Dynamics</h2>
                <p className="text-white/40 text-sm animate-pulse">Consulting virtual venture capitalists...</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && result && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8 py-10"
            >
              {/* Header Section */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Verified Concept</span>
                  <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">{result.businessName}</h2>
                </div>
                <p className="text-white/60 text-lg italic max-w-3xl border-l-2 border-emerald-500/30 pl-6 py-2">
                  "{result.elevatorPitch}"
                </p>
              </div>

              {/* Top Row: Success Rate & Risks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 flex flex-col gap-8">
                  <StatCard 
                    title="Success Probability" 
                    value={`${result.successRate}%`} 
                    icon={TrendingUp} 
                    colorClass="text-emerald-400" 
                  />
                  
                  <div className="glass-card p-6 flex flex-col gap-6 flex-1">
                    <div className="flex items-center gap-3 text-white/60">
                      <ShieldAlert size={18} />
                      <span className="text-xs uppercase tracking-widest font-medium">Risk Profile</span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskData}>
                          <PolarGrid stroke="#ffffff20" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff60', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar
                            name="Risk"
                            dataKey="A"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.4}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <Layers size={18} />
                      <span className="text-xs uppercase tracking-widest font-medium">Visual Prototype</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded uppercase font-bold tracking-tighter">AI Generated</span>
                  </div>
                  <div className="flex-1 bg-black/40 flex items-center justify-center min-h-[300px] relative group">
                    {prototypeUrl ? (
                      <img 
                        src={prototypeUrl} 
                        alt="Prototype" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-white/20">
                        <RefreshCw className="animate-spin" size={32} />
                        <span className="text-sm">Rendering 3D Model...</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex items-end">
                      <p className="text-xs text-white/60 italic leading-relaxed">
                        "{result.prototypePrompt}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SWOT Grid */}
              <div className="bento-grid">
                <SWOTSection 
                  title="Strengths" 
                  items={result.swot.strengths} 
                  icon={CheckCircle2} 
                  color="text-emerald-400" 
                />
                <SWOTSection 
                  title="Weaknesses" 
                  items={result.swot.weaknesses} 
                  icon={AlertTriangle} 
                  color="text-amber-400" 
                />
                <SWOTSection 
                  title="Opportunities" 
                  items={result.swot.opportunities} 
                  icon={Zap} 
                  color="text-cyan-400" 
                />
                <SWOTSection 
                  title="Threats" 
                  items={result.swot.threats} 
                  icon={ShieldAlert} 
                  color="text-rose-400" 
                />
              </div>

              {/* Psychology & Strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-3 text-white/60">
                    <Brain size={20} />
                    <h3 className="font-display font-bold uppercase tracking-wider text-sm">Psychological Dynamics</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Founder Mindset</h4>
                      <p className="text-sm text-white/70 leading-relaxed">{result.psychologicalAspects.founderMindset}</p>
                    </div>
                    <div>
                      <h4 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">Consumer Psychology</h4>
                      <p className="text-sm text-white/70 leading-relaxed">{result.psychologicalAspects.consumerPsychology}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-3 text-white/60">
                    <Lightbulb size={20} />
                    <h3 className="font-display font-bold uppercase tracking-wider text-sm">Strategic Roadmap</h3>
                  </div>
                  <div className="space-y-4">
                    {result.strategicSuggestions.map((suggestion, i) => (
                      <div key={i} className="flex gap-4 items-start p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-emerald-500 font-mono text-xs font-bold">0{i+1}</span>
                        <p className="text-sm text-white/80 leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Risk Details */}
              <div className="glass-card p-8">
                <div className="flex items-center gap-3 text-white/60 mb-8">
                  <BarChart3 size={20} />
                  <h3 className="font-display font-bold uppercase tracking-wider text-sm">Risk Assessment Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(result.risks).map(([key, risk]) => (
                    <div key={key} className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase font-bold tracking-widest text-white/40">{key}</span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded",
                          risk.score > 7 ? "bg-rose-500/20 text-rose-400" : 
                          risk.score > 4 ? "bg-amber-500/20 text-amber-400" : 
                          "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {risk.score}/10
                        </span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${risk.score * 10}%` }}
                          className={cn(
                            "h-full",
                            risk.score > 7 ? "bg-rose-500" : 
                            risk.score > 4 ? "bg-amber-500" : 
                            "bg-emerald-500"
                          )}
                        />
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">{risk.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center py-10">
                <button 
                  onClick={reset}
                  className="bg-white text-black font-bold px-10 py-4 rounded-full flex items-center gap-3 hover:bg-emerald-400 transition-all active:scale-95"
                >
                  <RefreshCw size={20} />
                  Evaluate Another Idea
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 border-t border-white/5 text-center text-white/20 text-xs tracking-widest uppercase font-medium">
        Powered by Google Gemini & Ideator AI &copy; 2026
      </footer>
    </div>
  );
}
