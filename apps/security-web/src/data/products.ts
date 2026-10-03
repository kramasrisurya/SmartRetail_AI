import { Product } from '../types';

export const productsData: Product[] = [
  {
    id: 'prod-01',
    name: 'Aegis UltraDark 8K AI PTZ Surveillance Camera',
    model: 'AE-PTZ8836-AIX',
    slug: 'aegis-ultradark-8k-ai-ptz',
    category: 'CCTV Cameras',
    subCategory: 'PTZ Network Cameras',
    shortDescription: '8K Ultra-HD 36x optical zoom with deep learning perimeter protection & 500m laser IR.',
    description: 'The AE-PTZ8836-AIX is engineered for critical infrastructure and expansive perimeter monitoring. Powered by dual neural processing units, it delivers full-color imaging in 0.0005 Lux starlight conditions with automated target tracking across 500 meters.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
    badge: '8K Flagship',
    isNew: true,
    isFeatured: true,
    isPopular: true,
    specs: {
      resolution: '8K UHD (7680 × 4320) @ 30fps',
      sensor: '1/1.2" Progressive Scan CMOS',
      irRange: '500m Laser IR / DarkFighter Ultra',
      wdr: '140 dB True WDR',
      protectionRating: 'IP67 Weatherproof, IK10 Vandal-proof',
      aiFeatures: ['Human & Vehicle Classification', 'Auto-Target Tracking 3.0', 'Perimeter Intrusion', 'Line Crossing'],
      power: 'Hi-PoE / 24 VAC, max 60W',
      operatingTemp: '-40°C to +70°C (-40°F to 158°F)'
    },
    keyFeatures: [
      '36× Optical Zoom, 16× Digital Zoom with rapid focus',
      'Dual AI Chips for simultaneous ANPR and face recognition',
      'Integrated wiper with rain-sensing automatic activation',
      'Built-in gyroscope for optical image stabilization (OIS)'
    ]
  },
  {
    id: 'prod-02',
    name: 'AcuVision 4K DeepinView Dome Camera',
    model: 'AE-IPC7446-WDV',
    slug: 'acuvision-4k-deepinview-dome',
    category: 'CCTV Cameras',
    subCategory: 'Fixed Dome Cameras',
    shortDescription: '4K vandal-proof indoor/outdoor dome with AI queue management and people counting.',
    description: 'Designed for retail banking, healthcare, and educational institutions, this dome camera pairs an ultra-wide 2.8mm lens with on-board edge analytics for retail intelligence and heat-mapping.',
    image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=800&q=80',
    badge: 'Best Seller',
    isNew: false,
    isFeatured: true,
    isPopular: true,
    specs: {
      resolution: '4K (3840 × 2160) @ 30fps',
      sensor: '1/1.8" Target-Master CMOS',
      irRange: '40m Smart EXIR 2.0',
      wdr: '130 dB WDR',
      protectionRating: 'IP67, IK10',
      aiFeatures: ['Regional People Counting', 'Queue Management', 'Loitering Detection', 'Unattended Baggage'],
      power: 'PoE (802.3af) / 12 VDC',
      operatingTemp: '-30°C to +60°C'
    },
    keyFeatures: [
      'MicroSD slot supporting up to 512GB local edge storage',
      'Two-way audio intercom with active noise cancellation',
      'H.265+ Smart Codec saving up to 80% bandwidth'
    ]
  },
  {
    id: 'prod-03',
    name: 'Aegis Guardian Biometric Face & Palm Terminal',
    model: 'AE-AC9800-FPT',
    slug: 'aegis-guardian-biometric-terminal',
    category: 'Access Control',
    subCategory: 'Face & Palm Recognition',
    shortDescription: 'Touchless 0.2s multi-biometric access terminal with mask detection & anti-spoofing.',
    description: 'A touchless high-speed biometric access terminal with dual-lens live face matching and infrared palm vein recognition. Ideal for corporate headquarters, data centers, and cleanrooms.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    badge: 'Touchless 0.2s',
    isNew: true,
    isFeatured: true,
    isPopular: false,
    specs: {
      sensor: 'Dual 2MP Starlight WDR Cameras',
      connectivity: 'TCP/IP, Wi-Fi 6, RS-485, Wiegand, OSDP 2.0',
      protectionRating: 'IP65 Water & Dust Resistant',
      aiFeatures: ['Live Anti-Spoofing AI', 'Mask & Helmet Compliance', '50,000 Face Capacity', '10,000 Palm Capacity'],
      power: '12 VDC / 2A',
      operatingTemp: '-20°C to +60°C'
    },
    keyFeatures: [
      '7-inch IPS High-Bright capacitive touchscreen display',
      'Under 0.2-second recognition speed at up to 3 meters distance',
      'Encrypted BLE mobile credential and QR code visitor pass integration'
    ]
  },
  {
    id: 'prod-04',
    name: 'Enterprise 128-Channel 8K AI NVR Master',
    model: 'AE-NVR9128-16H',
    slug: 'enterprise-128ch-8k-ai-nvr',
    category: 'Network Video Recorders',
    subCategory: 'Enterprise NVRs',
    shortDescription: '128-Channel 8K AI NVR with 16 SATA bays, hot-swap RAID 0/1/5/6/10 & N+1 hot spare.',
    description: 'Built for enterprise multi-site management, high-volume video storage, and centralized AI search. Supports simultaneous decoding of up to 64 1080p channels and redundant power supplies.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    badge: '128-Channel',
    isNew: false,
    isFeatured: true,
    isPopular: true,
    specs: {
      channels: '128 IP Video Channels (up to 32MP per channel)',
      storage: '16 SATA HDDs up to 320TB + 2 eSATA & Mini SAS',
      connectivity: '4× Gigabit RJ45, 2× 10G SFP+ Optical Ports',
      aiFeatures: ['Centralized Facial Re-ID', 'Vehicle License Plate Search', 'Behavioral Pattern Mining'],
      power: 'Redundant 100-240 VAC Dual Power Supplies',
      operatingTemp: '-10°C to +55°C'
    },
    keyFeatures: [
      'Hardware RAID 0, 1, 5, 6, 10, 50, 60 with Hot-Spare standby',
      'Dual 4K HDMI independent outputs + 2 VGA displays',
      'ONVIF Profile S, G, T, M conformance for seamless multivendor integration'
    ]
  },
  {
    id: 'prod-05',
    name: 'ThermoScan Dual-Spectrum Thermal Fire & Perimeter Camera',
    model: 'AE-TH6135-FP',
    slug: 'thermoscan-dual-spectrum-thermal-camera',
    category: 'Thermal & Fire',
    subCategory: 'Thermal Bullet Cameras',
    shortDescription: 'Uncooled thermal detector with optical 4K lens for early fire detection & perimeter fencing.',
    description: 'Combines vanadium oxide uncooled thermal imaging with a 4K visible camera to deliver continuous 24/7 temperature monitoring, early fire detection, and long-range perimeter intrusion alerts.',
    image: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80',
    badge: 'Fire AI',
    isNew: true,
    isFeatured: false,
    isPopular: true,
    specs: {
      resolution: 'Thermal 640×512 + Optical 4K 8MP',
      sensor: 'Vanadium Oxide Uncooled Focal Plane Arrays',
      irRange: 'Thermal Detection up to 1,500m / Optical IR 80m',
      protectionRating: 'IP67, NEMA 4X, TVS 6000V Lightning Protection',
      aiFeatures: ['Early Fire & Hotspot Alarm (±2°C accuracy)', 'Smoke Pattern Recognition', 'False Alarm Filtering'],
      power: 'PoE+ / 24 VAC / 12 VDC',
      operatingTemp: '-40°C to +70°C'
    },
    keyFeatures: [
      'Dual-channel visual and thermal bi-spectrum image blending',
      'Configurable temperature measurement rules (points, lines, areas)',
      'Built-in white strobe light and audible voice broadcast siren'
    ]
  },
  {
    id: 'prod-06',
    name: 'SmartTraffic ANPR & Speed Radar Bullet Camera',
    model: 'AE-TC4400-ANPR',
    slug: 'smarttraffic-anpr-radar-bullet',
    category: 'CCTV Cameras',
    subCategory: 'Traffic & ANPR Cameras',
    shortDescription: 'High-speed license plate recognition & Doppler radar speed detection up to 250 km/h.',
    description: 'Engineered for smart city intersections, toll highways, and secure campus entry gates. Captures license plates, vehicle color, make, model, and velocity with over 98.5% accuracy.',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    badge: 'ANPR Radar',
    isNew: false,
    isFeatured: true,
    isPopular: false,
    specs: {
      resolution: '4MP @ 60fps Global Shutter',
      sensor: '1/1.8" Global Shutter CMOS',
      irRange: '50m High-Power Pulsed IR Illumination',
      protectionRating: 'IP67, IK10, Anti-Corrosion Housing',
      aiFeatures: ['Multi-Country License Plate Recognition', 'Vehicle Classification', 'Wrong-Way Driving Alert', 'Speed Violation Tracking'],
      power: '12-24 VDC / PoE+',
      operatingTemp: '-40°C to +70°C'
    },
    keyFeatures: [
      'Built-in 24GHz Doppler radar for vehicle speed measurement',
      'Global shutter prevents high-speed motion blur up to 250 km/h',
      'Motorized 8-32mm optical lens with autofocus'
    ]
  },
  {
    id: 'prod-07',
    name: 'PerimeterGuard 360° Security Radar & PTZ Fusion',
    model: 'AE-RDR7200-PTZ',
    slug: 'perimeterguard-360-radar-ptz-fusion',
    category: 'Alarms & Radar',
    subCategory: 'Security Radar Systems',
    shortDescription: 'Millimeter-wave 360° radar with automated PTZ tracking for zero blind-spot protection.',
    description: 'Integrates 77GHz MIMO phased-array radar with a precision starlight PTZ camera. Detects human and vehicle intruders through rain, dense fog, snow, and smoke up to 300 meters away.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    badge: 'All-Weather 360°',
    isNew: true,
    isFeatured: true,
    isPopular: false,
    specs: {
      resolution: 'Radar 360° Azimuth + PTZ 4K Camera',
      sensor: '77GHz Millimeter Wave Radar Array',
      irRange: 'Radar 300m Detection / PTZ 200m Smart IR',
      protectionRating: 'IP67, IK10',
      aiFeatures: ['Target Vector Tracking', 'Multi-Object Trajectory Fusion', 'Immunity to Foliage False Alarms'],
      power: 'Hi-PoE / 24 VAC',
      operatingTemp: '-40°C to +65°C'
    },
    keyFeatures: [
      'Automated radar-to-PTZ handoff with zero manual calibration delay',
      'Tracks up to 32 targets simultaneously with exact coordinates and speed',
      'Immune to spiders, rain droplets, swaying branches, and headlight glare'
    ]
  },
  {
    id: 'prod-08',
    name: 'Aegis Commander 55" 4K Video Wall Display Unit',
    model: 'AE-VW5500-UHD',
    slug: 'aegis-commander-55-videowall',
    category: 'Displays & Video Walls',
    subCategory: 'Command Center Displays',
    shortDescription: '55" Ultra-narrow 0.88mm bezel 4K industrial LCD display for 24/7 security NOC control rooms.',
    description: 'Designed for mission-critical command centers, security operations hubs, and city surveillance rooms. Features anti-glare IPS panels, 700 nits brightness, and 24/7 continuous duty cycle rating.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    badge: '0.88mm Bezel',
    isNew: false,
    isFeatured: false,
    isPopular: true,
    specs: {
      resolution: '4K Ultra-HD (3840 × 2160)',
      connectivity: 'HDMI 2.0 In/Out, DP 1.2 In/Out, RS232, RJ45 LAN',
      protectionRating: 'Industrial Metal Enclosure, Dust-Resistant',
      power: '100-240 VAC, 50/60 Hz',
      operatingTemp: '0°C to +40°C (24/7 Continuous Operation)'
    },
    keyFeatures: [
      'Razor-thin 0.88mm total bezel-to-bezel seam for virtually seamless video walls',
      '700 cd/m² high brightness with 50,000-hour LED backlight lifespan',
      'Built-in daisy chain loop-through supporting up to 15×15 video wall matrix'
    ]
  },
  {
    id: 'prod-09',
    name: 'Aegis SpeedGate Flap Barrier Turnstile',
    model: 'AE-TS3000-PRO',
    slug: 'aegis-speedgate-flap-barrier',
    category: 'Access Control',
    subCategory: 'Turnstiles & Speed Gates',
    shortDescription: 'Brushed SUS304 stainless steel speed gate with servo drive & integrated face terminal slots.',
    description: 'Engineered for modern corporate lobbies, high-security government facilities, and transit hubs. Features whisper-quiet brushless DC servo motors, 12 pairs of infrared anti-tailgating sensors, and customizable LED lane indicators.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    badge: 'High Throughput',
    isNew: true,
    isFeatured: false,
    isPopular: true,
    specs: {
      connectivity: 'Dry Contact, RS-485, TCP/IP Ethernet',
      protectionRating: 'IP54 Indoor/Covered Outdoor',
      aiFeatures: ['12-Pair IR Anti-Tailgating', 'Anti-Pinch Safety Sensors', 'Emergency Breakaway Mode'],
      power: '100-240 VAC, 50W',
      operatingTemp: '-25°C to +70°C'
    },
    keyFeatures: [
      'Throughput capacity up to 45 persons per minute',
      'Fire alarm linkage opens barriers automatically for safe evacuation',
      'Tempered glass wings with configurable illuminated dynamic LED lighting'
    ]
  },
  {
    id: 'prod-10',
    name: 'AcuSense 4MP Starlight Bullet Camera',
    model: 'AE-IPC2143-EXIR',
    slug: 'acusense-4mp-starlight-bullet',
    category: 'CCTV Cameras',
    subCategory: 'Fixed Bullet Cameras',
    shortDescription: '4MP Starlight bullet with AcuSense false-alarm reduction and 80m EXIR night vision.',
    description: 'A versatile workhorse camera for commercial perimeters, warehouse docks, and parking facilities. Employs AcuSense deep learning algorithms to filter out leaves, shadows, and animals, focusing strictly on human and vehicle targets.',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    badge: 'Popular',
    isNew: false,
    isFeatured: false,
    isPopular: true,
    specs: {
      resolution: '4MP (2688 × 1520) @ 30fps',
      sensor: '1/2.7" Progressive Scan CMOS',
      irRange: '80m Smart EXIR 2.0',
      wdr: '120 dB WDR',
      protectionRating: 'IP67 Weatherproof',
      aiFeatures: ['Human & Vehicle Target Classification', 'AcuSense False-Alarm Reduction'],
      power: 'PoE (802.3af) / 12 VDC',
      operatingTemp: '-30°C to +60°C'
    },
    keyFeatures: [
      'High-durability all-metal aluminum housing with sunshield',
      'Built-in microphone for synchronized audio capture',
      'H.265+ encoding for ultra-low bandwidth consumption'
    ]
  },
  {
    id: 'prod-11',
    name: 'Aegis Hybrid 32-Channel Pro DVR System',
    model: 'AE-DVR732-4K',
    slug: 'aegis-hybrid-32ch-pro-dvr',
    category: 'Network Video Recorders',
    subCategory: 'Hybrid DVRs',
    shortDescription: '32-Channel 5-in-1 DVR supporting TVI, AHD, CVI, CVBS, and IP cameras with AcuSense AI.',
    description: 'Perfect for legacy system upgrades, this 32-channel DVR enables enterprise clients to migrate existing coaxial cameras to high-definition AI analytics without replacing cable infrastructure.',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    badge: 'Hybrid AI',
    isNew: false,
    isFeatured: false,
    isPopular: false,
    specs: {
      channels: '32 Analog Channels + 16 IP Channels',
      storage: '4 SATA HDDs up to 40TB',
      connectivity: '2× RJ45, HDMI 4K, VGA, RS-485, Alarm 16/4',
      aiFeatures: ['Coaxial AI Face Detection', 'Motion Detection 2.0 on all channels'],
      power: '100-240 VAC, 45W',
      operatingTemp: '-10°C to +55°C'
    },
    keyFeatures: [
      '5-in-1 video input compatibility (HD-TVI, AHD, CVI, CVBS, IP)',
      'Long-distance coaxial video transmission up to 800m',
      'Cloud P2P mobile app access with instant push notifications'
    ]
  },
  {
    id: 'prod-12',
    name: 'Aegis Smart IP Video Intercom Villa Door Station',
    model: 'AE-INT9100-IP',
    slug: 'aegis-smart-video-intercom',
    category: 'Access Control',
    subCategory: 'Video Intercoms',
    shortDescription: '2MP Starlight wide-angle intercom with RFID card reader, mobile app calls & SIP 2.0.',
    description: 'A sleek surface-mount IP video intercom door station designed for luxury estates, executive offices, and multi-tenant commercial suites. Features a 180° fisheye camera with IR and two-way crystal-clear audio.',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
    badge: 'SIP 2.0',
    isNew: true,
    isFeatured: false,
    isPopular: false,
    specs: {
      resolution: '2MP Full HD 1080p Starlight',
      connectivity: 'Standard PoE / Wi-Fi / RS-485 / Wiegand',
      protectionRating: 'IP65, IK08 Zinc Alloy Housing',
      aiFeatures: ['Facial Snapshot on Ring', 'Mifare / NFC Card Reader', 'SIP Protocol VoIP Calling'],
      power: 'Standard PoE (802.3af) / 12 VDC',
      operatingTemp: '-40°C to +55°C'
    },
    keyFeatures: [
      '180° ultra-wide panoramic field of view with distortion correction',
      'Direct mobile phone video call forwarding with remote door release',
      'Tamper-proof alarm switch with instant notification'
    ]
  }
];
