import React, { useState } from 'react';
import { X, Search, Bookmark, Plus, Trash2, Radio, Check } from 'lucide-react';
import { BandPreset, Bookmark as BookmarkType, DemodulationMode } from '../types/sdr';
import { POPULAR_BANDS } from './TuningControl';

interface BandPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkType[];
  onSelectFrequency: (freqHz: number, mode: DemodulationMode, bandwidthHz: number) => void;
  onAddBookmark: (b: BookmarkType) => void;
  onDeleteBookmark: (id: string) => void;
}

export const BandPlanModal: React.FC<BandPlanModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSelectFrequency,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'bookmarks'>('presets');

  // New bookmark form state
  const [newFreqMhz, setNewFreqMhz] = useState('146.520');
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState<DemodulationMode>('NBFM');
  const [newTag, setNewTag] = useState('Ham');

  if (!isOpen) return null;

  const filteredPresets = POPULAR_BANDS.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.freqHz / 1e6).toFixed(3).includes(searchQuery)
  );

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.tag && b.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.freqHz / 1e6).toFixed(3).includes(searchQuery)
  );

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const mhz = parseFloat(newFreqMhz);
    if (!isNaN(mhz) && mhz > 0 && newName.trim()) {
      onAddBookmark({
        id: `bm_${Date.now()}`,
        name: newName.trim(),
        freqHz: Math.round(mhz * 1e6),
        mode: newMode,
        bandwidthHz: newMode === 'WBFM' ? 200000 : newMode === 'AM' ? 6000 : 12500,
        tag: newTag.trim() || undefined,
      });
      setNewName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold font-mono text-white">Band Plans &amp; Frequency Bookmarks</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeTab === 'presets'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard Bands ({POPULAR_BANDS.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeTab === 'bookmarks'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              My Bookmarks ({bookmarks.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search band or frequency..."
              className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPresets.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectFrequency(b.freqHz, b.mode, b.bandwidthHz);
                    onClose();
                  }}
                  className="bg-slate-950 hover:bg-slate-800/80 p-3 rounded-lg border border-slate-800 hover:border-sky-500/50 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-white group-hover:text-sky-400 transition-colors">
                      {b.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {b.category}
                    </span>
                  </div>
                  <div className="text-sm font-mono font-black text-sky-400 mb-1">
                    {(b.freqHz / 1e6).toFixed(3)} MHz
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">{b.description}</div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <span>MODE: {b.mode}</span>
                    <span>•</span>
                    <span>BW: {(b.bandwidthHz / 1000).toFixed(1)} kHz</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="space-y-4">
              {/* Add Bookmark form */}
              <form
                onSubmit={handleCreateBookmark}
                className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono"
              >
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">STATION / CHANNEL NAME</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Local Repeater / Air Tower"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">FREQ (MHz)</label>
                  <input
                    type="text"
                    value={newFreqMhz}
                    onChange={(e) => setNewFreqMhz(e.target.value)}
                    placeholder="146.520"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">MODE</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as DemodulationMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="WBFM">WFM</option>
                    <option value="NBFM">NFM</option>
                    <option value="AM">AM</option>
                    <option value="USB">USB</option>
                    <option value="LSB">LSB</option>
                    <option value="CW">CW</option>
                  </select>
                </div>
                <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    SAVE BOOKMARK
                  </button>
                </div>
              </form>

              {/* Bookmarks list */}
              {filteredBookmarks.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  No bookmarks saved yet. Use the form above to bookmark your favorite frequencies!
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div
                        onClick={() => {
                          onSelectFrequency(bm.freqHz, bm.mode, bm.bandwidthHz);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">{bm.name}</span>
                          {bm.tag && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-400">
                              {bm.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-mono text-sky-400 font-bold">
                          {(bm.freqHz / 1e6).toFixed(3)} MHz
                          <span className="text-xs text-slate-400 font-normal ml-2">
                            {bm.mode} · {(bm.bandwidthHz / 1000).toFixed(1)} kHz
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
