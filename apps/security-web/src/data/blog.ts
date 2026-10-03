import { BlogPost } from '../types';

export const blogPostsData: BlogPost[] = [
  {
    id: 'post-01',
    title: 'How 8K Ultra-Low Light AI Cameras are Revolutionizing Critical Infrastructure Security',
    slug: '8k-ultra-low-light-ai-cameras-critical-infrastructure',
    excerpt: 'Explore how deep-learning ISP processors and 1/1.2" sensors deliver full-color forensic clarity in pitch darkness without supplemental white illumination.',
    content: 'Traditional security cameras rely on glaring white LED floodlights or grainy black-and-white infrared to monitor perimeters at night. The latest generation of 8K UltraDark AI cameras leverages custom dual-sensor optical fusion and deep neural networks to extract full-color forensic details down to 0.0005 Lux—allowing security operators to accurately identify vehicle paint codes, clothing colors, and facial characteristics even in unlit industrial environments.',
    category: 'Technology & AI',
    date: 'March 28, 2026',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1000&q=80',
    featured: true,
    author: {
      name: 'Dr. Vikram Malhotra',
      role: 'VP of Computer Vision Research',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'post-02',
    title: 'The Shift to Touchless Biometrics: Palm-Vein vs Facial Recognition in Cleanroom Environments',
    slug: 'shift-to-touchless-biometrics-cleanrooms',
    excerpt: 'A technical evaluation of speed, false rejection rates (FRR), and sterile compliance for high-security pharmaceutical and semiconductor facilities.',
    content: 'Pharmaceutical manufacturing plants and semiconductor cleanrooms require zero physical surface contact to eliminate cross-contamination risks. This benchmark study analyzes the operational advantages of infrared palm vein recognition compared to facial matching when staff wear full cleanroom PPE hoods, goggles, and surgical masks.',
    category: 'Access Control',
    date: 'March 15, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    featured: false,
    author: {
      name: 'Priya Narayanan',
      role: 'Head of Enterprise Access Solutions',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'post-03',
    title: 'Aegis Security Expands State-of-the-Art Make-in-India Manufacturing Center in Mumbai',
    slug: 'aegis-expands-make-in-india-manufacturing-mumbai',
    excerpt: 'New 200,000 sq ft facility ramps up domestic production capacity for smart cameras, turnstiles, and edge AI video recorders.',
    content: 'Aegis Security has officially inaugurated Phase 2 of its advanced electronics manufacturing facility in Mumbai. The plant features fully automated SMT robotic surface-mount lines, cleanroom optical lens alignment machines, and an accelerated environmental stress testing chamber to support the growing national demand for sovereign security hardware.',
    category: 'Corporate News',
    date: 'February 24, 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    featured: false,
    author: {
      name: 'Rajesh Sen',
      role: 'Managing Director, Aegis India',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'post-04',
    title: 'Cybersecurity Hardening for IP Video Surveillance: Mitigating Edge Vulnerabilities',
    slug: 'cybersecurity-hardening-ip-surveillance',
    excerpt: 'Best practices for 802.1X network authentication, TLS 1.3 encryption, certificate management, and preventing unauthorized IoT botnet compromises.',
    content: 'As IP cameras become sophisticated Linux-based edge computers, securing firmware and network communication against unauthorized lateral movement is paramount. We outline a zero-trust framework for system integrators deploying enterprise camera networks.',
    category: 'Cybersecurity',
    date: 'February 10, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    featured: false,
    author: {
      name: 'Amitabh Roy',
      role: 'Chief Information Security Officer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  }
];
