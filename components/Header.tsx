import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-2 rounded-lg shadow-lg shadow-green-500/20">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-green-400 to-green-600">
              StockFlow AI
            </h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">Analyze. Prompt. Rank. Sell.</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700">
          <Sparkles className="w-4 h-4 text-green-400" />
          <span>Professional Edition</span>
        </div>
      </div>
    </header>
  );
};

export default Header;