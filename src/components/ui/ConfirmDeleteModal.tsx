'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemCode?: string;
  itemType?: string;
  warningMessage?: string;
  confirmButtonText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Confirm Deletion',
  itemName,
  itemCode,
  itemType = 'Record',
  warningMessage = 'This action cannot be undone. All associated subledger entries, allocations, and transaction history will be permanently deleted.',
  confirmButtonText = 'Delete Permanently',
  onConfirm,
  onClose
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Irreversible Database Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 font-sans">
          {/* Item Details Box */}
          {(itemName || itemCode) && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">
                  {itemType}
                </span>
                <span className="font-bold text-white text-sm mt-0.5 block">{itemName}</span>
              </div>
              {itemCode && (
                <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-[11px]">
                  {itemCode}
                </span>
              )}
            </div>
          )}

          {/* Warning notice */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{warningMessage}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-end gap-2.5 font-mono">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-rose-950/50 active:scale-95 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
