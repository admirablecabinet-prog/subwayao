// NOTE: progress keys are intentionally persisted (not reset on load) so the
// funnel's completion poll (subway_total_coins >= 110 / subway_withdrawal_amount)
// keeps working across the game -> funnel -> game loop.

    var gameStarted = false;
    var hudVisible = false;
    var runStarted = false;
    function showHudIfNeeded() {
      if (hudVisible) return;
      hudVisible = true;
      runStarted = true;
      var hud = document.getElementById('game-hud');
      if (hud) hud.style.display = 'flex';
      try {
        var totalCoins = getSavedCoins();
        updateHUD(totalCoins);
      } catch(e) {}
    }

    // Pre-fetch config.json immediately (uses preload cache)
    var configPromise = fetch('/assets/data/config.json').then(function(r){return r.json()});

    function startGame() {
      if (gameStarted) return;
      gameStarted = true;

      var tapMsg = document.getElementById('tap-to-start');
      if (tapMsg) tapMsg.style.display = 'none';

      applyCanvasTextOverride();
      showHudIfNeeded();
      initCoinMonitor();
      initGameOverDetector();

      // Inline boot: skip boot.js XHR delay, use pre-fetched config
      configPromise.then(function(config) {
        config.pokiSdkDebug = false;
        window.GAME_CONFIG = window.GAME_CONFIG || { fastplay: true };
        for (var r in window.GAME_CONFIG) config[r] = window.GAME_CONFIG[r];
        // Parse URL params
        var params = {};
        try {
          location.search.slice(1).split('&').forEach(function(p) {
            var kv = p.split('=');
            if (kv[1] !== undefined) {
              var v = kv[1];
              if (v === 'true' || v === 'false') v = v === 'true';
              else if (v.match(/^[-.0-9]+$/)) v = parseFloat(v);
              params[kv[0]] = v;
            }
          });
        } catch(e){}
        for (var r in params) config[r] = params[r];

        window.sharedAppData = {
          config: config,
          bundle: { meta: { path: './', color: '#ffa4cd', splash: '/assets/preload/splash_mip.png' } }
        };

        // Load fonts
        var fontLink1 = document.createElement('link');
        fontLink1.rel='stylesheet'; fontLink1.href='/assets/font/lilita-one.css'; document.head.appendChild(fontLink1);
        var fontLink2 = document.createElement('link');
        fontLink2.rel='stylesheet'; fontLink2.href='/assets/font/titan-one.css'; document.head.appendChild(fontLink2);

        // Set splash
        var holder = document.querySelector('#og-game-holder');
        if (holder) {
          holder.style.backgroundColor = '#ffa4cd';
          holder.style.backgroundImage = 'url("/assets/preload/splash_mip.png")';
        }

        // Load all game scripts in parallel (already preloaded by browser)
        var scripts = ['/js/inflate.min.js', '/js/vendor.js', '/js/main.js'];
        scripts.forEach(function(src) {
          var s = document.createElement('script');
          s.src = src;
          s.async = false; // preserves execution order while loading in parallel
          document.head.appendChild(s);
        });
      });
    }

    startGame();
    document.addEventListener('click', startGame, { once: true });
    document.addEventListener('touchstart', startGame, { once: true });

    function applyCanvasTextOverride() {
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
      const substitutions = {
        'Score': 'Ganhos', 'SCORE': 'GANHOS',
        'Play': 'Jogar', 'PLAY': 'JOGAR'
      };
      // Texts to suppress entirely when game over overlay is active
      const gameOverTriggers = ['Game Over', 'GAME OVER', 'Fim de Jogo'];

      function shouldHideMetaText(text) {
        if (typeof text !== 'string') return false;
        var raw = text.trim();
        var normalized = raw.toLowerCase().replace(/\s+/g, ' ');

        if (/^meta[:\s]*$/i.test(raw)) return true;
        if (/meta/i.test(normalized)) return true;
        if (/(^|\D)\d+\s*\/\s*110[.,]000\s*kz/i.test(normalized)) return true;
        if (/110[.,]000\s*kz/i.test(normalized)) return true;

        return false;
      }

      // Track last seen coin value to detect coin numbers on canvas
      var lastCoinLabel = false;


      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if (typeof text === 'string') {
          // Show HUD when Score/Ganhos text appears (means the run started)
          if (text === 'Score' || text === 'SCORE' || text === 'Ganhos' || text === 'GANHOS') {
            showHudIfNeeded();
          }
          // Detect game over
          for (var i = 0; i < gameOverTriggers.length; i++) {
            if (text === gameOverTriggers[i] && !gameOverShown) {
              gameOverShown = true;
              setTimeout(function() {
                try {
                  var app = window.__subwayApp;
                  var stats = (app && app.game && app.game.stats) ? app.game.stats : {};
                  showGameOverModal(stats);
                } catch(e) { showGameOverModal({}); }
              }, 500);
            }
          }
          if (gameOverShown) {
            return;
          }

          if (shouldHideMetaText(text)) {
            return;
          }

          // Hide Coins/Saldo label and its number from canvas
          if (/^(Coins|COINS|Saldo|SALDO)$/i.test(text.trim())) {
            lastCoinLabel = true;
            return;
          } else if (lastCoinLabel && /^\d[\d\s.,]*$/.test(text.trim())) {
            lastCoinLabel = false;
            return;
          } else if (lastCoinLabel) {
            // still suppress if it looks like a value with Kz
            if (/\d.*kz/i.test(text) || /^\d+$/.test(text.trim())) {
              lastCoinLabel = false;
              return;
            }
            lastCoinLabel = false;
          }

          for (const [key, value] of Object.entries(substitutions)) {
            if (text === key) { text = value; break; }
          }
        }
        return originalFillText.call(this, text, x, y, maxWidth);
      };
      var lastCoinLabelStroke = false;
      CanvasRenderingContext2D.prototype.strokeText = function(text, x, y, maxWidth) {
        if (typeof text === 'string') {
          if (gameOverShown) return;
          if (shouldHideMetaText(text)) return;
          if (/^(Coins|COINS|Saldo|SALDO)$/i.test(text.trim())) {
            lastCoinLabelStroke = true;
            return;
          } else if (lastCoinLabelStroke && /^\d[\d\s.,]*$/.test(text.trim())) {
            lastCoinLabelStroke = false;
            return;
          } else {
            lastCoinLabelStroke = false;
          }
          for (const [key, value] of Object.entries(substitutions)) {
            if (text === key) { text = value; break; }
          }
        }
        return originalStrokeText.call(this, text, x, y, maxWidth);
      };
    }

    var gameOverShown = false;
    var sessionAlreadySaved = false;

    function initGameOverDetector() {
      // Also detect via engine state as backup
      setInterval(function() {
        try {
          var app = window.__subwayApp;
          if (!app || !app.game) return;

          var state = app.game.state || app.game._state;
          var isGameOver = false;

          if (typeof state === 'string' && (state === 'gameover' || state === 'gameOver' || state === 'dead')) {
            isGameOver = true;
          }
          if (app.game.isGameOver === true || app.game.gameOver === true) {
            isGameOver = true;
          }

          if (isGameOver && !gameOverShown) {
            gameOverShown = true;
            var stats = app.game.stats || {};
            showGameOverModal(stats);
          }

          if (!isGameOver && gameOverShown && document.getElementById('gameover-modal-container').style.display === 'none') {
            gameOverShown = false;
          }
        } catch(e) {}
      }, 200);
    }

    // --- Persistent balance logic ---
    function getSavedCoins() {
      try { return parseInt(localStorage.getItem('subway_total_coins') || '0', 10) || 0; } catch(e) { return 0; }
    }
    function saveCoins(total) {
      try { localStorage.setItem('subway_total_coins', total.toString()); } catch(e) {}
    }
    function getSavedHighScore() {
      try { return parseInt(localStorage.getItem('subway_highscore') || '0', 10) || 0; } catch(e) { return 0; }
    }
    function saveHighScore(val) {
      try { localStorage.setItem('subway_highscore', val.toString()); } catch(e) {}
    }

    function showGameOverModal(stats) {
      var score = stats.score || stats.distance || 0;
      var sessionCoins = stats.coins || 0;

      // Fallback: try to get coins from game app if stats is empty
      if (sessionCoins === 0) {
        try {
          var app = window.__subwayApp;
          if (app && app.game && app.game.stats) {
            sessionCoins = app.game.stats.coins || 0;
            score = score || app.game.stats.score || app.game.stats.distance || 0;
          }
        } catch(e) {}
      }

      // Anti-duplication: only save once per session
      var previousCoins = getSavedCoins();
      var totalCoins;
      if (!sessionAlreadySaved) {
        totalCoins = previousCoins + sessionCoins;
        saveCoins(totalCoins);
        try { localStorage.setItem('subway_last_session_coins', sessionCoins.toString()); } catch(e) {}
        sessionAlreadySaved = true;
      } else {
        totalCoins = previousCoins; // already includes this session's coins
      }

      // High score
      var savedHigh = getSavedHighScore();
      var highScore = Math.max(score, savedHigh);
      saveHighScore(highScore);

      var balanceKz = totalCoins * 1000;
      var meta = 110;
      var progress = Math.min((totalCoins / meta) * 100, 100);
      var faltam = Math.max(meta - totalCoins, 0);

      // Also check if withdraw button was already shown
      var withdrawBtnVisible = document.getElementById('withdraw-float-btn').style.display === 'block';
      if (withdrawBtnVisible && faltam > 0) {
        faltam = 0;
        if (balanceKz === 0) balanceKz = 110000;
        progress = 100;
      }

      document.getElementById('go-score').innerText = score.toLocaleString('pt-PT');
      document.getElementById('go-balance').innerText = balanceKz.toLocaleString('pt-PT').replace(/,/g, '.') + ' Kz';
      document.getElementById('go-coins').innerText = totalCoins.toLocaleString('pt-PT');
      document.getElementById('go-highscore').innerText = highScore.toLocaleString('pt-PT');
      document.getElementById('go-progress-fill').style.width = progress + '%';

      var progText = document.getElementById('go-progress-text');
      if (faltam > 0) {
        progText.innerText = 'Faltam ' + faltam + ' moedas para sacar';
        progText.className = 'go-bar-text';
      } else {
        progText.innerText = '✅ Meta atingida! Pode sacar!';
        progText.className = 'go-bar-text complete';
      }

      // If goal is met, notify the funnel (or redirect standalone)
      if (faltam <= 0) {
        localStorage.setItem('subway_withdrawal_amount', balanceKz);
        setTimeout(function() {
          if (postToParent({ type: 'subway:bonus', amount: balanceKz })) return;
          fadeAndNavigate('/?step=withdraw');
        }, 1500);
      }

      // Show withdraw button when goal is met
      var btnWithdraw = document.getElementById('go-btn-withdraw');
      var btnMain = document.getElementById('go-btn-main');
      if (faltam <= 0) {
        btnWithdraw.style.display = 'block';
        btnMain.style.display = 'none';
      } else {
        btnWithdraw.style.display = 'none';
        btnMain.style.display = 'block';
      }

      document.getElementById('gameover-modal-container').style.display = 'flex';
    }

    // Hook called directly by the game engine on defeat (replaces native leaderboard screen)
    window.__showCustomGameOver = function(stats) {
      gameOverShown = true;
      showGameOverModal(stats || {});
    };

    function closeGameOver() {
      document.getElementById('gameover-modal-container').style.display = 'none';
      gameOverShown = false;
      sessionAlreadySaved = false;
      try {
        var app = window.__subwayApp;
        if (app && app.game) {
          // Close any native sections
          if (app.sections && typeof app.sections.close === 'function') {
            app.sections.close();
          }
          // Reset to idle first (clears gameover state, resets hero/cop)
          app.game.idle();
          // Then start with full intro (guard chases from beginning)
          setTimeout(function() {
            app.game.runWithIntro();
          }, 50);
          return;
        }
      } catch(e) {}
      window.location.reload();
    }

    function buildNavigationUrl(path) {
      try {
        var targetUrl = new URL(path, window.location.origin);
        var currentParams = new URLSearchParams(window.location.search || '');
        var lovableToken = currentParams.get('__lovable_token');
        if (lovableToken) {
          targetUrl.searchParams.set('__lovable_token', lovableToken);
        }
        return targetUrl.toString();
      } catch (e) {
        return path + (window.location.search || '');
      }
    }

    function fadeAndNavigate(url) {
      var overlay = document.getElementById('transition-overlay');
      overlay.classList.add('active');
      setTimeout(function() {
        window.location.assign(buildNavigationUrl(url));
      }, 600);
    }
    window.fadeAndNavigate = fadeAndNavigate;

    // When the game runs embedded inside the funnel iframe, navigation must be
    // handed back to the parent page (the funnel controls the steps). Otherwise
    // (standalone game.html) we keep the old in-page navigation.
    function postToParent(msg) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(msg, '*');
          return true;
        }
      } catch (e) {}
      return false;
    }

    function goToMenu() {
      if (postToParent({ type: 'subway:menu' })) return;
      fadeAndNavigate('/');
    }

    function updateHUD(totalCoins) {
      var meta = 110;
      var balanceKz = totalCoins * 1000;
      var progress = Math.min((totalCoins / meta) * 100, 100);
      try {
        document.getElementById('hud-balance').innerText = balanceKz.toLocaleString('pt-PT').replace(/,/g, '.') + ' Kz';
        document.getElementById('hud-progress-fill').style.width = progress + '%';
      } catch(e) {}
    }

    function initCoinMonitor() {
      var btnShown = false;
      function checkAndShowButton() {
        try {
          var app = window.__subwayApp;
          if (app && app.game) {
            // Detect run start: if game has stats or is in running state, show HUD
            var state = app.game.state;
            var isRunning = (state === 1) || (app.game.isRunning === true) || (app.game.stats && app.game.stats.time > 0);
            if (isRunning && !runStarted) {
              showHudIfNeeded();
            }
            
            if (app.game.stats) {
              var sessionCoins = app.game.stats.coins || 0;
              var totalCoins = getSavedCoins() + sessionCoins;
              if (runStarted) updateHUD(totalCoins);
              if (typeof totalCoins === 'number' && totalCoins >= 110 && !btnShown) {
                btnShown = true;
                document.getElementById('withdraw-float-btn').style.display = 'block';
                // Vibração ao aparecer o botão SACAR
                try {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
                } catch(e) {}
                // Som de notificação (coin/cash sound)
                try {
                  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                  function playTone(freq, start, dur) {
                    var osc = audioCtx.createOscillator();
                    var gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
                    osc.start(audioCtx.currentTime + start);
                    osc.stop(audioCtx.currentTime + start + dur);
                  }
                  playTone(880, 0, 0.12);
                  playTone(1100, 0.12, 0.12);
                  playTone(1320, 0.24, 0.2);
                } catch(e) {}
              }
            }
          }
        } catch(e) {}
      }
      setInterval(checkAndShowButton, 300);
    }

    function goToWithdraw() {
      var app = window.__subwayApp;
      if (app && app.game && app.game.stats) {
        var sessionCoins = app.game.stats.coins || 0;
        var totalCoins = getSavedCoins() + sessionCoins;
        saveCoins(totalCoins);
        var balance = totalCoins * 1000;
        localStorage.setItem('subway_withdrawal_amount', balance);
      }
      if (postToParent({ type: 'subway:withdraw' })) return;
      fadeAndNavigate('/?step=withdraw');
    }
