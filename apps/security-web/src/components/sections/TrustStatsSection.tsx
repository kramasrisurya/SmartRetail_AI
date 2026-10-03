'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Shield, Users, Globe2, Headphones, Video } from 'lucide-react';

const stats = [
  {
    icon: <Shield className="w-5 h-5 text-secondary" />,
    value: '20+',
    label: 'Years in Security',
    subtext: 'Engineering Trust',
  },
  {
    icon: <Users className="w-5 h-5 text-secondary" />,
    value: '500+',
    label: 'Enterprise Clients',
    subtext: 'Airports, Banks, Metros',
  },
  {
    icon: <Globe2 className="w-5 h-5 text-secondary" />,
    value: '50+',
    label: 'Global Regions',
    subtext: 'Worldwide Deployments',
  },
  {
    icon: <Headphones className="w-5 h-5 text-secondary" />,
    value: '24/7',
    label: 'NOC Support',
    subtext: '<15m SLA Response',
  },
  {
    icon: <Video className="w-5 h-5 text-secondary" />,
    value: '1M+',
    label: 'Endpoints Online',
    subtext: 'Edge AI Cameras & Nodes',
  },
];

export const TrustStatsSection: React.FC = () => {
  return (
    <section className="bg-white border-b border-slate-200/80 relative z-20 py-8 shadow-sm">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-0 lg:divide-x lg:divide-slate-200">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="flex items-center gap-3.5 px-2 lg:px-6 justify-start lg:justify-center"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
              <div>
                <div className="font-heading font-black text-2xl lg:text-3xl text-slate-900 tracking-tight leading-none">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-500">
                  {stat.subtext}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};
