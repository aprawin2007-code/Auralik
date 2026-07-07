/**
 * =========================================
 * AURA CHAT FRONTEND CONTROLLER
 * =========================================
 * Coordinates SPA navigation, custom UI components,
 * media simulation (HTML5 Canvas), matching workflow, 
 * simulated remote messaging, and toast alerts.
 */

class AuraApplication {
  constructor() {
    // Current application state
    this.state = {
      currentPage: 'landing-view',
      username: 'Aura Traveler',
      selectedRegion: 'global',
      selectedInterests: ['tech'],
      devices: {
        camera: 'default',
        audio: 'default',
        autoMute: false
      },
      isSearching: false,
      currentMatch: null,
      isMicMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      localStream: null,
      searchTimer: null,
      onboardingStep: 1,
      onboardingInterests: ['tech'],
      onboardingLang: 'en',
      callTimerInterval: null,
      callDurationSeconds: 0,
      activeSocialChatId: null,
      socialSearchQuery: '',
      socialActiveTab: 'recent',
      friends: [
        {
          id: 1,
          name: "Aria Vance",
          location: "Stockholm, SE",
          color: "hsl(263, 85%, 65%)",
          status: "online",
          avatar: "AV",
          unread: 2,
          messages: [
            { text: "Hey! Loved our conversation about UI/UX design last time.", direction: "incoming", time: "10:14 AM" },
            { text: "Thanks Aria! Aura is looking amazing.", direction: "outgoing", time: "10:15 AM" },
            { text: "Have you tested the new immersive full-bleed layouts yet?", direction: "incoming", time: "10:20 AM" }
          ],
          replies: [
            "Oh yes, that draggable preview feels super responsive!",
            "I'll share my screen to show you some mockup design vectors.",
            "Catch you later in the lobby chat circles!"
          ],
          lastTime: "10:20 AM"
        },
        {
          id: 2,
          name: "Devon Chen",
          location: "Toronto, CA",
          color: "hsl(190, 95%, 45%)",
          status: "away",
          avatar: "DC",
          unread: 0,
          messages: [
            { text: "Are we gaming tonight?", direction: "incoming", time: "Yesterday" }
          ],
          replies: [
            "Nice! Count me in.",
            "I am busy tweaking some WebRTC signaling parameters."
          ],
          lastTime: "Yesterday"
        },
        {
          id: 3,
          name: "Kai Tanaka",
          location: "Tokyo, JP",
          color: "hsl(142, 70%, 48%)",
          status: "online",
          avatar: "KT",
          unread: 1,
          messages: [
            { text: "Aura's design system playground is gorgeous.", direction: "incoming", time: "Yesterday" }
          ],
          replies: [
            "Arigato! Standard HSL styling is highly customizable.",
            "Let's chat about responsive layouts next time."
          ],
          lastTime: "Yesterday"
        }
      ]
    };

    // Database of simulated strangers for matching based on interests
    this.mockStrangers = [
      { 
        name: "Aria Vance", 
        location: "Stockholm, SE", 
        interest: "design", 
        color: "hsl(263, 85%, 65%)",
        replies: [
          "Hey there! The typography scale in this chat feels so clean.",
          "I really appreciate the 8px grid. The spacing is super elegant.",
          "The interactive transition animations here are top-tier. Did you design them?",
          "It's rare to see custom HTML inputs that are this accessible and stylish."
        ] 
      },
      { 
        name: "Devon Chen", 
        location: "San Francisco, US", 
        interest: "tech", 
        color: "hsl(190, 95%, 45%)",
        replies: [
          "What's up! The WebRTC signaling latency here feels incredibly low.",
          "I'm currently coding a custom CSS framework. Your design tokens are beautiful.",
          "Dark mode by default is a major plus. It saves my eyes during night sessions.",
          "Are you using hardware acceleration for these canvas particle systems?"
        ] 
      },
      { 
        name: "Ren Sato", 
        location: "Tokyo, JP", 
        interest: "gaming", 
        color: "hsl(38, 92%, 50%)",
        replies: [
          "Yo! The refresh rate on this matching UI is super smooth.",
          "Are you playing anything competitive this weekend?",
          "This room is way cleaner than other messy chat sites. Absolutely minimal.",
          "Nice matching setup. Tech filtering works perfectly!"
        ] 
      },
      { 
        name: "Elena Rostova", 
        location: "Berlin, DE", 
        interest: "music", 
        color: "hsl(142, 70%, 48%)",
        replies: [
          "Hello! The audio channels sound exceptionally crisp here.",
          "I was just listening to some ambient synth loops before we matched.",
          "Your profile layout has a gorgeous glassmorphism effect.",
          "Do you create music, or do you just enjoy listening?"
        ] 
      }
    ];

    // Animation frames storage
    this.animationFrames = {
      local: null,
      remote: null,
      hero: null
    };

    // DOM Bindings
    this.initDOM();
    // Event listeners
    this.bindEvents();
    // Initialize components
    this.initCustomSelects();
    // Initialize Hero Background Animation
    this.initHeroCanvasAnimation();
    // Initialize Scroll Reveal Observers
    this.initScrollReveal();
    // Initialize FAQ accordion triggers
    this.initFAQAccordions();
    // Render initial icons
    lucide.createIcons();
  }

  initDOM() {
    this.pages = document.querySelectorAll('.page-view');
    this.navButtons = document.querySelectorAll('.nav-links button[data-page]');
    
    // Inputs & select elements
    this.usernameInput = document.getElementById('username-input');
    this.interestTags = document.querySelectorAll('.interest-tag');
    
    // Matching controls
    this.lobbyActionBtn = document.getElementById('lobby-action-btn');
    this.lobbyPulsar = document.getElementById('lobby-action-pulsar');
    this.lobbyIcon = document.getElementById('lobby-action-icon');
    this.lobbyStatusTitle = document.getElementById('lobby-status-title');
    this.lobbyStatusDesc = document.getElementById('lobby-status-desc');
    
    // Video elements
    this.localVideo = document.getElementById('local-video-stream');
    this.localCanvas = document.getElementById('local-mock-canvas');
    this.remoteCanvas = document.getElementById('remote-mock-canvas');
    this.localPlaceholder = document.getElementById('local-placeholder');
    this.remotePlaceholder = document.getElementById('remote-placeholder');
    this.remoteMatchingStatus = document.getElementById('remote-matching-status');
    this.remoteLabel = document.getElementById('remote-label-text');
    
    // Call buttons
    this.btnMic = document.getElementById('ctrl-mic');
    this.btnVideo = document.getElementById('ctrl-video');
    this.btnShare = document.getElementById('ctrl-share');
    this.btnNext = document.getElementById('ctrl-next');
    this.btnDisconnect = document.getElementById('ctrl-disconnect');
    
    // Chat sidebar elements
    this.chatDrawer = document.getElementById('call-chat-drawer');
    this.chatMessages = document.getElementById('chat-messages-container');
    this.chatInput = document.getElementById('chat-text-input');
    this.chatSendBtn = document.getElementById('chat-send-btn');
    this.mobileChatToggle = document.getElementById('mobile-chat-toggle');
    this.closeChatBtn = document.getElementById('close-chat-drawer');
    this.chatBackdrop = document.getElementById('chat-drawer-backdrop');

    // Settings elements
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsTrigger = document.getElementById('settings-trigger');
    this.settingsAutoMute = document.getElementById('settings-auto-mute');

    // Hero backdrop element
    this.heroCanvas = document.getElementById('hero-canvas-bg');

    // Onboarding Elements
    this.onboardingSteps = document.querySelectorAll('.onboarding-step');
    this.onboardingStepLabel = document.getElementById('onboarding-step-label');
    this.onboardingProgressFill = document.getElementById('onboarding-progress-fill');
    this.onboardNickname = document.getElementById('onboard-nickname');
    this.onboardInterests = document.getElementById('onboard-interests');
    this.onboardPledgeCheck = document.getElementById('onboard-pledge-check');
    this.onboardFinalizeBtn = document.getElementById('onboard-finalize-btn');
    this.onboardCameraBtn = document.getElementById('onboard-grant-camera');
    this.onboardMicBtn = document.getElementById('onboard-grant-mic');

    // Immersive Call Elements
    this.btnChatToggle = document.getElementById('ctrl-chat-toggle');
    this.btnFullscreen = document.getElementById('ctrl-fullscreen');
    this.callDurationTimer = document.getElementById('call-duration-timer');
    this.signalPing = document.getElementById('signal-ping');

    // Social / Messaging Elements
    this.socialFriendList = document.getElementById('social-friend-list');
    this.socialSearchInput = document.getElementById('social-search-input');
    this.socialTabRecent = document.getElementById('tab-recent-chats');
    this.socialTabOnline = document.getElementById('tab-online-friends');
    this.socialEmptyView = document.getElementById('social-empty-view');
    this.socialActiveChatView = document.getElementById('social-active-chat-view');
    this.socialMessagesViewport = document.getElementById('social-messages-viewport');
    this.socialChatInput = document.getElementById('social-chat-input');
    this.socialChatSend = document.getElementById('social-chat-send');
    this.socialTypingIndicator = document.getElementById('social-typing-indicator');
    this.emojiPickerTrigger = document.getElementById('emoji-picker-trigger');
    this.emojiPopover = document.getElementById('emoji-popover');
    this.emojiPopoverGrid = document.getElementById('emoji-popover-grid');
    this.socialMobileBack = document.getElementById('social-mobile-back');
  }

  bindEvents() {
    // Navigation routing
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchPage(btn.getAttribute('data-page'));
      });
    });

    // Logo routing
    document.getElementById('nav-logo').addEventListener('click', (e) => {
      e.preventDefault();
      this.switchPage('landing-view');
    });

    // Profile Settings Input
    if (this.usernameInput) {
      this.usernameInput.addEventListener('change', (e) => {
        this.state.username = e.target.value || 'Anonymous Traveler';
      });
    }

    // Interest tags selection
    this.interestTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const interest = tag.getAttribute('data-interest');
        if (tag.classList.contains('active')) {
          // Keep at least one interest selected
          if (this.state.selectedInterests.length > 1) {
            tag.classList.remove('active');
            this.state.selectedInterests = this.state.selectedInterests.filter(i => i !== interest);
          } else {
            this.dispatchToast("Please select at least one vibe theme.", "warning");
          }
        } else {
          tag.classList.add('active');
          this.state.selectedInterests.push(interest);
        }
      });
    });

    // Lobby action triggers
    if (this.lobbyActionBtn && this.lobbyPulsar) {
      this.lobbyActionBtn.addEventListener('click', () => this.toggleMatching());
      this.lobbyPulsar.addEventListener('click', () => this.toggleMatching());
    }

    // Video Control actions
    this.btnMic.addEventListener('click', () => this.toggleMicrophone());
    this.btnVideo.addEventListener('click', () => this.toggleCamera());
    this.btnShare.addEventListener('click', () => this.toggleScreenShare());
    this.btnNext.addEventListener('click', () => this.nextMatch());
    this.btnDisconnect.addEventListener('click', () => this.disconnectCall());

    // Chat drawer events
    this.chatSendBtn.addEventListener('click', () => this.sendChatMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    if (this.mobileChatToggle) {
      this.mobileChatToggle.addEventListener('click', () => this.toggleChatDrawer(true));
    }
    if (this.closeChatBtn) {
      this.closeChatBtn.addEventListener('click', () => this.toggleChatDrawer(false));
    }
    if (this.chatBackdrop) {
      this.chatBackdrop.addEventListener('click', () => this.toggleChatDrawer(false));
    }

    // Settings Modal
    this.settingsTrigger.addEventListener('click', () => this.toggleModal(true));

    // Onboarding Listeners
    if (this.onboardCameraBtn) {
      this.onboardCameraBtn.addEventListener('click', () => this.requestCameraPermission());
    }
    if (this.onboardMicBtn) {
      this.onboardMicBtn.addEventListener('click', () => this.requestMicPermission());
    }
    if (this.onboardInterests) {
      const onboardTags = this.onboardInterests.querySelectorAll('.interest-tag');
      onboardTags.forEach(tag => {
        tag.addEventListener('click', () => {
          const interest = tag.getAttribute('data-interest');
          if (tag.classList.contains('active')) {
            if (this.state.onboardingInterests.length > 1) {
              tag.classList.remove('active');
              this.state.onboardingInterests = this.state.onboardingInterests.filter(i => i !== interest);
            } else {
              this.dispatchToast("Select at least one passion vibe.", "warning");
            }
          } else {
            tag.classList.add('active');
            this.state.onboardingInterests.push(interest);
          }
        });
      });
    }
    if (this.onboardPledgeCheck) {
      this.onboardPledgeCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.onboardFinalizeBtn.classList.remove('btn-disabled');
        } else {
          this.onboardFinalizeBtn.classList.add('btn-disabled');
        }
      });
    }

    // Immersive controls hooks
    if (this.btnChatToggle) {
      this.btnChatToggle.addEventListener('click', () => this.toggleChatDrawer());
    }
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // Fullscreen Escape event listener
    document.addEventListener('fullscreenchange', () => {
      if (!this.btnFullscreen) return;
      const icon = this.btnFullscreen.querySelector('i');
      if (document.fullscreenElement) {
        icon.setAttribute('data-lucide', 'minimize-2');
      } else {
        icon.setAttribute('data-lucide', 'maximize-2');
      }
      lucide.createIcons();
    });

    // Initialize Draggable Local Preview PIP Card
    this.initDraggablePreview();

    // Social / Messaging Listeners
    if (this.socialSearchInput) {
      this.socialSearchInput.addEventListener('input', (e) => this.handleSocialSearch(e.target.value));
    }
    if (this.socialTabRecent) {
      this.socialTabRecent.addEventListener('click', () => this.switchSocialTab('recent'));
    }
    if (this.socialTabOnline) {
      this.socialTabOnline.addEventListener('click', () => this.switchSocialTab('online'));
    }
    if (this.socialChatSend) {
      this.socialChatSend.addEventListener('click', () => this.sendSocialMessage());
    }
    if (this.socialChatInput) {
      this.socialChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendSocialMessage();
      });
    }
    if (this.emojiPickerTrigger && this.emojiPopover) {
      this.emojiPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emojiPopover.classList.toggle('open');
      });
    }
    document.addEventListener('click', () => {
      if (this.emojiPopover) {
        this.emojiPopover.classList.remove('open');
      }
    });
    if (this.socialMobileBack) {
      this.socialMobileBack.addEventListener('click', () => {
        const layout = document.getElementById('social-layout-container');
        if (layout) layout.classList.remove('chat-active');
      });
    }
  }

  /**
   * SPA SECTION ROUTER
   */
  switchPage(pageId) {
    if (this.state.currentPage === pageId) return;

    // Remove active markers from previous navigation
    this.navButtons.forEach(btn => {
      if (btn.getAttribute('data-page') === pageId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Transition panels — add leaving class to current active page first
    const currentActive = document.querySelector('.page-view.active');
    if (currentActive && currentActive.id !== pageId) {
      currentActive.classList.add('leaving');
      setTimeout(() => {
        currentActive.classList.remove('active', 'leaving');
      }, 200);
      // Delay showing new page slightly for smooth exit→enter
      setTimeout(() => {
        this.pages.forEach(page => {
          if (page.id === pageId) page.classList.add('active');
        });
        lucide.createIcons();
      }, 180);
    } else {
      this.pages.forEach(page => {
        if (page.id === pageId) {
          page.classList.add('active');
        } else {
          page.classList.remove('active');
        }
      });
    }

    // Handle view switches lifecycle
    if (pageId !== 'video-view' && this.state.currentMatch) {
      this.disconnectCall(false); // Silent disconnect if leaving call section
    }

    if (pageId === 'lobby-view' && this.state.isSearching) {
      this.stopSearching();
    }

    this.state.currentPage = pageId;
    
    // Refresh Icons dynamically
    lucide.createIcons();
    
    // Dispatch helpful guidance toasts
    if (pageId === 'playground-view') {
      this.dispatchToast("Design System specifications loaded successfully.", "info");
    }

    if (pageId === 'social-view') {
      this.initSocialPage();
    }

    if (pageId === 'settings-view') {
      this.initSettingsPage();
    }
  }

  /**
   * SYSTEM CUSTOM DROPDOWNS SELECTS
   */
  initCustomSelects() {
    this.setupSelectWrapper('lobby-region-select', 'region-select-trigger', 'region-select-options', (val) => {
      this.state.selectedRegion = val;
      this.dispatchToast(`Search region changed to: ${val.toUpperCase()}`, 'info');
    });

    this.setupSelectWrapper('settings-camera-select', 'camera-select-trigger', 'camera-select-options', (val) => {
      this.state.devices.camera = val;
    });

    this.setupSelectWrapper('settings-audio-select', 'audio-select-trigger', 'settings-audio-select', (val) => {
      this.state.devices.audio = val;
    });

    this.setupSelectWrapper('playground-custom-select', 'pg-select-trigger', 'pg-select-options', (val) => {
      this.dispatchToast(`Dropdown selection updated to: ${val}`, 'success');
    });

    this.setupSelectWrapper('onboard-language-select', 'onboard-lang-trigger', 'onboard-lang-options', (val) => {
      this.state.onboardingLang = val;
      this.dispatchToast(`Matching language set to: ${val.toUpperCase()}`, "info");
    });
  }

  setupSelectWrapper(wrapperId, triggerId, optionsId, callback) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.select-trigger');
    const optionsPanel = wrapper.querySelector('.select-options');
    const options = wrapper.querySelectorAll('.select-option');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close any other open dropdowns first
      document.querySelectorAll('.select-options.open').forEach(el => {
        if (el !== optionsPanel) {
          el.classList.remove('open');
          el.previousElementSibling.classList.remove('active');
        }
      });

      optionsPanel.classList.toggle('open');
      trigger.classList.toggle('active');
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        
        // Update trigger text
        trigger.querySelector('span').innerText = opt.innerText;
        optionsPanel.classList.remove('open');
        trigger.classList.remove('active');
        
        if (callback) callback(opt.getAttribute('data-value'));
      });
    });

    // Close on click outside
    document.addEventListener('click', () => {
      optionsPanel.classList.remove('open');
      trigger.classList.remove('active');
    });
  }

  /**
   * SETTINGS MODAL DIALOG PREFERENCES
   */
  toggleModal(show) {
    // Route to dedicated settings page instead of old modal overlay
    this.switchPage('settings-view');
  }

  savePreferences() {
    this.state.devices.autoMute = this.settingsAutoMute.checked;
    this.toggleModal(false);
    this.dispatchToast("Device preferences updated successfully.", "success");
  }

  /**
   * LOBBY MATCHMAKING LOGIC
   */
  toggleMatching() {
    if (this.state.isSearching) {
      this.stopSearching();
    } else {
      this.startSearching();
    }
  }

  startSearching() {
    this.state.isSearching = true;
    
    // Add pulsing states
    this.lobbyPulsar.classList.add('searching');
    this.lobbyIcon.setAttribute('data-lucide', 'loader-2');
    this.lobbyIcon.classList.add('spin');
    
    // Update labels
    this.lobbyStatusTitle.innerText = "Searching Vibe Channels...";
    this.lobbyStatusDesc.innerText = `Filtering profiles matching [${this.state.selectedInterests.join(', ')}] in ${this.state.selectedRegion.toUpperCase()}...`;
    
    this.lobbyActionBtn.classList.remove('btn-primary');
    this.lobbyActionBtn.classList.add('btn-secondary');
    this.lobbyActionBtn.querySelector('span').innerText = "Cancel Search";
    
    this.dispatchToast("Searching for match companions...", "info");
    lucide.createIcons();

    // Setup simulated WebRTC connection timeout
    this.state.searchTimer = setTimeout(() => {
      this.simulateMatchFound();
    }, 3200);
  }

  stopSearching() {
    this.state.isSearching = false;
    clearTimeout(this.state.searchTimer);

    // Reset pulsar state
    this.lobbyPulsar.classList.remove('searching');
    this.lobbyIcon.setAttribute('data-lucide', 'video');
    this.lobbyIcon.classList.remove('spin');

    // Reset labels
    this.lobbyStatusTitle.innerText = "Ready to Connect";
    this.lobbyStatusDesc.innerText = "Click the pulse grid or button below to match with a companion.";
    
    this.lobbyActionBtn.classList.add('btn-primary');
    this.lobbyActionBtn.classList.remove('btn-secondary');
    this.lobbyActionBtn.querySelector('span').innerText = "Find a Match";
    
    this.dispatchToast("Matchmaking search aborted.", "warning");
    lucide.createIcons();
  }

  simulateMatchFound() {
    this.state.isSearching = false;
    this.lobbyPulsar.classList.remove('searching');

    // Select matched stranger from dataset based on interests if possible, otherwise random
    const matches = this.mockStrangers.filter(stranger => 
      this.state.selectedInterests.includes(stranger.interest)
    );
    const chosenMatch = matches.length > 0 
      ? matches[Math.floor(Math.random() * matches.length)] 
      : this.mockStrangers[Math.floor(Math.random() * this.mockStrangers.length)];

    this.state.currentMatch = chosenMatch;
    
    this.dispatchToast("Match Companion Found! Initiating Call...", "success");

    // Route view to video room page
    setTimeout(() => {
      this.switchPage('video-view');
      this.startCallSession();
    }, 600);
  }

  /**
   * CALL SESSION CONTROLLERS (MOCK CHANNELS)
   */
  startCallSession() {
    // Reset control variables
    this.state.isMicMuted = this.state.devices.autoMute;
    this.state.isVideoOff = false;
    this.state.isScreenSharing = false;

    this.updateControlsUI();
    this.clearChatMessages();

    // 1. Establish self local camera capture
    this.initLocalFeed();

    // 2. Animate remote loading skeleton
    this.remotePlaceholder.style.display = 'flex';
    this.remoteCanvas.style.display = 'none';
    this.remoteMatchingStatus.innerText = "Connecting secure signaling tunnels...";
    this.remoteLabel.innerText = "Connecting...";

    // Reset stopwatch timer display
    clearInterval(this.state.callTimerInterval);
    this.state.callDurationSeconds = 0;
    if (this.callDurationTimer) this.callDurationTimer.innerText = "00:00";

    // Transition remote loader to connected state
    setTimeout(() => {
      this.remoteMatchingStatus.innerText = "Negotiating media SDP...";
      
      setTimeout(() => {
        this.remotePlaceholder.style.display = 'none';
        this.remoteCanvas.style.display = 'block';
        
        const match = this.state.currentMatch;
        this.remoteLabel.innerText = `${match.name} (${match.location})`;
        
        // Start simulated generative canvas rendering for stranger
        this.startMockStream('remote', match.color);

        // Add incoming system alert toast
        this.dispatchToast(`Connected with ${match.name}!`, "success");

        // Start call duration stopwatch timer
        this.state.callTimerInterval = setInterval(() => {
          this.state.callDurationSeconds++;
          const s = this.state.callDurationSeconds;
          const mins = String(Math.floor(s / 60)).padStart(2, '0');
          const secs = String(s % 60).padStart(2, '0');
          if (this.callDurationTimer) {
            this.callDurationTimer.innerText = `${mins}:${secs}`;
          }
          // Randomly simulate slight signal updates in ping values
          if (s % 7 === 0 && this.signalPing) {
            const pings = [9, 11, 12, 14, 15, 17, 12, 13];
            const randomPing = pings[Math.floor(Math.random() * pings.length)];
            this.signalPing.innerText = `${randomPing}ms`;
          }
        }, 1000);

        // Send matched stranger initial greeting text in drawer
        setTimeout(() => {
          this.receiveSimulatedMessage(match.replies[0]);
        }, 1200);

      }, 1200);
    }, 1000);
  }

  initLocalFeed() {
    this.localPlaceholder.style.display = 'none';
    
    // Check if real camera is requested and permission allows
    if (this.state.devices.camera === 'default' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          this.state.localStream = stream;
          this.localVideo.srcObject = stream;
          this.localVideo.style.display = 'block';
          this.localCanvas.style.display = 'none';
        })
        .catch(err => {
          // Camera block or error - use premium generative visual placeholder
          this.localVideo.style.display = 'none';
          this.localCanvas.style.display = 'block';
          this.startMockStream('local', 'hsl(190, 95%, 45%)');
        });
    } else {
      // Direct mock fallback
      this.localVideo.style.display = 'none';
      this.localCanvas.style.display = 'block';
      this.startMockStream('local', 'hsl(190, 95%, 45%)');
    }
  }

  /**
   * GENERATIVE PREMIUM CANVAS VISUAL FEEDS
   * Draws a beautiful cosmic energy particle field representing camera captures.
   */
  startMockStream(feedType, themeColor) {
    const canvas = feedType === 'local' ? this.localCanvas : this.remoteCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 480;
    canvas.height = 360;

    // Track particle arrays
    const particles = [];
    const particleCount = 28;
    const colorHex = themeColor;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 32 + 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    const drawFrame = () => {
      // 1. Draw base obsidian overlay gradient
      ctx.fillStyle = 'rgba(10, 12, 18, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw moving grid lines for technological style depth
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 3. Render moving fluid particle lights
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce margins
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Radial glowing gradients
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, colorHex.replace(')', `, ${p.alpha})`).replace('hsl', 'hsla'));
        gradient.addColorStop(1, 'rgba(10, 12, 18, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Render center label details watermark (Premium touch)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.letterSpacing = '0.08em';
      ctx.fillText(feedType === 'local' ? 'LOCAL ENCRYPTED FEED' : 'SECURE SECURE STREAM', 24, 36);

      this.animationFrames[feedType] = requestAnimationFrame(drawFrame);
    };

    // Cancel existing loop for this screen
    this.stopMockStream(feedType);
    drawFrame();
  }

  stopMockStream(feedType) {
    if (this.animationFrames[feedType]) {
      cancelAnimationFrame(this.animationFrames[feedType]);
      this.animationFrames[feedType] = null;
    }
  }

  /**
   * AUDIO/VIDEO HARDWARE INTERACTS
   */
  toggleMicrophone() {
    this.state.isMicMuted = !this.state.isMicMuted;
    
    // Toggle system stream audio tracking
    if (this.state.localStream) {
      this.state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.state.isMicMuted;
      });
    }

    this.updateControlsUI();
    
    const message = this.state.isMicMuted ? "Microphone muted." : "Microphone active.";
    const status = this.state.isMicMuted ? "warning" : "success";
    this.dispatchToast(message, status);
  }

  toggleCamera() {
    this.state.isVideoOff = !this.state.isVideoOff;

    if (this.state.localStream) {
      this.state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.state.isVideoOff;
      });
    }

    if (this.state.isVideoOff) {
      this.localVideo.style.display = 'none';
      this.localCanvas.style.display = 'none';
      this.localPlaceholder.style.display = 'flex';
      this.stopMockStream('local');
    } else {
      this.localPlaceholder.style.display = 'none';
      if (this.state.localStream) {
        this.localVideo.style.display = 'block';
      } else {
        this.localCanvas.style.display = 'block';
        this.startMockStream('local', 'hsl(190, 95%, 45%)');
      }
    }

    this.updateControlsUI();
    const alertMsg = this.state.isVideoOff ? "Video stream disabled." : "Video stream enabled.";
    this.dispatchToast(alertMsg, this.state.isVideoOff ? "danger" : "success");
  }

  toggleScreenShare() {
    this.state.isScreenSharing = !this.state.isScreenSharing;

    if (this.state.isScreenSharing) {
      this.dispatchToast("Sharing system screen...", "success");
      // Change local feed to a golden particle cluster
      this.localVideo.style.display = 'none';
      this.localCanvas.style.display = 'block';
      this.startMockStream('local', 'hsl(38, 92%, 50%)');
    } else {
      this.dispatchToast("Stopped sharing screen.", "info");
      this.initLocalFeed();
    }

    this.updateControlsUI();
  }

  updateControlsUI() {
    // 1. Mic control icon & tooltip update
    if (this.state.isMicMuted) {
      this.btnMic.classList.add('btn-danger');
      this.btnMic.classList.remove('btn-secondary');
      this.btnMic.innerHTML = `<i data-lucide="mic-off" class="icon"></i><span class="tooltip">Unmute Microphone</span>`;
    } else {
      this.btnMic.classList.remove('btn-danger');
      this.btnMic.classList.add('btn-secondary');
      this.btnMic.innerHTML = `<i data-lucide="mic" class="icon"></i><span class="tooltip">Mute Microphone</span>`;
    }

    // 2. Video control icon & tooltip update
    if (this.state.isVideoOff) {
      this.btnVideo.classList.add('btn-danger');
      this.btnVideo.classList.remove('btn-secondary');
      this.btnVideo.innerHTML = `<i data-lucide="video-off" class="icon"></i><span class="tooltip">Enable Video Feed</span>`;
    } else {
      this.btnVideo.classList.remove('btn-danger');
      this.btnVideo.classList.add('btn-secondary');
      this.btnVideo.innerHTML = `<i data-lucide="video" class="icon"></i><span class="tooltip">Disable Video Feed</span>`;
    }

    // 3. Screen share visual indicator
    if (this.state.isScreenSharing) {
      this.btnShare.style.background = 'var(--primary)';
      this.btnShare.style.color = '#ffffff';
    } else {
      this.btnShare.style.background = '';
      this.btnShare.style.color = '';
    }

    lucide.createIcons();
  }

  nextMatch() {
    this.dispatchToast("Skipping companion...", "info");
    this.stopMockStream('remote');

    // Reset duration stopwatch display
    clearInterval(this.state.callTimerInterval);
    this.state.callDurationSeconds = 0;
    if (this.callDurationTimer) this.callDurationTimer.innerText = "00:00";

    // 1. Disconnect canvas & render skeleton loader
    this.remoteCanvas.style.display = 'none';
    this.remotePlaceholder.style.display = 'flex';
    this.remoteMatchingStatus.innerText = "Finding another stranger companion...";
    this.remoteLabel.innerText = "Finding Match...";

    // 2. Choose new stranger randomly
    const matches = this.mockStrangers.filter(stranger => 
      stranger.name !== this.state.currentMatch.name
    );
    const chosenMatch = matches[Math.floor(Math.random() * matches.length)];
    this.state.currentMatch = chosenMatch;

    this.clearChatMessages();

    // 3. Simulate connect timer
    setTimeout(() => {
      this.remotePlaceholder.style.display = 'none';
      this.remoteCanvas.style.display = 'block';
      this.remoteLabel.innerText = `${chosenMatch.name} (${chosenMatch.location})`;

      this.startMockStream('remote', chosenMatch.color);
      this.dispatchToast(`Connected with ${chosenMatch.name}!`, "success");

      // Restart stopwatch timer
      this.state.callTimerInterval = setInterval(() => {
        this.state.callDurationSeconds++;
        const s = this.state.callDurationSeconds;
        const mins = String(Math.floor(s / 60)).padStart(2, '0');
        const secs = String(s % 60).padStart(2, '0');
        if (this.callDurationTimer) {
          this.callDurationTimer.innerText = `${mins}:${secs}`;
        }
        if (s % 7 === 0 && this.signalPing) {
          const pings = [9, 11, 12, 14, 15, 17, 12, 13];
          const randomPing = pings[Math.floor(Math.random() * pings.length)];
          this.signalPing.innerText = `${randomPing}ms`;
        }
      }, 1000);

      setTimeout(() => {
        this.receiveSimulatedMessage(chosenMatch.replies[0]);
      }, 1000);

    }, 2400);
  }

  disconnectCall(routeToLobby = true) {
    this.stopMockStream('local');
    this.stopMockStream('remote');

    // Clear duration stopwatch
    clearInterval(this.state.callTimerInterval);
    this.state.callDurationSeconds = 0;
    if (this.callDurationTimer) this.callDurationTimer.innerText = "00:00";

    // Exit Fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (this.state.localStream) {
      this.state.localStream.getTracks().forEach(track => track.stop());
      this.state.localStream = null;
    }

    this.state.currentMatch = null;
    this.clearChatMessages();

    if (routeToLobby) {
      this.dispatchToast("Call session terminated.", "danger");
      this.switchPage('lobby-view');
    }
  }

  /**
   * CHAT SYSTEM
   */
  sendChatMessage() {
    const text = this.chatInput.value.trim();
    if (!text) return;

    this.chatInput.value = '';

    // Append outgoing message bubble
    this.appendMessageBubble(text, 'outgoing');

    // Simulated auto response replies based on match interest indices
    if (this.state.currentMatch) {
      const match = this.state.currentMatch;
      
      setTimeout(() => {
        // Grab a reply from matches response stack
        const replyIndex = Math.min(
          this.chatMessages.querySelectorAll('.message-bubble.incoming').length,
          match.replies.length - 1
        );
        const replyText = match.replies[replyIndex] || "Awesome vibe! Catch you later.";
        
        this.receiveSimulatedMessage(replyText);
      }, 1500);
    }
  }

  receiveSimulatedMessage(text) {
    this.appendMessageBubble(text, 'incoming');
    this.dispatchToast("New message received.", "info");
  }

  appendMessageBubble(text, direction) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${direction}`;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.innerHTML = `
      ${this.escapeHTML(text)}
      <div class="message-meta">${timeString}</div>
    `;

    this.chatMessages.appendChild(bubble);
    
    // Smooth scroll chat list to end
    this.chatMessages.scrollTo({
      top: this.chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  }

  clearChatMessages() {
    this.chatMessages.innerHTML = '';
  }

  toggleChatDrawer(isOpen) {
    const targetState = (isOpen !== undefined) ? isOpen : !this.chatDrawer.classList.contains('open');
    
    if (targetState) {
      this.chatDrawer.classList.add('open');
      this.chatBackdrop.classList.add('open');
      if (this.btnChatToggle) {
        this.btnChatToggle.style.background = 'var(--accent-glow)';
        this.btnChatToggle.style.color = 'var(--accent-light)';
      }
    } else {
      this.chatDrawer.classList.remove('open');
      this.chatBackdrop.classList.remove('open');
      if (this.btnChatToggle) {
        this.btnChatToggle.style.background = '';
        this.btnChatToggle.style.color = '';
      }
    }
  }

  /**
   * NOTIFICATION SYSTEM (TOASTS ALERTS DISPATCHER)
   */
  dispatchToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose correct icon matching category
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'alert-octagon';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="${iconName}" class="icon-sm"></i></div>
      <div class="toast-text">${message}</div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Fade and slide removal transitions
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(16px)';
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3800);
  }

  /**
   * SECURE SANITIZING UTILITIES
   */
  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  /**
   * ANIMATED CANVAS BACKGROUND FOR HERO SECTION
   */
  initHeroCanvasAnimation() {
    if (!this.heroCanvas) return;
    const ctx = this.heroCanvas.getContext('2d');
    
    const resizeCanvas = () => {
      this.heroCanvas.width = window.innerWidth;
      this.heroCanvas.height = 680; // approximate height of landing hero section
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Shifting nodes setup
    const nodes = [];
    const nodeCount = 6;
    const colors = [
      'rgba(130, 80, 250, 0.08)', // Soft Indigo Glow
      'rgba(0, 220, 255, 0.06)',  // Soft Cyan Glow
      'rgba(0, 230, 130, 0.04)',  // Soft Emerald Glow
      'rgba(255, 60, 100, 0.04)'   // Soft Red Glow
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * this.heroCanvas.width,
        y: Math.random() * this.heroCanvas.height,
        radius: Math.random() * 250 + 200,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: colors[i % colors.length]
      });
    }

    const drawHeroFrame = () => {
      if (this.state.currentPage !== 'landing-view') {
        this.animationFrames.hero = requestAnimationFrame(drawHeroFrame);
        return;
      }

      ctx.clearRect(0, 0, this.heroCanvas.width, this.heroCanvas.height);

      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;

        // Wrap boundaries
        if (n.x < -n.radius) n.x = this.heroCanvas.width + n.radius;
        if (n.x > this.heroCanvas.width + n.radius) n.x = -n.radius;
        if (n.y < -n.radius) n.y = this.heroCanvas.height + n.radius;
        if (n.y > this.heroCanvas.height + n.radius) n.y = -n.radius;

        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(8, 10, 15, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      this.animationFrames.hero = requestAnimationFrame(drawHeroFrame);
    };

    drawHeroFrame();
  }

  /**
   * SMOOTH SCROLL ENTRANCE OBSERVERS
   */
  initScrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, {
      threshold: 0.12
    });

    reveals.forEach(r => observer.observe(r));
  }

  /**
   * FAQ ACCORDION INTERACTION
   */
  initFAQAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const trigger = item.querySelector('.faq-trigger');
      const content = item.querySelector('.faq-content');
      
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        
        // Close other items
        faqItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('open')) {
            otherItem.classList.remove('open');
            otherItem.querySelector('.faq-content').style.maxHeight = '0px';
          }
        });

        if (isOpen) {
          item.classList.remove('open');
          content.style.maxHeight = '0px';
        } else {
          item.classList.add('open');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  }

  /**
   * ONBOARDING EXPERIENCE WIZARD METHODS
   */
  startOnboarding() {
    this.state.onboardingStep = 1;
    this.switchPage('onboarding-view');
    this.updateOnboardingUI();
    this.dispatchToast("Welcome screen loaded. Let's configure your session profile.", "info");
  }

  nextOnboardingStep() {
    this.state.onboardingStep = Math.min(8, this.state.onboardingStep + 1);
    this.updateOnboardingUI();
  }

  prevOnboardingStep() {
    this.state.onboardingStep = Math.max(1, this.state.onboardingStep - 1);
    this.updateOnboardingUI();
  }

  updateOnboardingUI() {
    const step = this.state.onboardingStep;
    
    // Toggle step classes
    this.onboardingSteps.forEach(panel => {
      const panelStep = parseInt(panel.getAttribute('data-step'));
      if (panelStep === step) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Update Progress Labels and percentage width
    if (this.onboardingStepLabel && this.onboardingProgressFill) {
      if (step === 8) {
        this.onboardingStepLabel.innerText = "Finding Match...";
        this.onboardingProgressFill.style.width = "100%";
      } else {
        this.onboardingStepLabel.innerText = `Step ${step} of 7`;
        const percentage = ((step - 1) / 6) * 100; // 0 to 100% over steps 1 to 7
        this.onboardingProgressFill.style.width = `${Math.max(8, percentage)}%`;
      }
    }

    lucide.createIcons();
  }

  requestCameraPermission() {
    this.dispatchToast("Requesting browser camera channels...", "info");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          this.state.devices.camera = 'default';
          // Release stream handles immediately, only testing request
          stream.getTracks().forEach(track => track.stop());
          this.dispatchToast("Camera connection authorized successfully.", "success");
          this.nextOnboardingStep();
        })
        .catch(err => {
          this.dispatchToast("Camera blocked or unavailable. Proceeding with mockup visual streams.", "warning");
          this.state.devices.camera = 'fallback-mock';
          this.nextOnboardingStep();
        });
    } else {
      this.dispatchToast("Device media capture not supported. Fallback stream enabled.", "warning");
      this.state.devices.camera = 'fallback-mock';
      this.nextOnboardingStep();
    }
  }

  requestMicPermission() {
    this.dispatchToast("Requesting microphone channel...", "info");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.state.devices.audio = 'default';
          stream.getTracks().forEach(track => track.stop());
          this.dispatchToast("Microphone connection authorized successfully.", "success");
          this.nextOnboardingStep();
        })
        .catch(err => {
          this.dispatchToast("Microphone blocked. Proceeding with muted audio channel.", "warning");
          this.state.devices.audio = 'secondary';
          this.nextOnboardingStep();
        });
    } else {
      this.dispatchToast("Audio capture not supported. Muted setup enabled.", "warning");
      this.state.devices.audio = 'secondary';
      this.nextOnboardingStep();
    }
  }

  saveOnboardingNickname() {
    const nick = this.onboardNickname.value.trim();
    this.state.username = nick || "Aura Traveler";
    
    // Sync into Settings inputs
    if (this.usernameInput) {
      this.usernameInput.value = this.state.username;
    }
    this.nextOnboardingStep();
  }

  finalizeOnboarding() {
    // Lock guidelines accept check
    if (!this.onboardPledgeCheck.checked) {
      this.dispatchToast("Please accept guidelines policy to match.", "warning");
      return;
    }

    // Progress into final scanner step
    this.state.onboardingStep = 8;
    this.updateOnboardingUI();
    this.dispatchToast("Initiating matching protocol...", "info");

    // Sync onboarding selected interests to settings
    this.state.onboardingInterests = [];
    const onboardTags = this.onboardInterests.querySelectorAll('.interest-tag');
    onboardTags.forEach(el => {
      if (el.classList.contains('active')) {
        this.state.onboardingInterests.push(el.getAttribute('data-interest'));
      }
    });

    this.state.selectedInterests = [...this.state.onboardingInterests];
    
    // Sync interest tag active classes
    const tagElements = document.querySelectorAll('#interests-list .interest-tag');
    tagElements.forEach(el => {
      const interest = el.getAttribute('data-interest');
      if (this.state.selectedInterests.includes(interest)) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Simulate match connection delay before entering Call page
    setTimeout(() => {
      const matches = this.mockStrangers.filter(stranger => 
        this.state.selectedInterests.includes(stranger.interest)
      );
      const chosenMatch = matches.length > 0 
        ? matches[Math.floor(Math.random() * matches.length)] 
        : this.mockStrangers[Math.floor(Math.random() * this.mockStrangers.length)];

      this.state.currentMatch = chosenMatch;

      // Fire premium match-found animation overlay + confetti burst
      if (window.showMatchFoundAnimation) {
        showMatchFoundAnimation(chosenMatch.name);
      }
      this.dispatchToast(`Match found! Connecting with ${chosenMatch.name}...`, 'success');

      setTimeout(() => {
        this.switchPage('video-view');
        this.startCallSession();
      }, 2400); // allow animation to play

    }, 3800);
  }

  /**
   * DRAGGABLE PIP SELF-PREVIEW PIP CONTAINER
   */
  initDraggablePreview() {
    const el = document.getElementById('local-video-container');
    if (!el) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let rectWidth = 0;
    let rectHeight = 0;

    const dragStart = (e) => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      isDragging = true;
      
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      
      const rect = el.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      rectWidth = el.offsetWidth;
      rectHeight = el.offsetHeight;
      
      el.style.transition = 'none';
    };

    const drag = (e) => {
      if (!isDragging) return;
      
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      const parent = el.parentElement;
      const parentRect = parent.getBoundingClientRect();

      let left = clientX - parentRect.left - offsetX;
      let top = clientY - parentRect.top - offsetY;

      // Keep within bounds (24px margins padding)
      const boundMaxLeft = parentRect.width - rectWidth - 24;
      const boundMaxTop = parentRect.height - rectHeight - 24;

      left = Math.max(24, Math.min(left, boundMaxLeft));
      top = Math.max(24, Math.min(top, boundMaxTop));

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.right = 'auto'; // cancel standard right styling rule
    };

    const dragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      el.style.transition = 'transform var(--transition-fast)'; // restore subtle click transform
    };

    el.addEventListener('mousedown', dragStart);
    el.addEventListener('touchstart', dragStart, { passive: true });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  }

  /**
   * FULLSCREEN MODE API BINDING
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          this.dispatchToast("Immersive Fullscreen active.", "success");
        })
        .catch(err => {
          this.dispatchToast("Fullscreen blocked by browser configurations.", "warning");
        });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * SOCIAL WORKSPACE METHODS
   */
  initSocialPage() {
    this.renderSocialFriendList();
    this.populateEmojis();
    
    // Reset view states
    if (this.state.activeSocialChatId) {
      this.openSocialChat(this.state.activeSocialChatId);
    } else {
      if (this.socialEmptyView) this.socialEmptyView.style.display = 'flex';
      if (this.socialActiveChatView) this.socialActiveChatView.style.display = 'none';
    }
  }

  renderSocialFriendList() {
    if (!this.socialFriendList) return;
    this.socialFriendList.innerHTML = '';

    const query = this.state.socialSearchQuery.toLowerCase();
    const tab = this.state.socialActiveTab;

    const filtered = this.state.friends.filter(friend => {
      const matchesSearch = friend.name.toLowerCase().includes(query) || friend.location.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (tab === 'online') return friend.status === 'online';
      return true; // "recent" tab shows everyone
    });

    if (filtered.length === 0) {
      this.socialFriendList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: var(--text-xs); padding: var(--space-md);">No companions found</div>`;
      return;
    }

    filtered.forEach(friend => {
      const card = document.createElement('div');
      card.className = `friend-card ${this.state.activeSocialChatId === friend.id ? 'active' : ''}`;
      
      const lastMsg = friend.messages.length > 0 ? friend.messages[friend.messages.length - 1] : { text: "No messages yet.", time: "" };
      const statusClass = `status-${friend.status}`;
      const hasNotification = friend.unread > 0;

      card.innerHTML = `
        <div class="friend-card-avatar-wrapper">
          <div class="avatar avatar-sm" style="background: ${friend.color}; color: #fff; font-weight: 700;">${friend.avatar}</div>
          <span class="status-indicator ${statusClass}"></span>
        </div>
        <div class="friend-info">
          <div class="friend-name-row">
            <span class="friend-name">${friend.name}</span>
            <span class="friend-time">${friend.lastTime || lastMsg.time}</span>
          </div>
          <div class="friend-status-badge-row">
            <span class="friend-snippet">${lastMsg.direction === 'outgoing' ? 'You: ' : ''}${lastMsg.text}</span>
            ${hasNotification ? `<span class="friend-badge">${friend.unread}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => this.openSocialChat(friend.id));
      this.socialFriendList.appendChild(card);
    });

    lucide.createIcons();
  }

  openSocialChat(friendId) {
    this.state.activeSocialChatId = friendId;
    const friend = this.state.friends.find(f => f.id === friendId);
    if (!friend) return;

    // Clear unread counts
    friend.unread = 0;
    this.renderSocialFriendList();

    // Toggle layouts viewports
    if (this.socialEmptyView) this.socialEmptyView.style.display = 'none';
    if (this.socialActiveChatView) this.socialActiveChatView.style.display = 'flex';

    // Add mobile toggle marker
    const layout = document.getElementById('social-layout-container');
    if (layout) layout.classList.add('chat-active');

    // Populate active conversation headers details
    const avatarNode = document.getElementById('chat-header-avatar');
    const nameNode = document.getElementById('chat-header-name');
    const statusDot = document.getElementById('chat-header-status-dot');
    const statusLbl = document.getElementById('chat-header-status-lbl');

    if (avatarNode) {
      avatarNode.innerText = friend.avatar;
      avatarNode.style.background = friend.color;
    }
    if (nameNode) nameNode.innerText = `${friend.name} (${friend.location})`;
    if (statusDot) {
      statusDot.className = `status-indicator status-${friend.status}`;
    }
    if (statusLbl) {
      statusLbl.innerText = friend.status === 'online' ? 'Active now' : 'Away';
      statusLbl.style.color = friend.status === 'online' ? 'var(--success)' : 'var(--text-muted)';
    }

    // Populate messages history list
    if (this.socialMessagesViewport) {
      this.socialMessagesViewport.innerHTML = '';
      friend.messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.direction}`;
        bubble.innerHTML = `
          ${this.escapeHTML(msg.text)}
          <div class="message-meta">${msg.time}</div>
        `;
        this.socialMessagesViewport.appendChild(bubble);
      });

      // Scroll messages viewport directly to bottom
      setTimeout(() => {
        this.socialMessagesViewport.scrollTop = this.socialMessagesViewport.scrollHeight;
      }, 50);
    }

    // Reset keyboard focus
    if (this.socialChatInput) {
      this.socialChatInput.focus();
    }
  }

  sendSocialMessage() {
    if (!this.socialChatInput) return;
    const text = this.socialChatInput.value.trim();
    if (!text) return;

    const friend = this.state.friends.find(f => f.id === this.state.activeSocialChatId);
    if (!friend) return;

    this.socialChatInput.value = '';

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { text, direction: 'outgoing', time: timeString };

    friend.messages.push(newMsg);
    friend.lastTime = timeString;

    // Append outgoing message bubble immediately
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble outgoing';
    bubble.innerHTML = `
      ${this.escapeHTML(text)}
      <div class="message-meta">${timeString}</div>
    `;
    
    if (this.socialMessagesViewport) {
      this.socialMessagesViewport.appendChild(bubble);
      this.socialMessagesViewport.scrollTo({
        top: this.socialMessagesViewport.scrollHeight,
        behavior: 'smooth'
      });
    }

    // Re-render friends list to update snippets in sidebar
    this.renderSocialFriendList();

    // Trigger typing reply simulation
    this.triggerSocialTypingReply(friend.id);
  }

  triggerSocialTypingReply(friendId) {
    const friend = this.state.friends.find(f => f.id === friendId);
    if (!friend || friend.replies.length === 0) return;

    // Show typing status indicator dot
    setTimeout(() => {
      // Check if we are still active in the same chat
      if (this.state.activeSocialChatId !== friendId) return;

      const typingNode = this.socialTypingIndicator;
      if (typingNode) {
        typingNode.style.display = 'block';
        if (this.socialMessagesViewport) {
          this.socialMessagesViewport.scrollTo({
            top: this.socialMessagesViewport.scrollHeight,
            behavior: 'smooth'
          });
        }
      }

      // Update header status to "Typing..."
      const statusLbl = document.getElementById('chat-header-status-lbl');
      if (statusLbl) {
        statusLbl.innerText = "Typing...";
        statusLbl.style.color = "var(--accent-light)";
      }

      // Add delay for simulated reply message dispatch
      setTimeout(() => {
        if (typingNode) typingNode.style.display = 'none';

        // Revert header status
        if (statusLbl) {
          statusLbl.innerText = friend.status === 'online' ? 'Active now' : 'Away';
          statusLbl.style.color = friend.status === 'online' ? 'var(--success)' : 'var(--text-muted)';
        }

        if (this.state.activeSocialChatId !== friendId) return;

        // Shift reply out of queue stacks
        const replyText = friend.replies.shift() || "Nice vibe tag companion!";
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const replyMsg = { text: replyText, direction: 'incoming', time: timeString };

        friend.messages.push(replyMsg);
        friend.lastTime = timeString;

        // Append incoming bubble
        const replyBubble = document.createElement('div');
        replyBubble.className = 'message-bubble incoming';
        replyBubble.innerHTML = `
          ${this.escapeHTML(replyText)}
          <div class="message-meta">${timeString}</div>
        `;

        if (this.socialMessagesViewport) {
          this.socialMessagesViewport.appendChild(replyBubble);
          this.socialMessagesViewport.scrollTo({
            top: this.socialMessagesViewport.scrollHeight,
            behavior: 'smooth'
          });
        }

        // Refresh friend card sidebar list
        this.renderSocialFriendList();
        this.dispatchToast(`New message from ${friend.name}`, "info");

      }, 2000);

    }, 800);
  }

  handleSocialSearch(query) {
    this.state.socialSearchQuery = query;
    this.renderSocialFriendList();
  }

  switchSocialTab(tabId) {
    this.state.socialActiveTab = tabId;
    
    // Toggle active tab buttons classes
    if (tabId === 'recent') {
      this.socialTabRecent.classList.add('active');
      this.socialTabOnline.classList.remove('active');
    } else {
      this.socialTabRecent.classList.remove('active');
      this.socialTabOnline.classList.add('active');
    }

    this.renderSocialFriendList();
  }

  populateEmojis() {
    if (!this.emojiPopoverGrid) return;
    this.emojiPopoverGrid.innerHTML = '';

    const emojis = ['😄','😂','😍','👍','❤️','🔥','🎉','🚀','🤔','😭','💡','🌟','✨','👏','✔️'];
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.innerText = emoji;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.socialChatInput) {
          this.socialChatInput.value += emoji;
          this.socialChatInput.focus();
        }
        if (this.emojiPopover) {
          this.emojiPopover.classList.remove('open');
        }
      });

      this.emojiPopoverGrid.appendChild(btn);
    });
  }

  /**
   * PREMIUM SETTINGS VIEW METHODS
   */
  initSettingsPage() {
    // Wire up sidebar nav items
    const navItems = document.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const panelId = item.getAttribute('data-settings-panel');
        this.switchSettingsPanel(panelId);
      });
    });

    // Wire up theme switcher buttons
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        themeOptions.forEach(o => o.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-theme');
        this.applyTheme(theme);
        this.dispatchToast(`Theme switched to ${btn.querySelector('span').innerText}`, 'success');
      });
    });

    // Wire up language options
    const langOptions = document.querySelectorAll('.lang-option');
    langOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        langOptions.forEach(o => o.classList.remove('active'));
        btn.classList.add('active');
        this.dispatchToast(`Language set to ${btn.innerText.trim()}`, 'info');
      });
    });

    // Wire up font scale buttons
    const fontScaleBtns = document.querySelectorAll('.font-scale-btn');
    fontScaleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        fontScaleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = btn.getAttribute('data-scale');
        const sizes = { sm: '13px', md: '15px', lg: '17px' };
        document.documentElement.style.setProperty('--font-base-size', sizes[scale] || '15px');
        this.dispatchToast('Font size updated.', 'info');
      });
    });

    // Animate mic level bar
    this.animateMicLevelBar();
  }

  switchSettingsPanel(panelId) {
    // Update nav active states
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-settings-panel') === panelId);
    });

    // Show correct panel
    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `sp-${panelId}`);
    });
  }

  applyTheme(theme) {
    const root = document.documentElement;
    const themes = {
      dark: {
        '--bg-base': 'hsl(224, 18%, 8%)',
        '--bg-surface': 'hsl(224, 18%, 11%)',
        '--bg-elevated': 'hsl(224, 18%, 15%)',
        '--text-primary': 'hsl(210, 30%, 96%)',
        '--text-secondary': 'hsl(210, 15%, 70%)',
        '--accent': 'hsl(263, 85%, 65%)'
      },
      midnight: {
        '--bg-base': 'hsl(240, 25%, 5%)',
        '--bg-surface': 'hsl(240, 20%, 9%)',
        '--bg-elevated': 'hsl(240, 18%, 13%)',
        '--text-primary': 'hsl(200, 40%, 98%)',
        '--text-secondary': 'hsl(200, 20%, 65%)',
        '--accent': 'hsl(200, 95%, 55%)'
      },
      light: {
        '--bg-base': 'hsl(0, 0%, 97%)',
        '--bg-surface': 'hsl(0, 0%, 100%)',
        '--bg-elevated': 'hsl(0, 0%, 93%)',
        '--text-primary': 'hsl(224, 25%, 12%)',
        '--text-secondary': 'hsl(224, 12%, 38%)',
        '--accent': 'hsl(263, 80%, 55%)'
      },
      aurora: {
        '--bg-base': 'hsl(280, 30%, 7%)',
        '--bg-surface': 'hsl(280, 25%, 11%)',
        '--bg-elevated': 'hsl(280, 20%, 15%)',
        '--text-primary': 'hsl(180, 30%, 97%)',
        '--text-secondary': 'hsl(180, 15%, 65%)',
        '--accent': 'hsl(300, 80%, 65%)'
      }
    };
    const vars = themes[theme];
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    }
  }

  animateMicLevelBar() {
    const fill = document.getElementById('mic-level-fill');
    if (!fill) return;
    let tick = 0;
    const interval = setInterval(() => {
      if (!document.getElementById('sp-audio') || !document.getElementById('sp-audio').classList.contains('active')) {
        clearInterval(interval);
        return;
      }
      const pct = 50 + Math.sin(tick * 0.3) * 25 + Math.random() * 15;
      fill.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      tick++;
    }, 150);
  }
}

// Instantiate App once page renders completely
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AuraApplication();
  initAnimationEngine();
});

/* 
  =========================================
  PREMIUM ANIMATION ENGINE
  =========================================
*/

function initAnimationEngine() {
  initParticles();
  initRipples();
  initScrollReveal();
  initSearchAnimation();
}

/* ---- FLOATING PARTICLES ---- */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;

  const COLORS = [
    'hsla(263,85%,65%,0.7)',
    'hsla(190,95%,55%,0.6)',
    'hsla(300,70%,65%,0.5)',
    'hsla(220,80%,70%,0.5)'
  ];

  const particles = Array.from({ length: 38 }, () => createParticle(W, H, COLORS));

  function createParticle(w, h, colors) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2
    };
  }

  let frame = 0;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      // Wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      const pulse = 0.7 + 0.3 * Math.sin(frame * 0.018 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw subtle connecting lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(263,85%,65%,${(1 - dist / 110) * 0.12})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(loop);
  }
  loop();

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
  });
}

/* ---- RIPPLE CLICK EFFECT ---- */
function initRipples() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn, .friend-card, .settings-nav-item, .lang-option, .theme-option');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;

    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }, { passive: true });
}

/* ---- SCROLL REVEAL (IntersectionObserver) ---- */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal-on-scroll, .feature-card, .how-step, .faq-item, .stat-item-premium');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Add class to children for stagger
        const children = entry.target.querySelectorAll('.card, .settings-card');
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * 60}ms`;
          child.classList.add('revealed');
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(t => {
    t.classList.add('reveal-on-scroll');
    observer.observe(t);
  });
}

/* ---- SEARCH INPUT GLOW ANIMATION ---- */
function initSearchAnimation() {
  document.querySelectorAll('input[type="text"], input[type="search"]').forEach(input => {
    input.addEventListener('focus', () => {
      input.classList.add('search-active');
    });
    input.addEventListener('blur', () => {
      input.classList.remove('search-active');
    });
  });
}

/* ---- MATCH FOUND CONFETTI + OVERLAY ---- */
window.showMatchFoundAnimation = function(partnerName = 'New Companion') {
  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'match-found-overlay';
  overlay.innerHTML = `
    <div class="match-found-ring">
      <i data-lucide="check" style="width:40px;height:40px;color:var(--success);"></i>
    </div>
    <div class="match-found-label">Match Found!</div>
    <div style="font-size:var(--text-xs);color:var(--text-muted);animation:matchLabelIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both;opacity:0;">
      Connecting with <strong style="color:var(--text-primary);">${partnerName}</strong>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  // Confetti burst
  const colors = [
    'hsl(263,85%,65%)', 'hsl(142,70%,55%)', 'hsl(38,92%,60%)',
    'hsl(190,95%,55%)', 'hsl(300,70%,65%)', '#ffffff'
  ];
  const CX = window.innerWidth / 2;
  const CY = window.innerHeight / 2;

  for (let i = 0; i < 55; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const angle = (i / 55) * Math.PI * 2;
    const dist  = 80 + Math.random() * 220;
    const x0 = `${CX}px`;
    const y0 = `${CY}px`;
    const x1 = `${CX + Math.cos(angle) * dist}px`;
    const y1 = `${CY + Math.sin(angle) * dist + 60}px`;
    const rot = `${-180 + Math.random() * 360}deg`;
    const dur = `${0.8 + Math.random() * 0.6}s`;
    const delay = `${Math.random() * 0.25}s`;
    piece.style.cssText = `
      background:${colors[i % colors.length]};
      left:0;top:0;
      --x0:${x0};--y0:${y0};
      --x1:${x1};--y1:${y1};
      --rot:${rot};--dur:${dur};--delay:${delay};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }

  // Auto remove overlay after 2.2s
  setTimeout(() => {
    overlay.style.animation = 'pageSlideOut 0.3s ease forwards';
    setTimeout(() => overlay.remove(), 320);
  }, 2200);
};

