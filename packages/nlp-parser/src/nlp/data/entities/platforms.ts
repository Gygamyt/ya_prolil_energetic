// export const PLATFORMS: string[] = [
//     'PC', 'Windows', 'Linux', 'macOS', 'iOS', 'Android',
//     'Xbox', 'PlayStation', 'PS4', 'PS5', 'Nintendo Switch', 'Mobile',
//     'Web',
//     'Raspberry Pi', 'Mac',
//     'macOS',
//     'Windows', 'Unix',
//     'VDI', 'Mainframe',
//     'z/OS'
// ];

// src/nlp-data/entities/platforms.ts

export const PLATFORMS = {
    desktop_os: [
        'Windows',
        'Linux',
        'macOS',
        'Unix'
    ],
    mobile_os: [
        'iOS',
        'Android',
        'Mobile'
    ],
    gaming_consoles: [
        'Xbox',
        'PlayStation', 'PS4', 'PS5',
        'Nintendo Switch'
    ],
    web: [
        'Web'
    ],
    hardware: [
        'PC',
        'Mac',
        'Raspberry Pi'
    ],
    enterprise: [
        'Mainframe',
        'z/OS',
        'VDI' // Virtual Desktop Infrastructure
    ]
};

