class NightGuardGame {
    constructor() {
        this.gameState = 'menu';
        this.currentNight = this.loadNightProgress();
        this.power = 100;
        this.time = 0; // 0-360 minutes (6 hours)
        this.leftDoorClosed = false;
        this.rightDoorClosed = false;
        this.leftLightOn = false;
        this.rightLightOn = false;
        this.currentCamera = 1;
        this.cameraActive = false;
        this.entities = [];
        this.gameTimer = null;
        this.powerDrain = 1; // Base power drain per minute
        this.customAI = { shadow: 1, whisper: 1 }; // Custom AI levels for Night 7
        this.achievements = this.loadAchievements();
        this.gameAmbiancePlaying = false;
        
        // Customization data
        this.customizations = this.loadCustomizations();
        this.generatedCode = { html: '', css: '', js: '' };
        this.customEntities = this.loadCustomEntities();
        this.customCameras = this.loadCustomCameras();
        this.editingEntity = null;
        this.editingCamera = null;

        this.initializeEntities();
        this.setupEventListeners();
        this.setupAudio();
    }

    initializeEntities() {
        // Create AI entities that move around
        this.entities = [
            {
                id: 'shadow',
                name: 'Shadow Entity',
                position: 1, // Camera position
                aggressiveness: this.getBaseAggressiveness(),
                moveTimer: 0,
                moveInterval: this.getMoveInterval(),
                atDoor: null // 'left', 'right', or null
            },
            {
                id: 'whisper',
                name: 'Whisper Ghost',
                position: 3,
                aggressiveness: this.getBaseAggressiveness(),
                moveTimer: 0,
                moveInterval: this.getMoveInterval(),
                atDoor: null
            }
        ];
    }

    setupEventListeners() {
        // Menu buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('instructions-btn').addEventListener('click', () => this.showInstructions());
        document.getElementById('customize-btn').addEventListener('click', () => this.showCustomizeScreen());
        document.getElementById('back-btn').addEventListener('click', () => this.showMenu());

        // Game controls
        document.getElementById('camera-btn').addEventListener('click', () => this.toggleCameras());
        document.getElementById('close-cameras').addEventListener('click', () => this.toggleCameras());

        document.getElementById('left-door-btn').addEventListener('click', () => this.toggleDoor('left'));
        document.getElementById('right-door-btn').addEventListener('click', () => this.toggleDoor('right'));
        document.getElementById('left-light-btn').addEventListener('click', () => this.toggleLight('left'));
        document.getElementById('right-light-btn').addEventListener('click', () => this.toggleLight('right'));

        // Camera buttons
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCamera(parseInt(e.target.dataset.cam));
            });
        });

        // Game over/win buttons
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('next-night-btn').addEventListener('click', () => this.nextNight());
        document.getElementById('menu-btn2').addEventListener('click', () => this.showMenu());

        // Custom AI controls
        document.getElementById('start-custom-night').addEventListener('click', () => this.startCustomNight());
        document.getElementById('cancel-custom').addEventListener('click', () => this.showMenu());

        // Customize game controls
        document.getElementById('customize-btn').addEventListener('click', () => this.showCustomizeScreen());
        document.getElementById('close-customize').addEventListener('click', () => this.showMenu());
        document.getElementById('apply-customizations').addEventListener('click', () => this.applyCustomizations());
        document.getElementById('reset-customizations').addEventListener('click', () => this.resetCustomizations());

        // Entity management
        document.getElementById('add-entity-btn').addEventListener('click', () => this.addNewEntity());
        document.getElementById('save-entity').addEventListener('click', () => this.saveEntity());
        document.getElementById('cancel-entity').addEventListener('click', () => this.cancelEntityEdit());
        document.getElementById('delete-entity').addEventListener('click', () => this.deleteEntity());

        // Camera management
        document.getElementById('add-camera-btn').addEventListener('click', () => this.addNewCamera());
        document.getElementById('save-camera').addEventListener('click', () => this.saveCamera());
        document.getElementById('cancel-camera').addEventListener('click', () => this.cancelCameraEdit());
        document.getElementById('delete-camera').addEventListener('click', () => this.deleteCamera());
        document.getElementById('add-connection').addEventListener('click', () => this.addCameraConnection());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Code tab switching
        document.querySelectorAll('.code-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchCodeTab(e.target.dataset.codeTab));
        });

        // AI code generator
        document.getElementById('generate-feature').addEventListener('click', () => this.generateFeature());
        document.getElementById('apply-generated-code').addEventListener('click', () => this.applyGeneratedCode());
        document.getElementById('copy-generated-code').addEventListener('click', () => this.copyGeneratedCode());

        // Export/Import
        document.getElementById('export-full-game').addEventListener('click', () => this.exportFullGame());
        document.getElementById('export-mod-config').addEventListener('click', () => this.exportModConfig());
        document.getElementById('import-mod-btn').addEventListener('click', () => document.getElementById('import-mod').click());
        document.getElementById('import-mod').addEventListener('change', (e) => this.importModConfig(e));

        // AI slider controls
        document.getElementById('shadow-ai').addEventListener('input', (e) => {
            document.getElementById('shadow-value').textContent = e.target.value;
        });
        document.getElementById('whisper-ai').addEventListener('input', (e) => {
            document.getElementById('whisper-value').textContent = e.target.value;
        });
    }

    setupAudio() {
        this.ambientSound = document.getElementById('ambient-sound');
        this.ambientSound.volume = 0.3;

        // Initialize Web Audio API for sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};

        // Create sound effects
        this.createSounds();

        // Menu music
        this.menuMusicPlaying = false;
        this.startMenuMusic();
    }

    createSounds() {
        // Jumpscare sound - sharp, high-pitched noise
        this.sounds.jumpscare = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.type = 'sawtooth';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };

        // Door sound - mechanical clunk
        this.sounds.door = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();

            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(120, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime + 0.1);

            filterNode.type = 'lowpass';
            filterNode.frequency.value = 400;

            gainNode.gain.setValueAtTime(0.6, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.type = 'square';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };

        // Camera flip sound - electronic beep
        this.sounds.camera = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.type = 'sine';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };

        // Light sound - electrical buzz
        this.sounds.light = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.type = 'sawtooth';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };

        // Entity detected sound - warning tone
        this.sounds.entityDetected = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(330, this.audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.4);

            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);

            oscillator.type = 'triangle';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.6);
        };
    }

    startMenuMusic() {
        if (this.menuMusicPlaying || this.gameState !== 'menu') return;

        this.menuMusicPlaying = true;
        this.playMenuMusic();
    }

    playMenuMusic() {
        if (!this.menuMusicPlaying || this.gameState !== 'menu') return;

        // Create eerie menu music - low frequency drone with variations
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        oscillator1.connect(filterNode);
        oscillator2.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator1.frequency.setValueAtTime(55, this.audioContext.currentTime); // Low A
        oscillator2.frequency.setValueAtTime(82.4, this.audioContext.currentTime); // Low E

        filterNode.type = 'lowpass';
        filterNode.frequency.value = 200;
        filterNode.Q.value = 5;

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

        oscillator1.type = 'sawtooth';
        oscillator2.type = 'triangle';

        oscillator1.start();
        oscillator2.start();

        // Add some variation to the drone
        setTimeout(() => {
            if (this.menuMusicPlaying) {
                oscillator1.frequency.setValueAtTime(58.3, this.audioContext.currentTime); // A#
                setTimeout(() => {
                    if (this.menuMusicPlaying) {
                        oscillator1.frequency.setValueAtTime(55, this.audioContext.currentTime); // Back to A
                    }
                }, 2000);
            }
        }, 3000);

        oscillator1.stop(this.audioContext.currentTime + 8);
        oscillator2.stop(this.audioContext.currentTime + 8);

        // Loop the menu music
        setTimeout(() => {
            if (this.menuMusicPlaying && this.gameState === 'menu') {
                this.playMenuMusic();
            }
        }, 6000);
    }

    stopMenuMusic() {
        this.menuMusicPlaying = false;
    }

    createGameAmbiance() {
        if (this.gameAmbiancePlaying) return;

        this.gameAmbiancePlaying = true;
        this.playGameAmbiance();
    }

    playGameAmbiance() {
        if (!this.gameAmbiancePlaying || this.gameState !== 'playing') return;

        // Create unsettling background ambiance
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Random low frequency for unease
        const baseFreq = 30 + Math.random() * 40;
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(baseFreq + Math.random() * 20 - 10, this.audioContext.currentTime + 2);

        filterNode.type = 'lowpass';
        filterNode.frequency.value = 100 + Math.random() * 50;

        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.08 + Math.random() * 0.02, this.audioContext.currentTime + 1);
        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime + 2);

        oscillator.type = 'triangle';
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 4);

        // Random creepy sounds
        if (Math.random() < 0.3) {
            setTimeout(() => {
                this.playRandomCreepySound();
            }, Math.random() * 3000);
        }

        // Continue ambiance
        setTimeout(() => {
            if (this.gameAmbiancePlaying && this.gameState === 'playing') {
                this.playGameAmbiance();
            }
        }, 3000 + Math.random() * 2000);
    }

    playRandomCreepySound() {
        const sounds = ['whisper', 'creak', 'footstep'];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];

        if (sound === 'whisper') {
            // High frequency whisper-like sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(2000 + Math.random() * 1000, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

            oscillator.type = 'sawtooth';
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        }
    }

    stopGameAmbiance() {
        this.gameAmbiancePlaying = false;
    }

    // Cookie management for saving progress
    setCookie(name, value, days = 30) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    saveNightProgress() {
        this.setCookie('nightGuardProgress', this.currentNight.toString());
        console.log(`Progress saved: Night ${this.currentNight}`);
    }

    loadNightProgress() {
        const savedNight = this.getCookie('nightGuardProgress');
        if (savedNight) {
            const night = parseInt(savedNight);
            console.log(`Progress loaded: Night ${night}`);
            return night;
        }
        return 1; // Default to night 1
    }

    resetProgress() {
        this.setCookie('nightGuardProgress', '1');
        this.setCookie('nightGuardAchievements', JSON.stringify({ night5: false, night6: false, night7: false }));
        this.currentNight = 1;
        this.achievements = { night5: false, night6: false, night7: false };
        console.log('Progress reset to Night 1');
    }

    saveAchievements() {
        this.setCookie('nightGuardAchievements', JSON.stringify(this.achievements));
    }

    loadAchievements() {
        const saved = this.getCookie('nightGuardAchievements');
        if (saved) {
            return JSON.parse(saved);
        }
        return { night5: false, night6: false, night7: false };
    }

    getBaseAggressiveness() {
        const difficultyMap = {
            1: 0.1, // Very easy tutorial
            2: 0.3, // Easy
            3: 0.6, // Medium
            4: 1.0, // Hard
            5: 1.5, // Very hard
            6: 2.5, // Extreme
            7: 1.0  // Custom (will be overridden)
        };
        return difficultyMap[this.currentNight] || 1.0;
    }

    getMoveInterval() {
        const baseInterval = 180 - (this.currentNight * 20);
        return Math.max(30, baseInterval + Math.random() * 60);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.gameState = screenId;
    }

    showMenu() {
        this.showScreen('menu');
        this.stopGame();
        this.stopGameAmbiance();
        this.updateMenuDisplay();
        // Start menu music after a brief delay
        setTimeout(() => {
            this.startMenuMusic();
        }, 500);
    }

    updateMenuDisplay() {
        document.getElementById('current-night-display').textContent = this.currentNight;

        // Update button text based on progress
        const startBtn = document.getElementById('start-btn');
        if (this.currentNight === 1) {
            startBtn.textContent = 'Start Game';
        } else {
            startBtn.textContent = `Continue Game (Night ${this.currentNight})`;
        }

        // Update achievement display
        const night5Achievement = document.getElementById('achievement-night5');
        const night6Achievement = document.getElementById('achievement-night6');
        const night7Achievement = document.getElementById('achievement-night7');
        const characterImage = document.getElementById('character-image');

        night5Achievement.style.display = this.achievements.night5 ? 'block' : 'none';
        night6Achievement.style.display = this.achievements.night6 ? 'block' : 'none';
        night7Achievement.style.display = this.achievements.night7 ? 'block' : 'none';
        characterImage.style.display = this.achievements.night7 ? 'block' : 'none';
    }

    newGame() {
        this.resetProgress();
        this.updateMenuDisplay();
        this.startGame();
    }

    showInstructions() {
        this.showScreen('instructions');
    }

    startGame() {
        this.showScreen('game');
        this.resetGame();
        this.gameState = 'playing';
        this.startGameLoop();
        this.stopMenuMusic();
        this.createGameAmbiance();
        this.ambientSound.play();
    }

    resetGame() {
        this.power = 100;
        this.time = 0;
        this.leftDoorClosed = false;
        this.rightDoorClosed = false;
        this.leftLightOn = false;
        this.rightLightOn = false;
        this.currentCamera = 1;
        this.cameraActive = false;

        this.initializeEntities();
        this.updateUI();
        this.switchToOffice();

        // Hide overlays
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
    }

    startGameLoop() {
        this.gameTimer = setInterval(() => {
            this.updateGame();
        }, 1000); // Update every second
    }

    stopGame() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        this.ambientSound.pause();
        this.stopGameAmbiance();
    }

    updateGame() {
        if (this.gameState !== 'playing') return;

        // Increment time (1 real second = 1 game minute)
        this.time += 1;

        // Drain power
        this.updatePower();

        // Update entities
        this.updateEntities();

        // Check win condition (6 AM = 360 minutes)
        if (this.time >= 360) {
            this.winNight();
            return;
        }

        // Check lose condition
        if (this.power <= 0) {
            this.gameOver();
            return;
        }

        // Check entity attacks
        this.checkAttacks();

        this.updateUI();
    }

    updatePower() {
        let drain = this.powerDrain;

        // Additional drain for active systems
        if (this.leftDoorClosed) drain += 1;
        if (this.rightDoorClosed) drain += 1;
        if (this.leftLightOn) drain += 0.5;
        if (this.rightLightOn) drain += 0.5;
        if (this.cameraActive) drain += 1;

        this.power -= drain / 60; // Convert to per-second drain
        this.power = Math.max(0, this.power);
    }

    updateEntities() {
        this.entities.forEach(entity => {
            entity.moveTimer += 1;

            // Calculate aggressiveness based on night and time
            if (this.currentNight === 7) {
                // Use custom AI values for Night 7 (1-35 scale)
                entity.aggressiveness = (this.customAI[entity.id] / 10) + (this.time / 360);
            } else {
                // Progressive difficulty throughout the night
                const timeMultiplier = 1 + (this.time / 240); // Gets harder as night progresses
                entity.aggressiveness = this.getBaseAggressiveness() * timeMultiplier;
            }

            // Check if entity should move
            if (entity.moveTimer >= entity.moveInterval) {
                this.moveEntity(entity);
                entity.moveTimer = 0;
                entity.moveInterval = Math.max(15, this.getMoveInterval() / entity.aggressiveness);
            }

            // Check if entity at door should attack
            if (entity.atDoor && Math.random() < entity.aggressiveness * 0.02) {
                this.attemptAttack(entity);
            }
        });
    }

    moveEntity(entity) {
        const moveChance = Math.min(0.8, entity.aggressiveness * 0.15);
        if (Math.random() < moveChance) {
            const possibleMoves = this.getPossibleMoves(entity.position);
            if (possibleMoves.length > 0) {
                const newPos = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

                // Clear previous door state
                entity.atDoor = null;

                // Check if moving to a door
                if (newPos === 'left-door') {
                    entity.position = null;
                    entity.atDoor = 'left';
                    console.log(`${entity.name} is at the left door!`);
                } else if (newPos === 'right-door') {
                    entity.position = null;
                    entity.atDoor = 'right';
                    console.log(`${entity.name} is at the right door!`);
                } else {
                    entity.position = newPos;
                    console.log(`${entity.name} moved to camera ${newPos}`);
                }
            }
        }
    }

    getPossibleMoves(currentPos) {
        const moveMap = {
            1: [2], // Entrance -> Hallway
            2: [1, 3, 'left-door'], // Hallway -> Entrance, Storage, Left Door
            3: [2, 4], // Storage -> Hallway, Kitchen
            4: [3, 'right-door'], // Kitchen -> Storage, Right Door
            null: [1, 3] // From doors back to cameras
        };
        return moveMap[currentPos] || [];
    }

    attemptAttack(entity) {
        const doorSide = entity.atDoor;
        const doorClosed = doorSide === 'left' ? this.leftDoorClosed : this.rightDoorClosed;

        if (!doorClosed) {
            console.log(`${entity.name} attacks from ${doorSide} door!`);
            this.gameOver('jumpScare');
        } else {
            // Door blocked the attack, entity retreats
            entity.atDoor = null;
            entity.position = doorSide === 'left' ? 2 : 4;
            console.log(`${entity.name} was blocked by the door and retreated`);
        }
    }

    checkAttacks() {
        // This method is now handled by attemptAttack in updateEntities
    }

    toggleDoor(side) {
        if (this.power <= 0) return;

        if (side === 'left') {
            this.leftDoorClosed = !this.leftDoorClosed;
            const door = document.getElementById('left-door');
            const btn = document.getElementById('left-door-btn');
            if (this.leftDoorClosed) {
                door.classList.add('closed');
                btn.textContent = 'Open Left Door';
            } else {
                door.classList.remove('closed');
                btn.textContent = 'Close Left Door';
            }
            this.playSound('door');
        } else {
            this.rightDoorClosed = !this.rightDoorClosed;
            const door = document.getElementById('right-door');
            const btn = document.getElementById('right-door-btn');
            if (this.rightDoorClosed) {
                door.classList.add('closed');
                btn.textContent = 'Open Right Door';
            } else {
                door.classList.remove('closed');
                btn.textContent = 'Close Right Door';
            }
            this.playSound('door');
        }
    }

    toggleLight(side) {
        if (this.power <= 0) return;

        if (side === 'left') {
            this.leftLightOn = !this.leftLightOn;
            if (this.leftLightOn) {
                this.playSound('light');
                // Check if entity is at left door
                const entityAtDoor = this.entities.find(e => e.atDoor === 'left');
                if (entityAtDoor) {
                    this.showMessage(`⚠️ ${entityAtDoor.name} is at the left door! ⚠️`);
                    this.playSound('entityDetected');
                } else {
                    this.showMessage('Left hallway is clear');
                }
                setTimeout(() => { this.leftLightOn = false; }, 3000);
            }
        } else {
            this.rightLightOn = !this.rightLightOn;
            if (this.rightLightOn) {
                this.playSound('light');
                // Check if entity is at right door
                const entityAtDoor = this.entities.find(e => e.atDoor === 'right');
                if (entityAtDoor) {
                    this.showMessage(`⚠️ ${entityAtDoor.name} is at the right door! ⚠️`);
                    this.playSound('entityDetected');
                } else {
                    this.showMessage('Right hallway is clear');
                }
                setTimeout(() => { this.rightLightOn = false; }, 3000);
            }
        }
    }

    toggleCameras() {
        if (this.power <= 0) return;

        this.cameraActive = !this.cameraActive;
        if (this.cameraActive) {
            this.switchToCameras();
        } else {
            this.switchToOffice();
        }
    }

    switchToCameras() {
        document.getElementById('office-view').classList.remove('active');
        document.getElementById('camera-view').classList.add('active');
        this.cameraActive = true;
        this.playSound('camera');
        this.updateCameraFeed();
        // Set default camera if none selected
        if (!document.querySelector('.cam-btn.active')) {
            this.switchCamera(1);
        }
    }

    switchToOffice() {
        document.getElementById('camera-view').classList.remove('active');
        document.getElementById('office-view').classList.add('active');
        this.cameraActive = false;
        this.playSound('camera');
    }

    switchCamera(camNum) {
        this.currentCamera = camNum;
        this.updateCameraFeed();
        this.playSound('camera');

        // Update camera button states
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-cam="${camNum}"]`).classList.add('active');
    }

    updateCameraFeed() {
        const feed = document.getElementById('camera-feed');
        const cameraNames = {
            1: this.customizations.cameraNames?.[0] || 'Main Entrance',
            2: this.customizations.cameraNames?.[1] || 'East Hallway', 
            3: this.customizations.cameraNames?.[2] || 'Storage Room',
            4: this.customizations.cameraNames?.[3] || 'Kitchen Area'
        };

        // Check if any entities are visible on this camera
        const entitiesHere = this.entities.filter(e => e.position === this.currentCamera);
        const hasEntity = entitiesHere.length > 0;

        // Determine which image to show
        const imageFile = hasEntity ? 
            `images/cameras/cam${this.currentCamera}_entity.jpg` : 
            `images/cameras/cam${this.currentCamera}_empty.jpg`;

        feed.innerHTML = `
            <div class="camera-container">
                <img src="${imageFile}" 
                     alt="Camera ${this.currentCamera} Feed"
                     class="camera-image"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />

                <div class="camera-fallback">
                    <div class="fallback-content">
                        📹 CAM ${this.currentCamera}<br>
                        <span class="fallback-subtext">Image not found - Add images to /images/cameras/</span>
                    </div>
                </div>

                <div class="camera-hud">
                    <div class="camera-title">
                        CAM ${this.currentCamera} - ${cameraNames[this.currentCamera]}
                    </div>
                    <div class="camera-timestamp">
                        REC ● ${this.getTimestamp()}
                    </div>
                </div>

                ${hasEntity ? `
                    <div class="entity-warning">
                        <div class="warning-text">
                            ⚠️ ENTITY DETECTED ⚠️
                        </div>
                        <div class="entity-name">
                            ${entitiesHere[0].name.toUpperCase()}
                        </div>
                    </div>
                ` : `
                    <div class="all-clear">
                        ALL CLEAR
                    </div>
                `}

                <div class="static-overlay"></div>
            </div>
        `;
    }

    getTimestamp() {
        const hours = Math.floor(this.time / 60);
        const minutes = this.time % 60;
        const displayHour = hours === 0 ? 12 : hours;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} AM`;
    }

    getCurrentTimeString() {
        const hours = Math.floor(this.time / 60);
        const minutes = this.time % 60;
        const displayHour = hours === 0 ? 12 : hours;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} AM`;
    }

    updateUI() {
        // Update time display
        const hours = Math.floor(this.time / 60);
        const minutes = this.time % 60;
        const displayHour = hours === 0 ? 12 : hours;
        const ampm = hours < 6 ? 'AM' : 'AM';
        document.getElementById('time').textContent = 
            `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        // Update power display
        const powerElement = document.getElementById('power');
        powerElement.textContent = `Power: ${Math.round(this.power)}%`;
        if (this.power < 20) {
            powerElement.classList.add('low');
        } else {
            powerElement.classList.remove('low');
        }

        // Update night display
        document.getElementById('night').textContent = `Night ${this.currentNight}`;

        // Update camera feed if active
        if (this.cameraActive) {
            this.updateCameraFeed();
        }
    }

    showMessage(message) {
        // Create temporary message overlay
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: #ff6b6b;
            padding: 20px;
            border: 2px solid #ff6b6b;
            border-radius: 10px;
            font-size: 1.5rem;
            z-index: 2000;
            text-align: center;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }

    gameOver(type = 'normal') {
        this.gameState = 'gameOver';
        this.stopGame();

        if (type === 'jumpScare') {
            this.playSound('jumpscare');
            document.body.classList.add('jump-scare');
            setTimeout(() => {
                document.body.classList.remove('jump-scare');
            }, 500);
        }

        document.getElementById('game-over').classList.add('active');
    }

    winNight() {
        this.gameState = 'win';
        this.stopGame();

        // Save progress and check for achievements
        this.saveNightProgress();

        // Check achievements
        if (this.currentNight === 5) {
            this.achievements.night5 = true;
            this.saveAchievements();
            this.showMessage('🏆 Achievement Unlocked: Survived Night 5!');
        } else if (this.currentNight === 6) {
            this.achievements.night6 = true;
            this.saveAchievements();
            this.showMessage('🏆 Achievement Unlocked: Survived Night 6 (Extreme)!');
        } else if (this.currentNight === 7) {
            this.checkLevel35Achievement();
        }

        document.getElementById('win-screen').classList.add('active');
        this.updateMenuDisplay(); // Update menu to show new achievements
    }

    playSound(type) {
        if (this.sounds[type]) {
            try {
                this.sounds[type]();
            } catch (error) {
                console.log(`Error playing sound: ${type}`, error);
            }
        } else {
            console.log(`Sound not found: ${type}`);
        }
    }

    nextNight() {
        this.currentNight++;
        this.saveNightProgress(); // Save progress when advancing to next night

        if (this.currentNight === 7) {
            this.showCustomAIScreen();
        } else {
            this.startGame();
        }
    }

    showCustomAIScreen() {
        document.getElementById('win-screen').classList.remove('active');
        document.getElementById('custom-ai-screen').classList.add('active');

        // Reset sliders to default values
        document.getElementById('shadow-ai').value = 1;
        document.getElementById('whisper-ai').value = 1;
        document.getElementById('shadow-value').textContent = '1';
        document.getElementById('whisper-value').textContent = '1';
    }

    startCustomNight() {
        // Get custom AI values
        this.customAI.shadow = parseInt(document.getElementById('shadow-ai').value);
        this.customAI.whisper = parseInt(document.getElementById('whisper-ai').value);

        // Check if both are at max level (35)
        if (this.customAI.shadow === 35 && this.customAI.whisper === 35) {
            this.isLevel35Challenge = true;
        }

        document.getElementById('custom-ai-screen').classList.remove('active');
        this.startGame();
    }

    checkLevel35Achievement() {
        if (this.isLevel35Challenge && this.currentNight === 7) {
            this.achievements.night7 = true;
            this.saveAchievements();
            this.showMessage('🏆🏆🏆 ULTIMATE ACHIEVEMENT: Survived Night 7 Level 35! 🏆🏆🏆');
        }
    }

    // Customization System
    showCustomizeScreen() {
        this.stopMenuMusic();
        document.getElementById('customize-screen').classList.add('active');
        this.loadCustomizationUI();
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    switchCodeTab(tabName) {
        document.querySelectorAll('.code-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.code-block').forEach(block => block.classList.remove('active'));
        
        document.querySelector(`[data-code-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`generated-${tabName}`).classList.add('active');
    }

    loadCustomizationUI() {
        const customizations = this.customizations;
        
        // Load visual settings
        document.getElementById('office-theme').value = customizations.officeTheme || 'default';
        document.getElementById('primary-color').value = customizations.primaryColor || '#ff6b6b';
        document.getElementById('secondary-color').value = customizations.secondaryColor || '#4ecdc4';
        document.getElementById('text-color').value = customizations.textColor || '#ffffff';
        
        // Load camera names
        document.getElementById('cam1-name').value = customizations.cameraNames?.[0] || 'Main Entrance';
        document.getElementById('cam2-name').value = customizations.cameraNames?.[1] || 'East Hallway';
        document.getElementById('cam3-name').value = customizations.cameraNames?.[2] || 'Storage Room';
        document.getElementById('cam4-name').value = customizations.cameraNames?.[3] || 'Kitchen Area';
        
        // Load gameplay settings
        document.getElementById('power-drain').value = customizations.powerDrainRate || 1;
        document.getElementById('entity-speed').value = customizations.entitySpeed || 1;
        document.getElementById('night-duration').value = customizations.nightDuration || 6;
        
        // Load entity names
        document.getElementById('entity1-name').value = customizations.entityNames?.[0] || 'Shadow Entity';
        document.getElementById('entity2-name').value = customizations.entityNames?.[1] || 'Whisper Ghost';

        // Load entity and camera lists
        this.loadEntitiesList();
        this.loadCamerasList();
    }

    applyCustomizations() {
        const customizations = {
            officeTheme: document.getElementById('office-theme').value,
            primaryColor: document.getElementById('primary-color').value,
            secondaryColor: document.getElementById('secondary-color').value,
            textColor: document.getElementById('text-color').value,
            cameraNames: [
                document.getElementById('cam1-name').value,
                document.getElementById('cam2-name').value,
                document.getElementById('cam3-name').value,
                document.getElementById('cam4-name').value
            ],
            powerDrainRate: parseFloat(document.getElementById('power-drain').value),
            entitySpeed: parseFloat(document.getElementById('entity-speed').value),
            nightDuration: parseInt(document.getElementById('night-duration').value),
            entityNames: [
                document.getElementById('entity1-name').value,
                document.getElementById('entity2-name').value
            ]
        };

        this.customizations = customizations;
        this.saveCustomizations();
        this.applyVisualCustomizations();
        this.showMessage('✅ Customizations applied successfully!');
    }

    applyVisualCustomizations() {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.customizations.primaryColor);
        root.style.setProperty('--secondary-color', this.customizations.secondaryColor);
        root.style.setProperty('--text-color', this.customizations.textColor);

        // Apply office theme
        const officeView = document.getElementById('office-view');
        officeView.className = `view ${this.customizations.officeTheme}-theme`;

        // Update camera button names
        const camButtons = document.querySelectorAll('.cam-btn');
        camButtons.forEach((btn, index) => {
            if (this.customizations.cameraNames && this.customizations.cameraNames[index]) {
                btn.textContent = `CAM ${index + 1} - ${this.customizations.cameraNames[index]}`;
            }
        });

        // Update entity names in game
        if (this.entities.length > 0 && this.customizations.entityNames) {
            this.entities[0].name = this.customizations.entityNames[0] || 'Shadow Entity';
            if (this.entities[1]) this.entities[1].name = this.customizations.entityNames[1] || 'Whisper Ghost';
        }
    }

    resetCustomizations() {
        this.customizations = {};
        this.saveCustomizations();
        this.loadCustomizationUI();
        this.applyVisualCustomizations();
        this.showMessage('🔄 Customizations reset to defaults!');
    }

    // AI Code Generator
    async generateFeature() {
        const prompt = document.getElementById('ai-prompt').value.trim();
        if (!prompt) {
            this.showMessage('⚠️ Please enter a feature description!');
            return;
        }

        document.getElementById('generate-feature').textContent = 'Generating...';
        
        try {
            // Simulate AI code generation (you can integrate with actual AI APIs)
            const generatedFeature = this.simulateAIGeneration(prompt);
            
            this.generatedCode = generatedFeature;
            document.getElementById('generated-html').textContent = generatedFeature.html;
            document.getElementById('generated-css').textContent = generatedFeature.css;
            document.getElementById('generated-js').textContent = generatedFeature.js;
            
            this.showMessage('✅ Feature generated successfully!');
        } catch (error) {
            this.showMessage('❌ Error generating feature. Please try again.');
        }
        
        document.getElementById('generate-feature').textContent = 'Generate Feature';
    }

    simulateAIGeneration(prompt) {
        // This is a simplified AI simulation - in a real implementation, 
        // you'd integrate with AI APIs like OpenAI, Cohere, or local models
        
        const features = {
            flashlight: {
                html: `<!-- Flashlight Feature -->
<div id="flashlight-container" style="position: absolute; bottom: 120px; right: 20px; z-index: 100;">
    <button id="flashlight-btn" class="control-btn">🔦 Flashlight</button>
    <div id="battery-indicator">Battery: <span id="battery-level">100</span>%</div>
</div>`,
                css: `/* Flashlight Styles */
#flashlight-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

#battery-indicator {
    color: #ffd93d;
    font-size: 0.9rem;
    text-align: center;
    background: rgba(0,0,0,0.7);
    padding: 5px 10px;
    border-radius: 3px;
}

.flashlight-beam {
    position: absolute;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
    z-index: 200;
}`,
                js: `// Flashlight Feature
this.batteryLevel = 100;
this.flashlightOn = false;

document.getElementById('flashlight-btn').addEventListener('click', () => {
    this.toggleFlashlight();
});

toggleFlashlight() {
    if (this.batteryLevel <= 0) {
        this.showMessage('🔋 Flashlight battery is dead!');
        return;
    }
    
    this.flashlightOn = !this.flashlightOn;
    const btn = document.getElementById('flashlight-btn');
    
    if (this.flashlightOn) {
        btn.textContent = '🔦 Turn Off';
        this.createFlashlightBeam();
        this.startBatteryDrain();
    } else {
        btn.textContent = '🔦 Flashlight';
        this.removeFlashlightBeam();
        this.stopBatteryDrain();
    }
}`
            },
            sanity: {
                html: `<!-- Sanity System -->
<div id="sanity-meter" style="position: fixed; top: 70px; left: 20px; z-index: 1000;">
    <div style="background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
        Sanity: <span id="sanity-level" style="color: #4ecdc4;">100</span>%
        <div style="width: 100px; height: 10px; background: #333; border-radius: 5px; margin-top: 5px;">
            <div id="sanity-bar" style="width: 100%; height: 100%; background: #4ecdc4; border-radius: 5px; transition: all 0.3s;"></div>
        </div>
    </div>
</div>`,
                css: `/* Sanity System Styles */
#sanity-meter {
    font-size: 0.9rem;
}

.low-sanity {
    animation: sanity-flicker 2s infinite;
}

@keyframes sanity-flicker {
    0%, 100% { filter: hue-rotate(0deg); }
    50% { filter: hue-rotate(180deg) saturate(2); }
}`,
                js: `// Sanity System
this.sanityLevel = 100;

updateSanity() {
    // Sanity decreases when entities are near
    const nearbyEntities = this.entities.filter(e => e.atDoor || e.position === this.currentCamera);
    if (nearbyEntities.length > 0) {
        this.sanityLevel -= 0.5;
    }
    
    // Sanity slowly recovers when safe
    if (nearbyEntities.length === 0 && this.sanityLevel < 100) {
        this.sanityLevel += 0.1;
    }
    
    this.sanityLevel = Math.max(0, Math.min(100, this.sanityLevel));
    
    // Update UI
    document.getElementById('sanity-level').textContent = Math.round(this.sanityLevel);
    const sanityBar = document.getElementById('sanity-bar');
    sanityBar.style.width = this.sanityLevel + '%';
    
    if (this.sanityLevel < 30) {
        sanityBar.style.background = '#ff6b6b';
        document.body.classList.add('low-sanity');
    } else {
        sanityBar.style.background = '#4ecdc4';
        document.body.classList.remove('low-sanity');
    }
}`
            }
        };

        // Simple keyword matching for demo
        if (prompt.toLowerCase().includes('flashlight') || prompt.toLowerCase().includes('light') || prompt.toLowerCase().includes('battery')) {
            return features.flashlight;
        } else if (prompt.toLowerCase().includes('sanity') || prompt.toLowerCase().includes('stress') || prompt.toLowerCase().includes('mental')) {
            return features.sanity;
        } else {
            // Generate a basic template
            return {
                html: `<!-- Custom Feature: ${prompt} -->
<div id="custom-feature" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
    <button id="custom-btn" class="control-btn">Custom Feature</button>
</div>`,
                css: `/* Custom Feature Styles */
#custom-feature {
    /* Add your custom styles here */
}`,
                js: `// Custom Feature: ${prompt}
document.getElementById('custom-btn').addEventListener('click', () => {
    this.showMessage('Custom feature activated!');
    // Add your custom logic here
});`
            };
        }
    }

    applyGeneratedCode() {
        try {
            // Apply HTML
            if (this.generatedCode.html) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.generatedCode.html;
                document.getElementById('game').appendChild(tempDiv.firstElementChild);
            }

            // Apply CSS
            if (this.generatedCode.css) {
                const style = document.createElement('style');
                style.textContent = this.generatedCode.css;
                document.head.appendChild(style);
            }

            // Apply JavaScript (safely)
            if (this.generatedCode.js) {
                try {
                    eval(this.generatedCode.js);
                } catch (jsError) {
                    console.warn('Error applying JavaScript code:', jsError);
                }
            }

            this.showMessage('✅ Generated code applied to game!');
        } catch (error) {
            this.showMessage('❌ Error applying generated code.');
            console.error('Code application error:', error);
        }
    }

    copyGeneratedCode() {
        const fullCode = `<!-- HTML -->\n${this.generatedCode.html}\n\n/* CSS */\n${this.generatedCode.css}\n\n// JavaScript\n${this.generatedCode.js}`;
        navigator.clipboard.writeText(fullCode).then(() => {
            this.showMessage('📋 Code copied to clipboard!');
        });
    }

    // Export/Import System
    exportFullGame() {
        const gameHtml = this.generateFullGameHTML();
        const zip = this.createZipFile({
            'index.html': gameHtml,
            'README.md': this.generateReadme()
        });
        
        this.downloadFile(zip, 'custom-night-guard-game.zip');
        this.showMessage('📦 Full game exported successfully!');
    }

    exportModConfig() {
        const modXml = this.generateModXML();
        this.downloadFile(modXml, 'night-guard-mod.xml');
        this.showMessage('📄 Mod configuration exported!');
    }

    importModConfig(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
                const customizations = this.parseModXML(xmlDoc);
                
                this.customizations = customizations;
                this.saveCustomizations();
                this.loadCustomizationUI();
                this.applyVisualCustomizations();
                
                this.showMessage('✅ Mod configuration imported successfully!');
            } catch (error) {
                this.showMessage('❌ Error importing mod configuration.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }

    generateFullGameHTML() {
        const currentHTML = document.documentElement.outerHTML;
        const customCSS = this.generateCustomCSS();
        const customJS = this.generateCustomJS();
        
        return currentHTML
            .replace('</head>', `<style>${customCSS}</style></head>`)
            .replace('</body>', `<script>${customJS}</script></body>`);
    }

    generateCustomCSS() {
        return `
/* Custom Game Styles */
:root {
    --primary-color: ${this.customizations.primaryColor || '#ff6b6b'};
    --secondary-color: ${this.customizations.secondaryColor || '#4ecdc4'};
    --text-color: ${this.customizations.textColor || '#ffffff'};
}

${this.generatedCode.css || ''}
        `;
    }

    generateCustomJS() {
        return `
// Custom Game Logic
${this.generatedCode.js || ''}

// Apply customizations on load
document.addEventListener('DOMContentLoaded', function() {
    if (window.game) {
        window.game.customizations = ${JSON.stringify(this.customizations)};
        window.game.applyVisualCustomizations();
    }
});
        `;
    }

    generateModXML() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<NightGuardMod version="1.0">
    <Visual>
        <OfficeTheme>${this.customizations.officeTheme || 'default'}</OfficeTheme>
        <PrimaryColor>${this.customizations.primaryColor || '#ff6b6b'}</PrimaryColor>
        <SecondaryColor>${this.customizations.secondaryColor || '#4ecdc4'}</SecondaryColor>
        <TextColor>${this.customizations.textColor || '#ffffff'}</TextColor>
        <CameraNames>
            <Camera1>${this.customizations.cameraNames?.[0] || 'Main Entrance'}</Camera1>
            <Camera2>${this.customizations.cameraNames?.[1] || 'East Hallway'}</Camera2>
            <Camera3>${this.customizations.cameraNames?.[2] || 'Storage Room'}</Camera3>
            <Camera4>${this.customizations.cameraNames?.[3] || 'Kitchen Area'}</Camera4>
        </CameraNames>
    </Visual>
    <Gameplay>
        <PowerDrainRate>${this.customizations.powerDrainRate || 1}</PowerDrainRate>
        <EntitySpeed>${this.customizations.entitySpeed || 1}</EntitySpeed>
        <NightDuration>${this.customizations.nightDuration || 6}</NightDuration>
        <EntityNames>
            <Entity1>${this.customizations.entityNames?.[0] || 'Shadow Entity'}</Entity1>
            <Entity2>${this.customizations.entityNames?.[1] || 'Whisper Ghost'}</Entity2>
        </EntityNames>
    </Gameplay>
    <GeneratedCode>
        <HTML><![CDATA[${this.generatedCode.html || ''}]]></HTML>
        <CSS><![CDATA[${this.generatedCode.css || ''}]]></CSS>
        <JavaScript><![CDATA[${this.generatedCode.js || ''}]]></JavaScript>
    </GeneratedCode>
</NightGuardMod>`;
    }

    parseModXML(xmlDoc) {
        const getTextContent = (selector) => {
            const element = xmlDoc.querySelector(selector);
            return element ? element.textContent : null;
        };

        return {
            officeTheme: getTextContent('OfficeTheme'),
            primaryColor: getTextContent('PrimaryColor'),
            secondaryColor: getTextContent('SecondaryColor'),
            textColor: getTextContent('TextColor'),
            cameraNames: [
                getTextContent('Camera1'),
                getTextContent('Camera2'),
                getTextContent('Camera3'),
                getTextContent('Camera4')
            ],
            powerDrainRate: parseFloat(getTextContent('PowerDrainRate')) || 1,
            entitySpeed: parseFloat(getTextContent('EntitySpeed')) || 1,
            nightDuration: parseInt(getTextContent('NightDuration')) || 6,
            entityNames: [
                getTextContent('Entity1'),
                getTextContent('Entity2')
            ]
        };
    }

    generateReadme() {
        return `# Custom Night Guard Game

This is a customized version of the Night Guard horror game.

## Customizations Applied:
- Office Theme: ${this.customizations.officeTheme || 'default'}
- Primary Color: ${this.customizations.primaryColor || '#ff6b6b'}
- Secondary Color: ${this.customizations.secondaryColor || '#4ecdc4'}
- Power Drain Rate: ${this.customizations.powerDrainRate || 1}x
- Entity Speed: ${this.customizations.entitySpeed || 1}x
- Night Duration: ${this.customizations.nightDuration || 6} minutes

## How to Play:
1. Open index.html in any modern web browser
2. Survive until 6 AM by monitoring cameras and closing doors
3. Manage your power carefully!

Enjoy your custom horror experience! 👻
`;
    }

    createZipFile(files) {
        // Simple ZIP creation simulation - in a real implementation, 
        // you'd use a library like JSZip
        let zipContent = 'Custom game files would be zipped here';
        return new Blob([zipContent], { type: 'application/zip' });
    }

    downloadFile(content, filename) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    saveCustomizations() {
        this.setCookie('nightGuardCustomizations', JSON.stringify(this.customizations));
    }

    loadCustomizations() {
        const saved = this.getCookie('nightGuardCustomizations');
        return saved ? JSON.parse(saved) : {};
    }

    loadCustomEntities() {
        const saved = this.getCookie('nightGuardCustomEntities');
        return saved ? JSON.parse(saved) : [];
    }

    saveCustomEntities() {
        this.setCookie('nightGuardCustomEntities', JSON.stringify(this.customEntities));
    }

    loadCustomCameras() {
        const saved = this.getCookie('nightGuardCustomCameras');
        return saved ? JSON.parse(saved) : [];
    }

    saveCustomCameras() {
        this.setCookie('nightGuardCustomCameras', JSON.stringify(this.customCameras));
    }

    // Entity Management Methods
    loadEntitiesList() {
        const container = document.getElementById('entities-list');
        container.innerHTML = '';

        // Add default entities
        this.entities.forEach(entity => {
            const card = this.createEntityCard(entity, false);
            container.appendChild(card);
        });

        // Add custom entities
        this.customEntities.forEach(entity => {
            const card = this.createEntityCard(entity, true);
            container.appendChild(card);
        });
    }

    createEntityCard(entity, isCustom) {
        const card = document.createElement('div');
        card.className = 'entity-card';
        card.innerHTML = `
            <div class="entity-header">
                <div>
                    <span class="entity-symbol">${entity.symbol || '👻'}</span>
                    <span class="entity-name">${entity.name}</span>
                </div>
                <div style="color: ${isCustom ? '#4ecdc4' : '#ffd93d'}; font-size: 0.8rem;">
                    ${isCustom ? 'CUSTOM' : 'DEFAULT'}
                </div>
            </div>
            <div class="entity-stats">
                <div>ID: ${entity.id}</div>
                <div>Aggressiveness: ${entity.aggressiveness || 1}x</div>
                <div>Starting Position: Camera ${entity.position || 1}</div>
                ${entity.abilities ? `<div>Abilities: ${Object.keys(entity.abilities).filter(k => entity.abilities[k]).length}</div>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            this.editEntity(entity, isCustom);
        });

        return card;
    }

    addNewEntity() {
        const newEntity = {
            id: 'entity-' + Date.now(),
            name: 'New Entity',
            aggressiveness: 1,
            position: 1,
            symbol: '👻',
            color: '#ff6b6b',
            abilities: {},
            movementPattern: 'random',
            description: ''
        };
        
        this.editEntity(newEntity, true, true);
    }

    editEntity(entity, isCustom, isNew = false) {
        this.editingEntity = { entity, isCustom, isNew };
        
        // Populate form
        document.getElementById('entity-id').value = entity.id;
        document.getElementById('entity-name').value = entity.name;
        document.getElementById('entity-description').value = entity.description || '';
        document.getElementById('entity-aggression').value = entity.aggressiveness || 1;
        document.getElementById('aggression-value').textContent = entity.aggressiveness || 1;
        document.getElementById('entity-speed').value = entity.speed || 1;
        document.getElementById('speed-value').textContent = entity.speed || 1;
        document.getElementById('entity-color').value = entity.color || '#ff6b6b';
        document.getElementById('entity-symbol').value = entity.symbol || '👻';
        document.getElementById('movement-pattern').value = entity.movementPattern || 'random';

        // Populate starting camera options
        const startCamSelect = document.getElementById('entity-start-cam');
        startCamSelect.innerHTML = '';
        for (let i = 1; i <= 4 + this.customCameras.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Camera ${i}`;
            if (i === entity.position) option.selected = true;
            startCamSelect.appendChild(option);
        }

        // Set abilities
        const abilities = entity.abilities || {};
        document.getElementById('can-teleport').checked = abilities.canTeleport || false;
        document.getElementById('drains-power').checked = abilities.drainsPower || false;
        document.getElementById('invisible-cameras').checked = abilities.invisibleCameras || false;
        document.getElementById('door-hacker').checked = abilities.doorHacker || false;
        document.getElementById('light-immunity').checked = abilities.lightImmunity || false;
        document.getElementById('camera-jammer').checked = abilities.cameraJammer || false;

        // Show editor
        document.getElementById('entity-editor').style.display = 'block';
        document.getElementById('delete-entity').style.display = isNew ? 'none' : 'block';

        // Add range slider listeners
        ['entity-aggression', 'entity-speed'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id.replace('entity-', '') + '-value');
            slider.oninput = () => valueSpan.textContent = slider.value;
        });
    }

    saveEntity() {
        const form = {
            id: document.getElementById('entity-id').value,
            name: document.getElementById('entity-name').value,
            description: document.getElementById('entity-description').value,
            aggressiveness: parseFloat(document.getElementById('entity-aggression').value),
            speed: parseFloat(document.getElementById('entity-speed').value),
            position: parseInt(document.getElementById('entity-start-cam').value),
            color: document.getElementById('entity-color').value,
            symbol: document.getElementById('entity-symbol').value,
            movementPattern: document.getElementById('movement-pattern').value,
            abilities: {
                canTeleport: document.getElementById('can-teleport').checked,
                drainsPower: document.getElementById('drains-power').checked,
                invisibleCameras: document.getElementById('invisible-cameras').checked,
                doorHacker: document.getElementById('door-hacker').checked,
                lightImmunity: document.getElementById('light-immunity').checked,
                cameraJammer: document.getElementById('camera-jammer').checked
            }
        };

        if (this.editingEntity.isNew) {
            this.customEntities.push(form);
        } else if (this.editingEntity.isCustom) {
            const index = this.customEntities.findIndex(e => e.id === this.editingEntity.entity.id);
            if (index !== -1) {
                this.customEntities[index] = form;
            }
        } else {
            // Editing default entity - create custom version
            this.customEntities.push(form);
        }

        this.saveCustomEntities();
        this.loadEntitiesList();
        this.cancelEntityEdit();
        this.showMessage('✅ Entity saved successfully!');
    }

    deleteEntity() {
        if (!this.editingEntity || this.editingEntity.isNew) return;

        if (this.editingEntity.isCustom) {
            const index = this.customEntities.findIndex(e => e.id === this.editingEntity.entity.id);
            if (index !== -1) {
                this.customEntities.splice(index, 1);
                this.saveCustomEntities();
                this.loadEntitiesList();
                this.cancelEntityEdit();
                this.showMessage('🗑️ Entity deleted!');
            }
        } else {
            this.showMessage('⚠️ Cannot delete default entities - create a custom version instead');
        }
    }

    cancelEntityEdit() {
        document.getElementById('entity-editor').style.display = 'none';
        this.editingEntity = null;
    }

    // Camera Management Methods
    loadCamerasList() {
        const container = document.getElementById('cameras-list');
        container.innerHTML = '';

        // Add default cameras
        for (let i = 1; i <= 4; i++) {
            const camera = {
                id: i,
                name: this.getDefaultCameraName(i),
                description: `Default camera ${i}`,
                powerDrain: 1,
                quality: 'medium',
                connections: this.getDefaultConnections(i),
                features: {}
            };
            const card = this.createCameraCard(camera, false);
            container.appendChild(card);
        }

        // Add custom cameras
        this.customCameras.forEach(camera => {
            const card = this.createCameraCard(camera, true);
            container.appendChild(card);
        });
    }

    getDefaultCameraName(id) {
        const names = ['Main Entrance', 'East Hallway', 'Storage Room', 'Kitchen Area'];
        return names[id - 1] || `Camera ${id}`;
    }

    getDefaultConnections(id) {
        const connections = {
            1: [2],
            2: [1, 3],
            3: [2, 4],
            4: [3]
        };
        return connections[id] || [];
    }

    createCameraCard(camera, isCustom) {
        const card = document.createElement('div');
        card.className = 'camera-card';
        const featureCount = camera.features ? Object.keys(camera.features).filter(k => camera.features[k]).length : 0;
        
        card.innerHTML = `
            <div class="camera-header">
                <div>
                    <span class="camera-name">📹 CAM ${camera.id}</span>
                </div>
                <div style="color: ${isCustom ? '#4ecdc4' : '#ffd93d'}; font-size: 0.8rem;">
                    ${isCustom ? 'CUSTOM' : 'DEFAULT'}
                </div>
            </div>
            <div class="camera-stats">
                <div><strong>${camera.name}</strong></div>
                <div>Power Drain: ${camera.powerDrain || 1}x</div>
                <div>Quality: ${camera.quality || 'medium'}</div>
                <div>Connections: ${camera.connections ? camera.connections.length : 0}</div>
                <div>Features: ${featureCount}</div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            this.editCamera(camera, isCustom);
        });

        return card;
    }

    addNewCamera() {
        const newId = Math.max(4, ...this.customCameras.map(c => c.id)) + 1;
        const newCamera = {
            id: newId,
            name: `Camera ${newId}`,
            description: '',
            powerDrain: 1,
            quality: 'medium',
            connections: [],
            features: {}
        };
        
        this.editCamera(newCamera, true, true);
    }

    editCamera(camera, isCustom, isNew = false) {
        this.editingCamera = { camera, isCustom, isNew };
        
        // Populate form
        document.getElementById('camera-id').value = camera.id;
        document.getElementById('camera-name').value = camera.name;
        document.getElementById('camera-description').value = camera.description || '';
        document.getElementById('camera-power').value = camera.powerDrain || 1;
        document.getElementById('power-value').textContent = (camera.powerDrain || 1) + 'x';
        document.getElementById('camera-quality').value = camera.quality || 'medium';

        // Set features
        const features = camera.features || {};
        document.getElementById('motion-sensor').checked = features.motionSensor || false;
        document.getElementById('night-vision').checked = features.nightVision || false;
        document.getElementById('audio-pickup').checked = features.audioPickup || false;
        document.getElementById('remote-door').checked = features.remoteDoor || false;
        document.getElementById('emergency-light').checked = features.emergencyLight || false;
        document.getElementById('backup-power').checked = features.backupPower || false;

        // Load connections
        this.loadCameraConnections(camera.connections || []);

        // Show editor
        document.getElementById('camera-editor').style.display = 'block';
        document.getElementById('delete-camera').style.display = isNew ? 'none' : 'block';

        // Add range slider listener
        const powerSlider = document.getElementById('camera-power');
        const powerValue = document.getElementById('power-value');
        powerSlider.oninput = () => powerValue.textContent = powerSlider.value + 'x';
    }

    loadCameraConnections(connections) {
        const container = document.getElementById('camera-connections');
        container.innerHTML = '';
        
        connections.forEach(connId => {
            this.addConnectionItem(container, connId);
        });

        if (connections.length === 0) {
            this.addConnectionItem(container, '');
        }
    }

    addCameraConnection() {
        const container = document.getElementById('camera-connections');
        this.addConnectionItem(container, '');
    }

    addConnectionItem(container, selectedId) {
        const item = document.createElement('div');
        item.className = 'connection-item';
        
        const select = document.createElement('select');
        // Add all possible cameras
        for (let i = 1; i <= 4 + this.customCameras.length; i++) {
            if (i !== this.editingCamera.camera.id) { // Don't allow self-connection
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Camera ${i}`;
                if (i == selectedId) option.selected = true;
                select.appendChild(option);
            }
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'remove-connection';
        removeBtn.onclick = () => container.removeChild(item);
        
        item.appendChild(select);
        item.appendChild(removeBtn);
        container.appendChild(item);
    }

    saveCamera() {
        const connections = Array.from(document.querySelectorAll('#camera-connections select'))
            .map(select => parseInt(select.value))
            .filter(id => !isNaN(id));

        const form = {
            id: parseInt(document.getElementById('camera-id').value),
            name: document.getElementById('camera-name').value,
            description: document.getElementById('camera-description').value,
            powerDrain: parseFloat(document.getElementById('camera-power').value),
            quality: document.getElementById('camera-quality').value,
            connections: connections,
            features: {
                motionSensor: document.getElementById('motion-sensor').checked,
                nightVision: document.getElementById('night-vision').checked,
                audioPickup: document.getElementById('audio-pickup').checked,
                remoteDoor: document.getElementById('remote-door').checked,
                emergencyLight: document.getElementById('emergency-light').checked,
                backupPower: document.getElementById('backup-power').checked
            }
        };

        if (this.editingCamera.isNew) {
            this.customCameras.push(form);
        } else if (this.editingCamera.isCustom) {
            const index = this.customCameras.findIndex(c => c.id === this.editingCamera.camera.id);
            if (index !== -1) {
                this.customCameras[index] = form;
            }
        } else {
            // Editing default camera - create custom version
            this.customCameras.push(form);
        }

        this.saveCustomCameras();
        this.loadCamerasList();
        this.cancelCameraEdit();
        this.showMessage('✅ Camera saved successfully!');
    }

    deleteCamera() {
        if (!this.editingCamera || this.editingCamera.isNew) return;

        if (this.editingCamera.isCustom) {
            const index = this.customCameras.findIndex(c => c.id === this.editingCamera.camera.id);
            if (index !== -1) {
                this.customCameras.splice(index, 1);
                this.saveCustomCameras();
                this.loadCamerasList();
                this.cancelCameraEdit();
                this.showMessage('🗑️ Camera deleted!');
            }
        } else {
            this.showMessage('⚠️ Cannot delete default cameras - create a custom version instead');
        }
    }

    cancelCameraEdit() {
        document.getElementById('camera-editor').style.display = 'none';
        this.editingCamera = null;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new NightGuardGame();
});