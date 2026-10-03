import { Solution } from '../types';

export const solutionsData: Solution[] = [
  {
    id: 'sol-01',
    title: 'Smart Traffic & ANPR Management',
    slug: 'smart-traffic-anpr',
    category: 'Transportation',
    iconName: 'Car',
    shortDescription: 'High-speed license plate recognition, automated red-light enforcement, and adaptive signal control.',
    fullDescription: 'Our end-to-end intelligent transportation solution combines 4K global-shutter ANPR cameras with Doppler radar and AI edge processors to detect speed violations, wrong-way driving, and traffic bottlenecks across national highways and urban corridors.',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      '98.5%+ license plate capture accuracy across 80+ countries',
      'Instant vehicle blacklisting alerts directly to traffic police control rooms',
      'Real-time congestion heatmaps for automated traffic light cycle balancing'
    ],
    recommendedProducts: ['SmartTraffic ANPR Bullet', 'Enterprise 128ch NVR', 'Aegis 55" Video Wall'],
    stats: {
      label: 'Accident Reduction',
      value: '38%'
    }
  },
  {
    id: 'sol-02',
    title: 'Education & Smart Campuses',
    slug: 'education-smart-campuses',
    category: 'Education',
    iconName: 'GraduationCap',
    shortDescription: 'Unified student safety, touchless attendance, perimeter intrusion, and emergency broadcast systems.',
    fullDescription: 'Protects K-12 schools, universities, and student dormitories with integrated facial attendance, perimeter radar barriers, library access turnstiles, and instant active-threat lock-down protocols.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Automated parent notifications on student arrival and bus boarding',
      'Panic button linkage with automated strobe lights and two-way audio sirens',
      'Dormitory biometric curfew monitoring and unauthorized visitor detection'
    ],
    recommendedProducts: ['AcuVision 4K Dome Camera', 'Aegis Guardian Face Terminal', 'SpeedGate Turnstile'],
    stats: {
      label: 'Campuses Secured',
      value: '1,200+'
    }
  },
  {
    id: 'sol-03',
    title: 'Banking & Financial Vault Security',
    slug: 'banking-financial-security',
    category: 'Finance',
    iconName: 'Building2',
    shortDescription: 'Anti-skimming ATM surveillance, multi-custody vault access, and central branch auditing.',
    fullDescription: 'Bank branches and cash-in-transit depots require defense-in-depth. Aegis provides pinhole covert ATM cameras, dual-biometric interlocked mantrap doors, and central video auditing to eliminate internal fraud and external robbery.',
    image: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Atm skimming and loitering detection with immediate alarm broadcast',
      'Two-person rule (dual-biometric) verification for cash vault doors',
      'Centralized 10,000-branch compliance monitoring from national NOC'
    ],
    recommendedProducts: ['Aegis Guardian Face Terminal', '128ch 8K NVR', 'AcuVision Dome Camera'],
    stats: {
      label: 'Bank Branches Protected',
      value: '15,000+'
    }
  },
  {
    id: 'sol-04',
    title: 'Healthcare & Hospital Facilities',
    slug: 'healthcare-hospital-facilities',
    category: 'Healthcare',
    iconName: 'Activity',
    shortDescription: 'Touchless ICU access, pharmacy drug vault security, patient fall detection, and infant protection.',
    fullDescription: 'Hospital environments demand sterile, touchless operations paired with high security. Aegis delivers optical patient fall detection AI, touchless palm-vein access for surgical cleanrooms, and thermal fire safety across medical gas storage.',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Touchless biometric doors for operating rooms to preserve surgical sterility',
      'Optical AI patient fall detection in geriatric and recovery wards',
      'Pharmacy controlled-substance cabinet multi-factor authentication'
    ],
    recommendedProducts: ['Aegis Guardian Face Terminal', 'AcuVision Dome Camera', 'ThermoScan Thermal Camera'],
    stats: {
      label: 'Fall Response Speed',
      value: '< 45s'
    }
  },
  {
    id: 'sol-05',
    title: 'Industrial & Smart Manufacturing',
    slug: 'industrial-smart-manufacturing',
    category: 'Manufacturing',
    iconName: 'Factory',
    shortDescription: 'PPE safety compliance, thermal machinery hotspot monitoring, and automated loading bay dispatch.',
    fullDescription: 'Protects workers and high-value machinery across automotive plants, heavy chemical works, and logistics distribution centers with automated helmet/vest compliance AI and thermal early-warning sensors.',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Automated PPE detection (helmets, high-vis vests, goggles) with instant voice alerts',
      'Continuous thermal monitoring of transformers, conveyor belts, and motors',
      'Perimeter laser and radar virtual fences for high-voltage and toxic zones'
    ],
    recommendedProducts: ['ThermoScan Thermal Camera', 'PerimeterGuard 360 Radar', 'Aegis UltraDark 8K PTZ'],
    stats: {
      label: 'Downtime Reduced',
      value: '42%'
    }
  },
  {
    id: 'sol-06',
    title: 'Public Transit & Metro Systems',
    slug: 'public-transit-metros',
    category: 'Transit',
    iconName: 'Train',
    shortDescription: 'Platform edge safety, passenger flow analytics, onboard mobile NVRs, and fare-gate integration.',
    fullDescription: 'High-density railway stations and metro networks rely on Aegis for platform screen door monitoring, crowded stairwell bottleneck alerts, onboard rugged EN50155 mobile NVRs, and high-throughput passenger turnstiles.',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Platform track-fall virtual line alarms trigger instant emergency train braking',
      'Station crowd density forecasting to regulate escalator and turnstile flows',
      'EN50155 certified vibration-resistant onboard rolling-stock cameras'
    ],
    recommendedProducts: ['SpeedGate Turnstile', 'Aegis UltraDark 8K PTZ', 'Enterprise 128ch NVR'],
    stats: {
      label: 'Daily Commuters Protected',
      value: '25M+'
    }
  },
  {
    id: 'sol-07',
    title: 'Smart City & Safe City Infrastructure',
    slug: 'smart-city-urban-surveillance',
    category: 'Government',
    iconName: 'ShieldCheck',
    shortDescription: 'City-wide AI camera matrix, integrated command & control center (ICCC), and emergency panic pillars.',
    fullDescription: 'Unifies municipal police, emergency dispatch, and traffic authorities with city-wide video surveillance, automated license plate tracking, acoustic gunshot/screaming detection, and interactive emergency SOS poles.',
    image: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Centralized Video Management System (VMS) scaling to 50,000+ camera nodes',
      'Integrated GIS map tracking of emergency vehicles, suspects, and active incidents',
      'Solar-powered wireless surveillance trailers for temporary public events'
    ],
    recommendedProducts: ['Aegis UltraDark 8K PTZ', 'Aegis 55" Video Wall', '128ch 8K NVR'],
    stats: {
      label: 'Cities Deployed',
      value: '65+'
    }
  },
  {
    id: 'sol-08',
    title: 'Retail Intelligence & Loss Prevention',
    slug: 'retail-intelligence-loss-prevention',
    category: 'Commercial',
    iconName: 'ShoppingBag',
    shortDescription: 'Shopper dwell heatmaps, checkout queue alerts, EAS anti-theft linkage, and conversion tracking.',
    fullDescription: 'Transform security cameras into revenue drivers. Gain complete visibility into customer shopping journeys, endcap display dwell times, cashier line congestion, and organized retail crime (ORC) shoplifting deterrence.',
    image: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Dynamic aisle heatmaps to optimize high-margin product placement',
      'Automated cashier alerts when queue lengths exceed 3 customers',
      'Integration with POS transactions to flag cashier sweethearting and void fraud'
    ],
    recommendedProducts: ['AcuVision 4K Dome Camera', 'Aegis Guardian Face Terminal', 'AcuSense Bullet Camera'],
    stats: {
      label: 'Shrinkage Reduction',
      value: '64%'
    }
  },
  {
    id: 'sol-09',
    title: 'Luxury Hospitality & Resorts',
    slug: 'luxury-hospitality-hotels',
    category: 'Hospitality',
    iconName: 'Hotel',
    shortDescription: 'VIP guest recognition, keyless elevator access, pool safety radar, and perimeter discretion.',
    fullDescription: 'Designed for 5-star hotels and luxury resorts. Provides discreet, aesthetically blended architectural cameras, seamless mobile keycard integration, VIP guest arrival notifications, and swimming pool thermal safety alarms.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'VIP guest arrival detection alerts concierge teams in real time',
      'Aesthetic discreet dome cameras matching high-end hotel interior decor',
      'Swimming pool night-time perimeter alarms preventing after-hours drowning risks'
    ],
    recommendedProducts: ['Aegis Smart Video Intercom', 'AcuVision 4K Dome', 'PerimeterGuard 360 Radar'],
    stats: {
      label: 'Guest Rating Improvement',
      value: '+22%'
    }
  },
  {
    id: 'sol-10',
    title: 'Gems, Jewellery & Precious Asset Vaults',
    slug: 'gems-jewellery-vaults',
    category: 'Commercial',
    iconName: 'Gem',
    shortDescription: 'Micro-display showcase monitoring, dual-biometric interlocked airlocks, and vibration sensing.',
    fullDescription: 'Jewellery showrooms and diamond cutting facilities require maximum precision security. Aegis offers 4K ultra-macro showcase cameras, tamper-proof seismic glass break sensors, and dual-custody palm vein biometric airlocks.',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      '4K macro-lens cameras inspecting customer item hand-offs at counter level',
      'Interlocking mantrap security doors allowing only one person per authentication',
      'Concealed silent foot pedals and wireless duress transmitters'
    ],
    recommendedProducts: ['Aegis Guardian Face Terminal', 'AcuVision 4K Dome', 'Aegis 128ch NVR'],
    stats: {
      label: 'High-Value Vaults Secured',
      value: '4,500+'
    }
  },
  {
    id: 'sol-11',
    title: 'Cultural Heritage & Tourism Sites',
    slug: 'cultural-heritage-tourism',
    category: 'Government',
    iconName: 'Landmark',
    shortDescription: 'Discreet non-invasive mounting, visitor density regulation, and artifact touch detection.',
    fullDescription: 'Protects UNESCO world heritage monuments, historic forts, and art museums without compromising archaeological aesthetics. Features wireless long-range solar transmission and virtual laser fences around priceless artifacts.',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'Virtual line tripwires alert museum staff the instant a visitor reaches towards paintings',
      'Non-invasive wireless cameras requiring zero wall drilling into historic stone',
      'Continuous crowd density balancing across narrow monument walkways'
    ],
    recommendedProducts: ['Aegis UltraDark 8K PTZ', 'AcuVision Dome Camera', 'PerimeterGuard 360 Radar'],
    stats: {
      label: 'Monuments Preserved',
      value: '350+'
    }
  },
  {
    id: 'sol-12',
    title: 'Energy, Oil & Critical Infrastructure',
    slug: 'energy-critical-infrastructure',
    category: 'Energy',
    iconName: 'Zap',
    shortDescription: 'Explosion-proof ATEX cameras, thermal flare stack inspection, and sub-station security.',
    fullDescription: 'Engineered for oil refineries, electrical substations, nuclear power plants, and solar farms. Features ATEX/IECEx explosion-proof stainless steel housings, thermal hotspot leak detection, and drone defense radar integration.',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    keyBenefits: [
      'ATEX certified 316L stainless steel explosion-proof camera enclosures',
      'Continuous thermal gas leak and electrical transformer hotspot alarms',
      'Autonomous radar perimeter fences covering up to 10 square kilometers'
    ],
    recommendedProducts: ['ThermoScan Thermal Camera', 'PerimeterGuard 360 Radar', 'Aegis UltraDark 8K PTZ'],
    stats: {
      label: 'Critical Substations',
      value: '800+'
    }
  }
];
