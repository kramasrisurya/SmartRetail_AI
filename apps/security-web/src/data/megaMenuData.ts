import { MegaMenuCategory } from '../types';

export const productsMegaMenu: MegaMenuCategory[] = [
  {
    title: 'Network Cameras (IP)',
    description: 'AI-powered smart surveillance',
    featuredProduct: {
      name: 'Aegis UltraDark 8K AI PTZ',
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80',
      tag: 'New 8K Flagship',
      link: '#products'
    },
    links: [
      { name: 'DeepinView AI Series', description: 'Advanced facial & behavioral analytics', href: '#products', badge: 'AI' },
      { name: 'UltraDark Low-Light PTZ', description: 'Color imaging down to 0.0005 Lux', href: '#products', badge: '8K' },
      { name: 'AcuSense Dome & Bullet', description: 'False alarm reduction for humans & cars', href: '#products' },
      { name: 'Panoramic & Fisheye 360°', description: 'Multi-sensor situational coverage', href: '#products' },
      { name: 'Solar 4G Remote Cameras', description: 'Off-grid agricultural & perimeter setups', href: '#products' }
    ]
  },
  {
    title: 'Access Control & Intercom',
    description: 'Touchless entry & turnstiles',
    featuredProduct: {
      name: 'Aegis Guardian Face Terminal',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80',
      tag: '0.2s Biometric',
      link: '#products'
    },
    links: [
      { name: 'Facial & Palm Recognition', description: 'Touchless 0.2s anti-spoof terminals', href: '#products', badge: 'Touchless' },
      { name: 'Speed Gates & Flap Barriers', description: 'High-throughput lobby turnstiles', href: '#products' },
      { name: 'IP Video Intercom Stations', description: 'SIP 2.0 multi-tenant door units', href: '#products' },
      { name: 'Card & Fingerprint Readers', description: 'OSDP encrypted controllers', href: '#products' },
      { name: 'Visitor Management Kiosks', description: 'QR code passes & ID scanners', href: '#products' }
    ]
  },
  {
    title: 'Storage & Control Center',
    description: 'Enterprise NVRs & Displays',
    featuredProduct: {
      name: 'Enterprise 128ch 8K NVR',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
      tag: '16 SATA Bays',
      link: '#products'
    },
    links: [
      { name: 'Enterprise AI NVR Series', description: 'Up to 128 channels with RAID 0/1/5/6/10', href: '#products', badge: 'RAID' },
      { name: 'Hybrid 5-in-1 DVRs', description: 'TVI/AHD/CVI/IP upgrade controllers', href: '#products' },
      { name: '0.88mm Bezel Video Walls', description: '24/7 mission-critical LCD arrays', href: '#products', badge: '4K' },
      { name: 'Cloud-Hybrid VMS Server', description: 'Multi-site central management software', href: '#products' },
      { name: 'Smart PoE Edge Switches', description: 'Long-range 250m PoE+ managed switches', href: '#products' }
    ]
  },
  {
    title: 'Thermal, Radar & Specialty',
    description: 'Perimeter & harsh environments',
    featuredProduct: {
      name: 'ThermoScan Bi-Spectrum Camera',
      image: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=400&q=80',
      tag: 'Fire Prevention',
      link: '#products'
    },
    links: [
      { name: 'Thermal Fire Detection', description: 'Early temperature hotspot warnings', href: '#products', badge: 'Thermal' },
      { name: 'Millimeter-Wave Radars', description: '300m all-weather perimeter protection', href: '#products', badge: 'Radar' },
      { name: 'ATEX Explosion-Proof Cameras', description: 'Stainless steel housings for oil/gas', href: '#products' },
      { name: 'Mobile Transit CCTV (EN50155)', description: 'Shock-proof rolling-stock recorders', href: '#products' },
      { name: 'Under Vehicle Surveillance', description: 'High-speed automated UVSS scanners', href: '#products' }
    ]
  }
];

export const solutionsMegaMenu: MegaMenuCategory[] = [
  {
    title: 'Infrastructure & Government',
    description: 'City-wide protection & transit',
    links: [
      { name: 'Smart City & Safe City ICCC', description: 'Integrated command & control centers', href: '#solutions', badge: 'Scale' },
      { name: 'Smart Traffic & ANPR', description: 'Speed radar & red-light enforcement', href: '#solutions' },
      { name: 'Public Transit & Metro Rail', description: 'Platform edge safety & onboard CCTV', href: '#solutions' },
      { name: 'Airports & Seaports', description: 'Perimeter radar & runway surveillance', href: '#solutions' }
    ]
  },
  {
    title: 'Commercial & Financial',
    description: 'Loss prevention & banking',
    links: [
      { name: 'Banking & Financial Vaults', description: 'Anti-skimming & dual-custody airlocks', href: '#solutions', badge: 'High-Sec' },
      { name: 'Retail Analytics & Loss Prevention', description: 'Dwell heatmaps & queue alerts', href: '#solutions' },
      { name: 'Gems & Jewellery Showrooms', description: 'Micro-display monitoring & alarms', href: '#solutions' },
      { name: 'Commercial Corporate Parks', description: 'Touchless speed gates & visitor passes', href: '#solutions' }
    ]
  },
  {
    title: 'Industrial & Energy',
    description: 'Worker safety & asset security',
    links: [
      { name: 'Oil & Gas / Chemical Plants', description: 'ATEX explosion-proof systems', href: '#solutions', badge: 'ATEX' },
      { name: 'Manufacturing & Smart Warehouses', description: 'PPE compliance & thermal monitoring', href: '#solutions' },
      { name: 'Electrical Power Substations', description: 'Perimeter radar & transformer thermals', href: '#solutions' },
      { name: 'Data Center Physical Security', description: 'Interlocked server cage biometric locks', href: '#solutions' }
    ]
  },
  {
    title: 'Institutional & Public Spaces',
    description: 'Campuses, healthcare & heritage',
    links: [
      { name: 'Universities & Education', description: 'Attendance terminals & perimeter safety', href: '#solutions' },
      { name: 'Healthcare & Hospital Facilities', description: 'Sterile ICU entry & patient fall AI', href: '#solutions' },
      { name: 'Luxury Hospitality & Resorts', description: 'VIP recognition & discrete surveillance', href: '#solutions' },
      { name: 'Cultural Heritage & Tourism', description: 'Non-invasive archaeological protection', href: '#solutions' }
    ]
  }
];
