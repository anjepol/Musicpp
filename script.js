/**
 * MusicApp (Versión 0.0.4)
 * Reproductor de música con radios estables
 */
class MusicApp {
    constructor() {
        // Constantes
        this.DB_NAME = 'MusicAppDB';
        this.STORE_NAME = 'tracks';
        this.DB_VERSION = 4;

        // Estado de la aplicación
        this.db = null;
        this.jsmediatags = window.jsmediatags;
        this.colorThief = new window.ColorThief();
        this.currentAudioUrl = null;
        this.currentImageUrls = new Set();
        this.currentLibraryFilter = { type: 'albums', value: null };
        this.playQueue = [];
        this.currentTrackId = null;
        this.allTracksCache = [];
        this.currentTrackType = 'local';

        // ----- RADIOS ESTABLES (Versión 0.0.4) -----
        this.radioStations = [
            { 
                id: 'radio1', 
                title: 'W Radio', 
                artist: 'Noticias / Entretenimiento', 
                art: 'https://placehold.co/300x300/10b981/white?text=W+Radio', 
                streamUrl: 'https://26673.live.streamtheworld.com/WRADIOAAC_SC' 
            },
            { 
                id: 'radio2', 
                title: 'Classic FM', 
                artist: 'Música Clásica', 
                art: 'https://placehold.co/300x300/eab308/white?text=CLASSIC', 
                streamUrl: 'https://media-ssl.musicradio.com/ClassicFMMP3' 
            }
        ];

        // Vincular elementos del DOM
        this.elements = {};
        this.bindDOMElements();
        
        if (!this.jsmediatags) console.error("¡ERROR CRÍTICO! La biblioteca jsmediatags no se cargó.");
    }

    /**
     * Vincula todos los elementos del DOM necesarios
     */
    bindDOMElements() {
        // Vistas
        this.elements.viewHome = document.getElementById('view-home');
        this.elements.viewLibrary = document.getElementById('view-library');
        this.elements.viewSearch = document.getElementById('view-search');
        this.elements.mainContent = document.getElementById('main-content');
        
        // Navegación
        this.elements.allNavButtons = [
            document.getElementById('btn-tab-home'), document.getElementById('btn-tab-lib'), document.getElementById('btn-tab-search'),
            document.getElementById('btn-sidebar-home'), document.getElementById('btn-sidebar-lib'), document.getElementById('btn-sidebar-search')
        ];
        this.elements.homeButtons = [document.getElementById('btn-tab-home'), document.getElementById('btn-sidebar-home')];
        this.elements.libButtons = [document.getElementById('btn-tab-lib'), document.getElementById('btn-sidebar-lib')];
        this.elements.searchButtons = [document.getElementById('btn-tab-search'), document.getElementById('btn-sidebar-search')];
        
        // Contenido Home
        this.elements.homeRecent = document.getElementById('home-recent');
        this.elements.homeRadios = document.getElementById('home-radios');
        this.elements.homeRecentEmpty = document.getElementById('home-recent-empty');
        
        // Biblioteca
        this.elements.libraryTitle = document.getElementById('library-title');
        this.elements.libraryContent = document.getElementById('library-content');
        this.elements.filterButtons = {
            playlists: document.getElementById('filter-playlists'),
            songs: document.getElementById('filter-songs'),
            artists: document.getElementById('filter-artists'),
            albums: document.getElementById('filter-albums'),
        };
        this.elements.clearFilterBtn = document.getElementById('clear-filter-btn');

        // Búsqueda
        this.elements.searchInput = document.getElementById('search-input');
        this.elements.searchResults = document.getElementById('search-results');
        this.elements.searchPrompt = document.getElementById('search-prompt');
        
        // Modal
        this.elements.modal = document.getElementById('add-music-modal');
        this.elements.addMusicBtn = document.getElementById('add-music-btn');
        this.elements.closeModalBtn = document.getElementById('close-modal-btn');
        this.elements.uploadLocalBtn = document.getElementById('upload-local-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.modalStatus = document.getElementById('modal-status');
        
        // Reproductor (Barra)
        this.elements.audioPlayer = document.getElementById('audio-player');
        this.elements.nowPlayingBar = document.getElementById('now-playing-bar');
        this.elements.playPauseBtn = document.getElementById('play-pause-btn');
        this.elements.iconPlay = document.getElementById('icon-play');
        this.elements.iconPause = document.getElementById('icon-pause');
        this.elements.playerArt = document.getElementById('player-art');
        this.elements.playerTitle = document.getElementById('player-title');
        this.elements.playerArtist = document.getElementById('player-artist');
        
        // Reproductor (Pantalla Completa)
        this.elements.fullPlayerView = document.getElementById('full-player-view');
        this.elements.closePlayerBtn = document.getElementById('close-player-btn');
        this.elements.playerFullArt = document.getElementById('player-full-art');
        this.elements.playerFullTitle = document.getElementById('player-full-title');
        this.elements.playerFullArtist = document.getElementById('player-full-artist');
        this.elements.playerFullPlayPauseBtn = document.getElementById('player-full-play-pause-btn');
        this.elements.iconFullPlay = document.getElementById('icon-full-play');
        this.elements.iconFullPause = document.getElementById('icon-full-pause');
        this.elements.playerPrevBtn = document.getElementById('player-prev-btn');
        this.elements.playerNextBtn = document.getElementById('player-next-btn');
        this.elements.progressContainer = document.getElementById('progress-container');
        this.elements.progressBarContainer = document.getElementById('progress-bar-container');
        this.elements.progressBar = document.getElementById('progress-bar');
        this.elements.currentTime = document.getElementById('current-time');
        this.elements.duration = document.getElementById('duration');
        
        // Inicializar carátulas vacías
        this.elements.playerArt.src = this.createImageUrl(null, '?');
        this.elements.playerFullArt.src = this.createImageUrl(null, '?');
    }
    
    /**
     * Inicializa la aplicación
     */
    init() {
        this.bindEvents();
        this.initDB();
        this.setActiveButton(this.elements.homeButtons);
    }

    /**
     * Vincula todos los listeners de eventos
     */
    bindEvents() {
        // Navegación
        this.elements.homeButtons.forEach(btn => btn?.addEventListener('click', (e) => this.showHome(e)));
        this.elements.libButtons.forEach(btn => btn?.addEventListener('click', (e) => this.showLibrary(e)));
        this.elements.searchButtons.forEach(btn => btn?.addEventListener('click', (e) => this.showSearch(e)));
        
        // Búsqueda
        this.elements.searchInput.addEventListener('input', this.handleSearch.bind(this));
        this.elements.searchResults.addEventListener('click', this.handleLibraryClick.bind(this));

        // Contenido Home
        this.elements.homeRadios.addEventListener('click', this.handleRadioClick.bind(this));
        this.elements.homeRecent.addEventListener('click', this.handleLibraryClick.bind(this));

        // Modal
        this.elements.addMusicBtn.addEventListener('click', this.openModal.bind(this));
        this.elements.closeModalBtn.addEventListener('click', this.closeModal.bind(this));
        this.elements.uploadLocalBtn.addEventListener('click', this.triggerFileInput.bind(this));
        this.elements.fileInput.addEventListener('change', this.handleFileUpload.bind(this));

        // Filtros de Biblioteca
        this.elements.filterButtons.songs.addEventListener('click', () => this.handleFilterClick('songs'));
        this.elements.filterButtons.artists.addEventListener('click', () => this.handleFilterClick('artists'));
        this.elements.filterButtons.albums.addEventListener('click', () => this.handleFilterClick('albums'));
        this.elements.clearFilterBtn.addEventListener('click', this.clearFilter.bind(this));

        // Contenido de Biblioteca
        this.elements.libraryContent.addEventListener('click', this.handleLibraryClick.bind(this));
        
        // Reproductor
        this.elements.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        this.elements.playerFullPlayPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        this.elements.nowPlayingBar.addEventListener('click', this.openFullPlayer.bind(this));
        this.elements.closePlayerBtn.addEventListener('click', this.closeFullPlayer.bind(this));
        
        this.elements.playerPrevBtn.addEventListener('click', this.playPrevious.bind(this));
        this.elements.playerNextBtn.addEventListener('click', this.playNext.bind(this));
        
        // Eventos del <audio>
        this.elements.audioPlayer.addEventListener('play', () => this.updatePlayPauseIcon(false));
        this.elements.audioPlayer.addEventListener('pause', () => this.updatePlayPauseIcon(true));
        this.elements.audioPlayer.addEventListener('ended', this.playNext.bind(this));
        this.elements.audioPlayer.addEventListener('timeupdate', this.updateProgress.bind(this));
        this.elements.audioPlayer.addEventListener('loadedmetadata', this.updateProgress.bind(this));
        this.elements.progressBarContainer.addEventListener('click', this.seek.bind(this));
        
        // Fondo Adaptativo
        this.elements.playerFullArt.addEventListener('load', this.updateAdaptiveBackground.bind(this));
    }

    // --- MANEJADORES DE NAVEGACIÓN Y VISTAS ---

    setActiveButton(buttonArray) {
        this.elements.allNavButtons.forEach(btn => btn && (btn.classList.add('text-zinc-400'), btn.classList.remove('text-white', 'opacity-100')));
        buttonArray.forEach(btn => btn && (btn.classList.remove('text-zinc-400'), btn.classList.add('text-white', 'opacity-100')));
    }

    showHome(e) {
        if (e) e.preventDefault();
        this.elements.viewHome.classList.remove('hidden');
        this.elements.viewLibrary.classList.add('hidden');
        this.elements.viewSearch.classList.add('hidden');
        this.setActiveButton(this.elements.homeButtons);
        this.elements.mainContent.scrollTop = 0;
        this.loadHomeContent();
    }

    showLibrary(e) {
        if (e) e.preventDefault();
        this.elements.viewHome.classList.add('hidden');
        this.elements.viewLibrary.classList.remove('hidden');
        this.elements.viewSearch.classList.add('hidden');
        this.setActiveButton(this.elements.libButtons);
        this.elements.mainContent.scrollTop = 0;
        this.loadLibrary(this.currentLibraryFilter);
    }
    
    showSearch(e) {
        if (e) e.preventDefault();
        this.elements.viewHome.classList.add('hidden');
        this.elements.viewLibrary.classList.add('hidden');
        this.elements.viewSearch.classList.remove('hidden');
        this.setActiveButton(this.elements.searchButtons);
        this.elements.mainContent.scrollTop = 0;
    }

    // --- LÓGICA DE HOME ---

    loadHomeContent() {
        this.loadHomeRadios();
        this.loadHomeRecent();
    }
    
    loadHomeRadios() {
        this.elements.homeRadios.innerHTML = '';
        this.radioStations.forEach(station => {
            const html = `
                <div class="radio-item" data-type="radio" data-url="${station.streamUrl}" data-title="${this.escapeHTML(station.title)}" data-artist="${this.escapeHTML(station.artist)}" data-art="${station.art}">
                    <img src="${station.art}" alt="${this.escapeHTML(station.title)}">
                    <h3>${this.escapeHTML(station.title)}</h3>
                    <p>${this.escapeHTML(station.artist)}</p>
                </div>`;
            this.elements.homeRadios.insertAdjacentHTML('beforeend', html);
        });
    }

    async loadHomeRecent() {
        this.elements.homeRecent.innerHTML = '';
        const tracks = await this.getAllTracks();
        
        if (tracks.length === 0) {
            this.elements.homeRecentEmpty.classList.remove('hidden');
            return;
        }
        this.elements.homeRecentEmpty.classList.add('hidden');

        const recentTracks = tracks.slice(0, 10);
        recentTracks.forEach(track => {
            const imageUrl = this.createImageUrl(track.picture, track.title);
            const html = `
                <div class="track-item cursor-pointer" data-track-id="${track.id}" data-image-url="${imageUrl}" data-title="${this.escapeHTML(track.title)}" data-artist="${this.escapeHTML(track.artist)}">
                    <img src="${imageUrl}" alt="${this.escapeHTML(track.title)}">
                    <h3 class="card-title">${this.escapeHTML(track.title)}</h3>
                    <p class="card-subtitle">${this.escapeHTML(track.artist)}</p>
                </div>`;
            this.elements.homeRecent.insertAdjacentHTML('beforeend', html);
        });
    }

    handleRadioClick(e) {
        const radioItem = e.target.closest('.radio-item');
        if (radioItem) {
            const isSameRadio = this.elements.audioPlayer.src === radioItem.dataset.url;
            const isPlaying = !this.elements.audioPlayer.paused;
            
            if (isSameRadio && isPlaying) {
                this.elements.audioPlayer.pause();
                radioItem.classList.remove('active', 'playing');
            } else {
                this.playRadio(radioItem);
            }
        }
    }

    // --- LÓGICA DE BÚSQUEDA ---

    handleSearch() {
        const term = this.elements.searchInput.value.toLowerCase();
        
        if (term.length < 2) {
            this.elements.searchResults.innerHTML = '';
            this.elements.searchPrompt.classList.remove('hidden');
            return;
        }
        
        this.elements.searchPrompt.classList.add('hidden');
        
        const results = this.allTracksCache.filter(track => 
            track.title.toLowerCase().includes(term) ||
            track.artist.toLowerCase().includes(term) ||
            track.album.toLowerCase().includes(term)
        );
        
        this.elements.searchResults.innerHTML = '';
        
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = `<p class="text-zinc-400 text-center">No se encontraron resultados para "${this.escapeHTML(term)}".</p>`;
            return;
        }
        
        results.forEach(track => this.renderTrackItem(track, this.elements.searchResults));
    }

    // --- MANEJADORES DE MODAL Y SUBIDA --- 
    openModal() {
        this.elements.modal.classList.remove('hidden');
        this.elements.modalStatus.textContent = '';
        this.elements.fileInput.value = '';
    }
    closeModal() {
        this.elements.modal.classList.add('hidden');
    }
    triggerFileInput() {
        if (!this.jsmediatags) {
            this.elements.modalStatus.textContent = "Error: La biblioteca de metadatos no está lista.";
            return;
        }
        this.elements.fileInput.click();
    }
    async handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;
        this.elements.modalStatus.textContent = `Procesando 0/${files.length}...`;
        const promises = files.map((file, index) => 
            this.parseFileMetadata(file).then(data => {
                this.elements.modalStatus.textContent = `Procesando ${index + 1}/${files.length}...`;
                return data;
            })
        );
        const tracksData = await Promise.all(promises);
        this.elements.modalStatus.textContent = `Guardando en base de datos...`;
        await this.addTracksToDB(tracksData);
        this.elements.modalStatus.textContent = `¡Añadidas ${files.length} canción(es)!`;
        this.elements.fileInput.value = '';
        await this.updateAllTracksCache();
        setTimeout(() => {
            this.closeModal();
            this.loadLibrary(this.currentLibraryFilter);
            this.loadHomeRecent();
        }, 1000);
    }
    parseFileMetadata(file) {
        return new Promise((resolve) => {
            if (!this.jsmediatags) {
                console.warn("jsmediatags no disponible, usando defaults.");
                resolve(this.getDefaultTrackData(file));
                return;
            }
            this.jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const tags = tag.tags;
                    let pictureBlob = null;
                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        const byteArray = new Uint8Array(data);
                        pictureBlob = new Blob([byteArray], { type: format || 'image/jpeg' });
                    }
                    resolve({
                        title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: tags.artist || "Artista Desconocido",
                        album: tags.album || "Álbum Desconocido",
                        picture: pictureBlob,
                        file: file
                    });
                },
                onError: (error) => {
                    console.warn("Error leyendo metadatos:", error.type, error.info);
                    resolve(this.getDefaultTrackData(file));
                }
            });
        });
    }
    getDefaultTrackData(file) {
        return {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Artista Desconocido",
            album: "Álbum Desconocido",
            picture: null,
            file: file
        };
    }

    // --- LÓGICA DE BASE DE DATOS (IndexedDB) --- 
    initDB() {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onerror = (e) => console.error("Error al abrir IndexedDB:", e);
        request.onupgradeneeded = (e) => {
            this.db = e.target.result;
            let store;
            if (!this.db.objectStoreNames.contains(this.STORE_NAME)) {
                store = this.db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
            } else {
                store = e.target.transaction.objectStore(this.STORE_NAME);
            }
            if (!store.indexNames.contains('artist')) store.createIndex('artist', 'artist', { unique: false });
            if (!store.indexNames.contains('album')) store.createIndex('album', 'album', { unique: false });
        };
        request.onsuccess = async (e) => {
            this.db = e.target.result;
            console.log("Base de datos cargada.");
            await this.updateAllTracksCache();
            this.showHome(null);
        };
    }
    addTracksToDB(tracks) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB no está lista.");
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            tracks.forEach(track => store.add(track));
            transaction.oncomplete = resolve;
            transaction.onerror = (e) => reject(transaction.error);
        });
    }
    getAllTracks(filter = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB no está lista.");
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const tracks = [];
            let cursorRequest;
            if (filter?.artist) {
                cursorRequest = store.index('artist').openCursor(IDBKeyRange.only(filter.artist));
            } else if (filter?.album) {
                cursorRequest = store.index('album').openCursor(IDBKeyRange.only(filter.album));
            } else {
                cursorRequest = store.openCursor(null, 'prev');
            }
            cursorRequest.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    tracks.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(tracks);
                }
            };
            transaction.onerror = (e) => reject(transaction.error);
        });
    }
    async updateAllTracksCache() {
        this.allTracksCache = await this.getAllTracks();
    }
    getTrackFile(trackId) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB no está lista.");
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(Number(trackId));
            request.onsuccess = (e) => e.target.result ? resolve(e.target.result.file) : reject("No se encontró la canción");
            request.onerror = (e) => reject(e.target.error);
        });
    }
    
    // --- LÓGICA DE BIBLIOTECA Y RENDERIZADO --- 
    handleFilterClick(filterType) {
        if (filterType === 'playlists') return;
        this.loadLibrary({ type: filterType });
    }
    clearFilter() {
        this.loadLibrary({ type: this.currentLibraryFilter.type });
    }
    async handleLibraryClick(e) {
        const trackItem = e.target.closest('.track-item');
        const artistItem = e.target.closest('.artist-item');
        const albumItem = e.target.closest('.album-item');

        if (trackItem) {
            await this.updatePlayQueue(this.currentLibraryFilter);
            this.playTrack(trackItem);
        } else if (artistItem) {
            const artistName = artistItem.dataset.artistName;
            this.loadLibrary({ type: 'songs', value: artistName, filterKey: 'artist' });
        } else if (albumItem) {
            const albumName = albumItem.dataset.albumName;
            this.loadLibrary({ type: 'songs', value: albumName, filterKey: 'album' });
        }
    }
    async loadLibrary({ type, value = null, filterKey = null }) {
        this.cleanupImageUrls();
        this.elements.libraryContent.innerHTML = '';
        this.currentLibraryFilter = { type, value, filterKey };
        this.setActiveFilter(type);
        let title = "Tu Biblioteca";
        let subFilter = null;
        if (filterKey === 'artist' && value) {
            title = value;
            subFilter = { artist: value };
            this.elements.clearFilterBtn.classList.remove('hidden');
        } else if (filterKey === 'album' && value) {
            title = value;
            subFilter = { album: value };
            this.elements.clearFilterBtn.classList.remove('hidden');
        } else {
            this.elements.clearFilterBtn.classList.add('hidden');
        }
        this.elements.libraryTitle.textContent = title;
        const allTracks = await this.getAllTracks(subFilter);
        if (allTracks.length === 0) {
            const msg = (filterKey) ? 'No se encontró música.' : 'Tu biblioteca está vacía. Añade música para comenzar.';
            this.elements.libraryContent.innerHTML = `<p class="text-zinc-400" id="library-empty-msg">${msg}</p>`;
            return;
        }
        if (type === 'songs') {
            allTracks.sort((a,b) => a.title.localeCompare(b.title));
            allTracks.forEach(track => this.renderTrackItem(track, this.elements.libraryContent));
        } 
        else if (type === 'artists') {
            const artists = this.groupBy(allTracks, 'artist');
            Object.keys(artists).sort().forEach(artistName => {
                this.renderArtistItem(artistName, artists[artistName], this.elements.libraryContent);
            });
        }
        else if (type === 'albums') {
            const albums = this.groupBy(allTracks, 'album');
            Object.keys(albums).sort().forEach(albumName => {
                this.renderAlbumItem(albumName, albums[albumName], this.elements.libraryContent);
            });
        }
    }
    setActiveFilter(filterType) {
        if (!this.currentLibraryFilter.value) {
            Object.keys(this.elements.filterButtons).forEach(key => {
                const btn = this.elements.filterButtons[key];
                if (!btn) return;
                btn.classList.toggle('active', key === filterType);
                btn.classList.toggle('inactive', key !== filterType);
            });
        }
    }
    renderTrackItem(track, container) {
        const imageUrl = this.createImageUrl(track.picture, track.title);
        const html = `
            <div class="track-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-track-id="${track.id}" data-image-url="${imageUrl}" 
                 data-title="${this.escapeHTML(track.title)}" data-artist="${this.escapeHTML(track.artist)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10" alt="Carátula" loading="lazy">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(track.title)}</h3>
                    <p class="text-sm text-zinc-300">${this.escapeHTML(track.artist)}</p>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    }
    renderArtistItem(artistName, tracks, container) {
        const trackWithPic = tracks.find(t => t.picture);
        const imageUrl = this.createImageUrl(trackWithPic?.picture, artistName);
        const html = `
            <div class="artist-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-artist-name="${this.escapeHTML(artistName)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-white/10" alt="Artista" loading="lazy">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(artistName)}</h3>
                    <p class="text-sm text-zinc-300">${tracks.length} ${tracks.length > 1 ? 'canciones' : 'canción'}</p>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    }
    renderAlbumItem(albumName, tracks, container) {
        const trackWithPic = tracks.find(t => t.picture);
        const imageUrl = this.createImageUrl(trackWithPic?.picture, albumName);
        const artistName = tracks.every(t => t.artist === tracks[0].artist) ? tracks[0].artist : 'Varios Artistas';
        const html = `
            <div class="album-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-album-name="${this.escapeHTML(albumName)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10" alt="Álbum" loading="lazy">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(albumName)}</h3>
                    <p class="text-sm text-zinc-300">${this.escapeHTML(artistName)}</p>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    }

    // --- LÓGICA DEL REPRODUCTOR (ACTUALIZADA) --- 
    async updatePlayQueue(filter) {
        let tracks = [];
        if (filter.type === 'songs' || filter.filterKey) {
            tracks = await this.getAllTracks(filter.filterKey ? { [filter.filterKey]: filter.value } : null);
            tracks.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            tracks = this.allTracksCache;
        }
        this.playQueue = tracks.map(t => t.id);
    }
    async playTrack(trackItem) {
        this.currentTrackType = 'local';
        this.elements.progressContainer.style.display = 'block'; 
        document.querySelectorAll('.track-item.active').forEach(item => item.classList.remove('active'));
        trackItem.classList.add('active');
        if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl);
        const trackId = Number(trackItem.dataset.trackId);
        this.currentTrackId = trackId;
        const title = trackItem.dataset.title;
        const artist = trackItem.dataset.artist;
        const imageUrl = trackItem.dataset.imageUrl;
        this.updatePlayerUI(title, artist, imageUrl);
        this.updatePlayerControls();
        try {
            const fileBlob = await this.getTrackFile(trackId);
            this.currentAudioUrl = URL.createObjectURL(fileBlob);
            if (this.elements.audioPlayer.src && !this.elements.audioPlayer.src.startsWith('blob:')) {
                this.elements.audioPlayer.src = '';
            }
            this.elements.audioPlayer.src = this.currentAudioUrl;
            this.elements.audioPlayer.play();
        } catch (error) {
            console.error("Error al reproducir el track:", error);
            this.updatePlayerUI("Error al cargar la canción", "...", this.createImageUrl(null, '!'));
        }
    }

    playRadio(radioItem) {
        if (!navigator.onLine) {
            this.showNotification("Sin conexión", "Las radios requieren conexión a internet", "error");
            this.updatePlayerUI("Sin conexión", "Conecta a internet para radios", this.createImageUrl(null, '!'));
            return;
        }

        this.currentTrackType = 'radio';
        this.currentTrackId = null; 
        this.elements.progressContainer.style.display = 'none';
        
        document.querySelectorAll('.track-item.active, .radio-item.active').forEach(item => {
            item.classList.remove('active', 'playing');
        });
        radioItem.classList.add('active');
        
        if (this.currentAudioUrl && this.currentAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentAudioUrl);
        }
        
        const streamUrl = radioItem.dataset.url;
        const title = radioItem.dataset.title;
        const artist = radioItem.dataset.artist;
        const imageUrl = radioItem.dataset.art;
        
        this.updatePlayerUI(title, artist, imageUrl);
        this.updatePlayerControls();
        
        this.updatePlayerUI("Conectando...", title, imageUrl);
        
        try {
            this.elements.audioPlayer.src = streamUrl;
            this.elements.audioPlayer.preload = 'none';
            this.elements.audioPlayer.crossOrigin = 'anonymous';
            this.elements.audioPlayer.load();
            
            console.log(`Intentando conectar a: ${title} - ${streamUrl}`);
            
            const connectionTimeout = setTimeout(() => {
                if (this.elements.audioPlayer.readyState < 2) {
                    this.handleRadioError(radioItem, new Error("Timeout de conexión"));
                }
            }, 10000);
            
            const playPromise = this.elements.audioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        clearTimeout(connectionTimeout);
                        console.log(`✅ Reproduciendo radio: ${title}`);
                        this.updatePlayerUI(title, artist, imageUrl);
                        this.showNotification(`Sintonizando: ${title}`, "Radio en vivo", "success");
                        radioItem.classList.add('playing');
                    })
                    .catch(error => {
                        clearTimeout(connectionTimeout);
                        console.error("❌ Error al reproducir radio:", error);
                        this.handleRadioError(radioItem, error);
                    });
            }
            
            this.elements.audioPlayer.onloadeddata = () => {
                clearTimeout(connectionTimeout);
                console.log(`✅ Datos de audio cargados: ${title}`);
            };
            
            this.elements.audioPlayer.onerror = () => {
                clearTimeout(connectionTimeout);
                console.error("❌ Error de audio element:", this.elements.audioPlayer.error);
                this.handleRadioError(radioItem, this.elements.audioPlayer.error);
            };
            
        } catch (error) {
            console.error("❌ Error general al reproducir radio:", error);
            this.handleRadioError(radioItem, error);
        }
    }

    handleRadioError(radioItem, error) {
        const title = radioItem.dataset.title;
        const imageUrl = radioItem.dataset.art;
        
        radioItem.classList.remove('playing', 'active');
        
        let errorMessage = "Error al conectar con la radio";
        let errorType = "error";
        
        if (error.name === "NotAllowedError") {
            errorMessage = "Permiso denegado - el navegador bloqueó la reproducción automática";
            errorType = "warning";
        } else if (error.name === "NotSupportedError") {
            errorMessage = "Formato de audio no compatible con esta radio";
        } else if (error.message?.includes("Failed to fetch") || error.message?.includes("Network Error")) {
            errorMessage = "Error de red - no se pudo conectar con el servidor";
        } else if (error.message?.includes("Timeout")) {
            errorMessage = "Tiempo de conexión agotado - la radio no respondió";
        } else if (error.code === 4) {
            errorMessage = "Recurso de medios no disponible - la URL podría estar incorrecta";
        }
        
        console.warn(`Error en radio ${title}:`, errorMessage, error);
        
        this.updatePlayerUI(errorMessage, title, imageUrl);
        this.showNotification("Error de radio", errorMessage, errorType);
        
        this.updatePlayPauseIcon(true);
        this.elements.audioPlayer.src = '';
    }

    showNotification(title, message, type = "info") {
        const notification = document.getElementById('global-notification');
        const titleElement = document.getElementById('notification-title');
        const messageElement = document.getElementById('notification-message');
        
        if (!notification || !titleElement || !messageElement) {
            console.warn("Elementos de notificación no encontrados");
            return;
        }
        
        const typeStyles = {
            success: 'bg-green-500/90 text-white border-green-600',
            error: 'bg-red-500/90 text-white border-red-600',
            info: 'bg-blue-500/90 text-white border-blue-600',
            warning: 'bg-yellow-500/90 text-black border-yellow-600'
        };
        
        notification.className = `fixed top-4 right-4 z-50 max-w-sm rounded-lg p-4 shadow-lg transition-all duration-300 backdrop-blur-lg border ${
            typeStyles[type]
        }`;
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        notification.classList.remove('translate-x-full', 'hidden');
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.classList.add('hidden'), 300);
        }, 5000);
    }

    togglePlayPause() {
        if (!this.elements.audioPlayer.src) return; 
        if (this.elements.audioPlayer.paused) {
            this.elements.audioPlayer.play();
        } else {
            this.elements.audioPlayer.pause();
        }
    }
    updatePlayerUI(title, artist, imageUrl) {
        this.elements.playerTitle.textContent = title;
        this.elements.playerArtist.textContent = artist;
        this.elements.playerArt.src = imageUrl;
        this.elements.playerFullTitle.textContent = title;
        this.elements.playerFullArtist.textContent = artist;
        this.elements.playerFullArt.src = imageUrl;
    }
    updatePlayPauseIcon(isPaused) {
        this.elements.iconPlay.classList.toggle('hidden', !isPaused);
        this.elements.iconPause.classList.toggle('hidden', isPaused);
        this.elements.iconFullPlay.classList.toggle('hidden', !isPaused);
        this.elements.iconFullPause.classList.toggle('hidden', isPaused);
    }
    playNext() {
        if (this.currentTrackType === 'radio') return; 
        if (!this.currentTrackId || this.playQueue.length === 0) return;
        const currentIndex = this.playQueue.findIndex(id => id === this.currentTrackId);
        const nextIndex = (currentIndex + 1) % this.playQueue.length;
        const nextTrackId = this.playQueue[nextIndex];
        const nextTrackElement = document.querySelector(`.track-item[data-track-id="${nextTrackId}"]`);
        if (nextTrackElement) {
            this.playTrack(nextTrackElement);
            this.elements.mainContent.querySelector('.track-item.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    playPrevious() {
        if (this.currentTrackType === 'radio') return;
        if (!this.currentTrackId || this.playQueue.length === 0) return;
        const currentIndex = this.playQueue.findIndex(id => id === this.currentTrackId);
        const prevIndex = (currentIndex - 1 + this.playQueue.length) % this.playQueue.length;
        const prevTrackId = this.playQueue[prevIndex];
        const prevTrackElement = document.querySelector(`.track-item[data-track-id="${prevTrackId}"]`);
        if (prevTrackElement) {
            this.playTrack(prevTrackElement);
            this.elements.mainContent.querySelector('.track-item.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    updatePlayerControls() {
        if (this.currentTrackType === 'radio' || this.playQueue.length === 0) {
            this.elements.playerPrevBtn.disabled = true;
            this.elements.playerNextBtn.disabled = true;
            return;
        }
        this.elements.playerPrevBtn.disabled = false;
        this.elements.playerNextBtn.disabled = false;
    }

    // --- REPRODUCTOR (PANTALLA COMPLETA) --- 
    openFullPlayer(e) {
        if (e.target.closest('#play-pause-btn')) return;
        this.elements.fullPlayerView.style.transform = 'translateY(0)';
    }
    closeFullPlayer() {
        this.elements.fullPlayerView.style.transform = 'translateY(100%)';
    }
    updateProgress() {
        const player = this.elements.audioPlayer;
        if (!player.src) return;
        if (player.duration === Infinity) {
            this.elements.progressContainer.style.display = 'none';
            return;
        }
        this.elements.progressContainer.style.display = 'block';
        const { duration, currentTime } = player;
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            this.elements.progressBar.style.width = `${progressPercent}%`;
            this.elements.duration.textContent = this.formatTime(duration);
        }
        this.elements.currentTime.textContent = this.formatTime(currentTime);
    }
    seek(e) {
        if (this.currentTrackType === 'radio') return;
        const width = this.elements.progressBarContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = this.elements.audioPlayer.duration;
        if (duration) {
            this.elements.audioPlayer.currentTime = (clickX / width) * duration;
        }
    }
    formatTime(seconds) {
        const flooredSeconds = Math.floor(seconds);
        const minutes = Math.floor(flooredSeconds / 60);
        const remainingSeconds = flooredSeconds % 60;
        const paddedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
        return `${minutes}:${paddedSeconds}`;
    }
    updateAdaptiveBackground() {
        try {
            if (!this.elements.playerFullArt.complete || this.elements.playerFullArt.naturalHeight === 0) {
                return;
            }
            const color = this.colorThief.getColor(this.elements.playerFullArt);
            const [r, g, b] = color;
            this.elements.fullPlayerView.style.background = `
                radial-gradient(circle at center, rgba(${r},${g},${b},0.6) 0%, rgba(${r},${g},${b},0.0) 50%),
                radial-gradient(circle at top left, rgba(${r},${g},${b},0.4) 0%, rgba(0,0,0,0) 40%),
                radial-gradient(circle at bottom right, rgba(${r},${g},${b},0.4) 0%, rgba(0,0,0,0) 40%),
                rgb(20, 20, 25)
            `;
        } catch (e) {
            console.warn("Error al obtener el color de la carátula:", e);
            this.elements.fullPlayerView.style.background = 'rgb(20, 20, 25)';
        }
    }

    // --- UTILIDADES ---

    groupBy(array, key) {
        return array.reduce((result, currentValue) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
            return result;
        }, {});
    }
    
    createImageUrl(pictureBlob, placeholderText = '?') {
        let imageUrl;
        if (pictureBlob) { 
            imageUrl = URL.createObjectURL(pictureBlob);
            this.currentImageUrls.add(imageUrl);
        } else {
            const char = this.escapeHTML(placeholderText[0]?.toUpperCase() || '?');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
                            <rect width="100%" height="100%" fill="#373737"/>
                            <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="75" fill="#8b5cf6">${char}</text>
                         </svg>`;
            imageUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
        }
        return imageUrl;
    }

    cleanupImageUrls() {
        this.currentImageUrls.forEach(url => URL.revokeObjectURL(url));
        this.currentImageUrls.clear();
    }

    escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const app = new MusicApp();
    app.init();
});