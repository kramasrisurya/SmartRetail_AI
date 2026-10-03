'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStore } from '../../store/useStore';
import { User, Lock, ShieldCheck, KeyRound, Building2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useStore();
  const [tab, setTab] = useState<'partner' | 'guest'>('partner');
  const [partnerId, setPartnerId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      addToast({
        type: 'success',
        title: 'Partner Authenticated',
        message: 'Welcome to the Aegis Certified System Integrator Portal.',
      });
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aegis Enterprise Partner Portal" maxWidth="md">
      <div className="p-6">
        {/* Tab Header */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setTab('partner')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
              tab === 'partner'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Certified Partner / SI
          </button>
          <button
            onClick={() => setTab('guest')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
              tab === 'guest'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            RMA / Warranty Track
          </button>
        </div>

        {tab === 'partner' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Partner ID / Registered Email"
              required
              placeholder="SI-IND-4092 or name@security-integrator.com"
              leftIcon={<User className="w-4 h-4" />}
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-secondary focus:ring-secondary" />
                <span className="text-slate-600">Remember credentials</span>
              </label>
              <a href="#" className="text-secondary hover:underline font-semibold">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              Sign In to SI Dashboard
            </Button>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              New System Integrator?{' '}
              <a href="#certifications" onClick={onClose} className="text-secondary font-bold hover:underline">
                Apply for ACE Certification & Partner Tier
              </a>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <Input
              label="Serial Number or RMA Ticket ID"
              placeholder="e.g. SN-8836-99214 or RMA-2026-081"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            />
            <Input
              label="Contact Phone Number"
              placeholder="+91 98765 00000"
            />
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                addToast({
                  type: 'info',
                  title: 'Tracking Status',
                  message: 'RMA Ticket #8836: Hardware in diagnostic testing at Mumbai Service Hub.',
                });
                onClose();
              }}
            >
              Track Warranty / RMA Status
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
