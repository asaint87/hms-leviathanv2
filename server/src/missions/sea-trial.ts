import type { Mission } from '@leviathan/shared';

export const SEA_TRIAL: Mission = {
  id: 'sea-trial',
  name: 'SEA TRIAL',
  badge: 'I',
  brief: 'Crew, this is your first dive. Every station needs to come online and prove it works. I will walk you through it. Listen for your station name — when I call you, follow the instructions on your screen. Let\'s bring this boat to life.',

  steps: [
    // --- STEP 1: Engineer powers up ---
    {
      id: 'st-1',
      captainSay: 'Engineer — we\'re running dark. I need power to the boat. Put two blocks on Engines and two on Sonar. We need to move and we need to see.',
      captainHint: 'Watch the power bars on your tactical overview. They\'ll light up when Engineer allocates.',
      crewTasks: [
        {
          station: 'engineer',
          text: 'Drag power blocks to ENGINES (2) and SONAR (2).',
          hint: 'Tap the empty blocks next to each system to fill them.',
        },
      ],
      waitFor: ['engineer'],
      autoConfirmOn: [{ station: 'engineer', action: 'allocate_power' }],
    },

    // --- STEP 2: Sonar pings ---
    {
      id: 'st-2',
      captainSay: 'Sonar — the water is quiet and we are blind. Put a ping in the water. Tell me what you see out there.',
      captainHint: 'When Sonar pings, you\'ll get a prompt showing what they found. Read it aloud to the crew.',
      crewTasks: [
        {
          station: 'sonar',
          text: 'Tap any blip on the sweep to PING it.',
          hint: 'The glowing dots are contacts. Tap one to identify it.',
        },
      ],
      waitFor: ['sonar'],
      autoConfirmOn: [{ station: 'sonar', action: 'ping_contact' }],
    },

    // --- STEP 3: Sonar tracks ---
    {
      id: 'st-3',
      captainSay: 'Good contact, Sonar. Now lock onto it — I want to keep eyes on that one. Tap it again to track it.',
      captainHint: 'A tracked contact gets a glowing ring. This feeds into Signals\' creature ID system later.',
      crewTasks: [
        {
          station: 'sonar',
          text: 'Tap the contact you just pinged, then tap TRACK.',
          hint: 'Select a pinged contact, then tap it again or press TRACK.',
        },
      ],
      waitFor: ['sonar'],
      autoConfirmOn: [{ station: 'sonar', action: 'track_contact' }],
    },

    // --- STEP 4: Navigator sets course ---
    {
      id: 'st-4',
      captainSay: 'Navigator — I want us moving. Plot a course to the Kelp Forest. Double-click the map to set waypoints.',
      captainHint: 'The sub will start moving along the plotted course. Watch speed change on your overview.',
      crewTasks: [
        {
          station: 'navigator',
          text: 'Double-click the map to plot a course toward KELP FOREST.',
          hint: 'Look for the star marker labeled "Kelp Forest" on the chart.',
        },
      ],
      waitFor: ['navigator'],
      autoConfirmOn: [{ station: 'navigator', action: 'plot_course' }],
    },

    // --- STEP 5: Navigator adjusts depth ---
    {
      id: 'st-5',
      captainSay: 'Navigator — take us deeper. Adjust depth to 100 meters. Use the depth controls on your panel.',
      captainHint: 'Depth changes affect what Sonar can detect and what\'s visible in Window mode.',
      crewTasks: [
        {
          station: 'navigator',
          text: 'Press the DOWN arrow to increase depth to 100m.',
          hint: 'Use the up/down arrows next to the depth bar.',
        },
      ],
      waitFor: ['navigator'],
      autoConfirmOn: [{ station: 'navigator', action: 'adjust_depth' }],
    },

    // --- STEP 6: Engineer rebalances ---
    {
      id: 'st-6',
      captainSay: 'Engineer — we\'re moving now but I want more speed. Push Engines to three blocks. You\'ll need to pull power from somewhere else — your call.',
      captainHint: 'This teaches the budget constraint. Engineer has to sacrifice one system to boost another. Watch which one they choose.',
      crewTasks: [
        {
          station: 'engineer',
          text: 'Set ENGINES to 3 blocks. You\'ll need to reduce another system.',
          hint: 'You only have 8 blocks total. Every HIGH costs somewhere else.',
        },
      ],
      waitFor: ['engineer'],
      autoConfirmOn: [{ station: 'engineer', action: 'allocate_power' }],
    },

    // --- STEP 7: Signals checks comms ---
    {
      id: 'st-7',
      captainSay: 'Signals — check your board. We should be picking up transmissions. If anything comes in encrypted, try to decode it. Click the waveform, then type your best guess.',
      captainHint: 'Signals may not have a transmission yet. If the queue is empty, tell them to stand by — one will come in shortly.',
      crewTasks: [
        {
          station: 'signals',
          text: 'Check the Signal Monitor. Click any waveform to read the transmission.',
          hint: 'Encrypted messages need you to type a decoded answer. Try anything — we\'re just practicing.',
        },
      ],
      waitFor: ['signals'],
      autoConfirmOn: [{ station: 'signals', action: 'decode_transmission' }],
    },

    // --- STEP 8: Captain sets condition ---
    {
      id: 'st-8',
      captainSay: 'All stations — good work. I\'m setting condition to ALERT. Engineer, you\'ll see my suggested power layout. You can accept it or override — your boat, your call.',
      captainHint: 'Tap ALERT in your Condition panel. Engineer will see a suggestion banner.',
      crewTasks: [
        {
          station: 'engineer',
          text: 'Captain is setting a condition. Watch for the suggestion banner.',
          hint: 'You can ACCEPT the Captain\'s preset or OVERRIDE to keep your own layout.',
        },
      ],
      waitFor: ['captain'],
      requireCaptainAdvance: true,
    },

    // --- STEP 9: All stations report ---
    {
      id: 'st-9',
      captainSay: 'All stations — report status. Sound off when ready. We\'re about to leave safe waters.',
      captainHint: 'Each crew member taps READY on their screen. When all four confirm, you tap CONTINUE.',
      crewTasks: [
        {
          station: 'sonar',
          text: 'Report status to Captain. Press READY.',
          hint: 'Say "Sonar — all clear" to the Captain.',
        },
        {
          station: 'navigator',
          text: 'Report status to Captain. Press READY.',
          hint: 'Say "Navigator — on course" to the Captain.',
        },
        {
          station: 'engineer',
          text: 'Report status to Captain. Press READY.',
          hint: 'Say "Engineer — systems nominal" to the Captain.',
        },
        {
          station: 'signals',
          text: 'Report status to Captain. Press READY.',
          hint: 'Say "Signals — monitoring all channels" to the Captain.',
        },
      ],
      waitFor: ['sonar', 'navigator', 'engineer', 'signals'],
      requireCaptainAdvance: true,
    },

    // --- STEP 10: Mission complete ---
    {
      id: 'st-10',
      captainSay: 'This is HMS Leviathan. All stations manned and operational. Sea trial complete. Good work, crew. Now the real dive begins.',
      captainHint: 'That\'s the tutorial done. The crew now knows their stations. Free play continues.',
      crewTasks: [],
      waitFor: [],
      requireCaptainAdvance: true,
    },
  ],
};
