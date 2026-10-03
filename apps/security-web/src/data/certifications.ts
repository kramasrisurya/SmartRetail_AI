import { Certification } from '../types';

export const certificationsData: Certification[] = [
  {
    id: 'cert-01',
    code: 'ACSA-VMS',
    title: 'Aegis Certified Security Associate — Video Management Systems',
    level: 'Associate',
    description: 'Fundamental technical training covering IP surveillance network design, camera lens selection, basic VMS installation, storage calculation, and edge AI configuration.',
    duration: '3 Days (24 Contact Hours)',
    badgeUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    highlights: [
      'Network Topology & IP Bandwidth Planning',
      'AcuSense & DeepinView AI Rule Configuration',
      'NVR Storage Redundancy & RAID Configuration',
      'Hands-on Lab Exam with Live Hardware'
    ],
    targetAudience: 'Field Installation Engineers, CCTV Technicians, Junior Pre-Sales',
    examCode: 'EXAM-ACSA-101'
  },
  {
    id: 'cert-02',
    code: 'ACSP-EDGE',
    title: 'Aegis Certified Security Professional — Edge AI & Access Solutions',
    level: 'Professional',
    description: 'Advanced technical certification focusing on biometric access control systems, speed gate calibration, ANPR radar integration, multi-site VMS clustering, and cybersecurity hardening.',
    duration: '5 Days (40 Contact Hours)',
    badgeUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80',
    highlights: [
      'Multi-Biometric Access Control & Mantrap Interlocking',
      'Millimeter-Wave Radar & PTZ Master Tracking Calibration',
      'Cybersecurity: TLS 1.3, 802.1X, and Firmware Hardening',
      'Complex Multi-Subnet Architecture Troubleshooting'
    ],
    targetAudience: 'Senior System Integrators, Technical Project Leads, Solution Architects',
    examCode: 'EXAM-ACSP-201'
  },
  {
    id: 'cert-03',
    code: 'ACTE-ARCH',
    title: 'Aegis Certified Technical Expert — Enterprise City-Scale Architect',
    level: 'Expert',
    description: 'Master-level architecture program for designing city-wide command and control centers (ICCC), 50,000+ camera video walls, cloud-hybrid VMS federations, and high-availability disaster recovery.',
    duration: '5 Days Intensive + Practical Defense',
    badgeUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
    highlights: [
      'Safe City Video Wall & GIS Dispatch Design',
      'High-Availability N+1 Hot Spare Cluster Architecture',
      'API Integration: REST, Kafka, and Custom VMS Plugins',
      'Formal Architectural Defense before Senior Aegis Board'
    ],
    targetAudience: 'Chief Technical Architects, Smart City Consultants, Enterprise Security Directors',
    examCode: 'EXAM-ACTE-301'
  }
];
