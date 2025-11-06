/**
 * MusicApp (Versión Modular)
 * Encapsula toda la lógica del reproductor de música.
 * Depende de 'jsmediatags.min.js' que se carga en index.html
 */
class MusicApp {
    constructor() {
        // Constantes
        this.DB_NAME = 'MusicAppDB';
        this.STORE_NAME = 'tracks';
        this.DB_VERSION = 4; // Subir versión para nuevo schema con 'picture'

        // Estado de la aplicación
        this.db = null;
        this.jsmediatags = window.jsmediatags; // Asignar la biblioteca cargada
        this.currentAudioUrl = null;
        this.currentImageUrls = new Set();
        this.currentLibraryFilter = { type: 'songs', value: null };
        this.playQueue = []; // <-- NUEVO: Cola de reproducción
        this.currentTrackId = null; // <-- NUEVO: ID de la canción actual

        // Vincular elementos del DOM
        this.elements = {};
        this.bindDOMElements();
        
        if (!this.jsmediatags) {
            console.error("¡ERROR CRÍTICO! La biblioteca jsmediatags no se cargó.");
        }
    }

    /**
     * Vincula todos los elementos del DOM necesarios a this.elements
     */
    bindDOMElements() {
        // Vistas
        this.elements.viewHome = document.getElementById('view-home');
        this.elements.viewLibrary = document.getElementById('view-library');
        this.elements.mainContent = document.getElementById('main-content');
        
        // Navegación
        this.elements.allNavButtons = [
            document.getElementById('btn-tab-home'), document.getElementById('btn-tab-lib'), document.getElementById('btn-tab-search'),
            document.getElementById('btn-sidebar-home'), document.getElementById('btn-sidebar-lib'), document.getElementById('btn-sidebar-search')
        ];
        this.elements.homeButtons = [document.getElementById('btn-tab-home'), document.getElementById('btn-sidebar-home')];
        this.elements.libButtons = [document.getElementById('btn-tab-lib'), document.getElementById('btn-sidebar-lib')];
        
        // Biblioteca
        this.elements.libraryTitle = document.getElementById('library-title');
        this.elements.libraryContent = document.getElementById('library-content');
        this.elements.filterButtons = {
            songs: document.getElementById('filter-songs'),
            artists: document.getElementById('filter-artists'),
            albums: document.getElementById('filter-albums'),
        };
        this.elements.clearFilterBtn = document.getElementById('clear-filter-btn');

        // Modal
        this.elements.modal = document.getElementById('add-music-modal');
        this.elements.addMusicBtn = document.getElementById('add-music-btn');
        this.elements.closeModalBtn = document.getElementById('close-modal-btn');
        this.elements.uploadLocalBtn = document.getElementById('upload-local-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.modalStatus = document.getElementById('modal-status');
        
        // Reproductor (Barra pequeña)
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
        
        // Controles Next/Prev (NUEVO)
        this.elements.playerPrevBtn = document.getElementById('player-prev-btn');
        this.elements.playerNextBtn = document.getElementById('player-next-btn');
    }
    
    /**
     * Inicializa la aplicación: vincula eventos y abre la BD.
     */
    init() {
        this.bindEvents();
        this.initDB();
        this.setActiveButton(this.elements.homeButtons);
        this.updatePlayerControls(); // Desactivar botones al inicio
    }

    /**
     * Vincula todos los listeners de eventos de la aplicación.
     */
    bindEvents() {
        // Navegación
        this.elements.homeButtons.forEach(btn => btn?.addEventListener('click', (e) => this.showHome(e)));
        this.elements.libButtons.forEach(btn => btn?.addEventListener('click', (e) => this.showLibrary(e)));
        
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

        // Contenido de Biblioteca (un solo listener delegado)
        this.elements.libraryContent.addEventListener('click', this.handleLibraryClick.bind(this));
        
        // Reproductor
        this.elements.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        this.elements.audioPlayer.addEventListener('play', () => this.updatePlayPauseIcon(false));
        this.elements.audioPlayer.addEventListener('pause', () => this.updatePlayPauseIcon(true));
        
        // (EVENTO 'ENDED' ACTUALIZADO)
        this.elements.audioPlayer.addEventListener('ended', this.playNext.bind(this));

        // Reproductor (Pantalla Completa)
        this.elements.nowPlayingBar.addEventListener('click', this.openFullPlayer.bind(this));
        this.elements.closePlayerBtn.addEventListener('click', this.closeFullPlayer.bind(this));
        this.elements.playerFullPlayPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });

        // Controles Next/Prev (NUEVO)
        this.elements.playerPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click cierre la vista
            this.playPrevious();
        });
        this.elements.playerNextBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click cierre la vista
            this.playNext();
        });
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
        this.setActiveButton(this.elements.homeButtons);
        this.elements.mainContent.scrollTop = 0;
    }

    showLibrary(e) {
        if (e) e.preventDefault();
        this.elements.viewHome.classList.add('hidden');
        this.elements.viewLibrary.classList.remove('hidden');
        this.setActiveButton(this.elements.libButtons);
        this.elements.mainContent.scrollTop = 0;
        
        if (this.currentLibraryFilter.type !== 'songs' || this.currentLibraryFilter.value) {
            this.loadLibrary({ type: 'songs' });
        } else {
            const libContent = this.elements.libraryContent.innerHTML;
            if (libContent === '' || libContent.includes('Tu biblioteca está vacía')) {
                this.loadLibrary({ type: 'songs' });
            }
        }
    }

    // --- MANEJADORES DE MODAL Y SUBIDA ---

    openModal() {
        this.elements.modal.classList.remove('hidden');
        this.elements.modalStatus.textContent = '';
        this.elements.fileInput.value = ''; // Reset input
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
        this.elements.fileInput.value = ''; // Reset input
        
        setTimeout(() => {
            this.closeModal();
            // Recargar la vista de biblioteca actual
            this.loadLibrary(this.currentLibraryFilter);
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
            if (store.indexNames.contains('picture')) {
                // Limpiando schema viejo si existiera
                store.deleteIndex('picture');
            }
        };
        
        request.onsuccess = (e) => {
            this.db = e.target.result;
            console.log("Base de datos cargada.");
            // Cargar la biblioteca (siempre en la vista de canciones al inicio)
            this.loadLibrary({ type: 'songs' });
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
                cursorRequest = store.openCursor(null, 'prev'); // Nuevos primero
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
        this.elements.libraryContent.innerHTML = ''; // Limpiar contenido
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
            this.playQueue = allTracks; // <-- NUEVO: Cargar la cola de reproducción
            allTracks.forEach(track => this.renderTrackItem(track));
        } 
        else if (type === 'artists') {
            this.playQueue = []; // Limpiar cola si no estamos en vista de canciones
            const artists = this.groupBy(allTracks, 'artist');
            Object.keys(artists).sort().forEach(artistName => {
                this.renderArtistItem(artistName, artists[artistName]);
            });
        }
        else if (type === 'albums') {
            this.playQueue = []; // Limpiar cola si no estamos en vista de canciones
            const albums = this.groupBy(allTracks, 'album');
            Object.keys(albums).sort().forEach(albumName => {
                this.renderAlbumItem(albumName, albums[albumName]);
            });
        }
    }
    
    setActiveFilter(filterType) {
         // Solo actualiza los botones si no estamos en una sub-vista
        if (!this.currentLibraryFilter.value) {
            Object.keys(this.elements.filterButtons).forEach(key => {
                const btn = this.elements.filterButtons[key];
                btn.classList.toggle('active', key === filterType);
                btn.classList.toggle('inactive', key !== filterType);
            });
        }
    }
    
    renderTrackItem(track) {
        const imageUrl = this.createImageUrl(track.picture, track.title);
        const html = `
            <div class="track-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-track-id="${track.id}" data-image-url="${imageUrl}" 
                 data-title="${this.escapeHTML(track.title)}" data-artist="${this.escapeHTML(track.artist)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10" alt="Carátula">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(track.title)}</h3>
                    <p class="text-sm text-zinc-300">${this.escapeHTML(track.artist)}</p>
                </div>
            </div>`;
        this.elements.libraryContent.insertAdjacentHTML('beforeend', html);
    }

    renderArtistItem(artistName, tracks) {
        const trackWithPic = tracks.find(t => t.picture);
        const imageUrl = this.createImageUrl(trackWithPic?.picture, artistName);
        const html = `
            <div class="artist-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-artist-name="${this.escapeHTML(artistName)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-white/10" alt="Artista">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(artistName)}</h3>
                    <p class="text-sm text-zinc-300">${tracks.length} ${tracks.length > 1 ? 'canciones' : 'canción'}</p>
                </div>
            </div>`;
        this.elements.libraryContent.insertAdjacentHTML('beforeend', html);
    }

    renderAlbumItem(albumName, tracks) {
        const trackWithPic = tracks.find(t => t.picture);
        const imageUrl = this.createImageUrl(trackWithPic?.picture, albumName);
        const artistName = tracks[0]?.artist || 'Varios Artistas';
        const html = `
            <div class="album-item flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" 
                 data-album-name="${this.escapeHTML(albumName)}">
                <img src="${imageUrl}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10" alt="Álbum">
                <div>
                    <h3 class="font-semibold text-lg text-white">${this.escapeHTML(albumName)}</h3>
                    <p class="text-sm text-zinc-300">${this.escapeHTML(artistName)}</p>
                </div>
            </div>`;
        this.elements.libraryContent.insertAdjacentHTML('beforeend', html);
    }

    // --- LÓGICA DEL REPRODUCTOR ---

    async playTrack(trackItem) {
        // (ACTUALIZADO) Guardar ID de la canción actual
        this.currentTrackId = Number(trackItem.dataset.trackId);

        // Marcar como activa
        document.querySelectorAll('.track-item.active').forEach(item => item.classList.remove('active'));
        trackItem.classList.add('active');

        // Limpiar URL de audio anterior
        if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl);
        
        // Obtener datos del track
        const trackId = trackItem.dataset.trackId;
        const title = trackItem.dataset.title;
        const artist = trackItem.dataset.artist;
        const imageUrl = trackItem.dataset.imageUrl;

        // Actualizar UI del reproductor (ambas vistas)
        this.elements.playerTitle.textContent = title;
        this.elements.playerArtist.textContent = artist;
        this.elements.playerArt.src = imageUrl;
        
        this.elements.playerFullTitle.textContent = title;
        this.elements.playerFullArtist.textContent = artist;
        this.elements.playerFullArt.src = imageUrl.includes('placehold.co') ? imageUrl.replace('150x150', '600x600') : imageUrl;
        
        // Obtener archivo y reproducir
        try {
            const fileBlob = await this.getTrackFile(trackId);
            this.currentAudioUrl = URL.createObjectURL(fileBlob);
            this.elements.audioPlayer.src = this.currentAudioUrl;
            this.elements.audioPlayer.play();
        } catch (error) {
            console.error("Error al reproducir el track:", error);
            this.elements.playerTitle.textContent = "Error al cargar la canción";
            this.elements.playerArtist.textContent = "...";
            this.elements.playerFullTitle.textContent = "Error al cargar la canción";
            this.elements.playerFullArtist.textContent = "...";
        }

        // (ACTUALIZADO) Actualizar estado de botones
        this.updatePlayerControls();
    }

    togglePlayPause() {
        const player = this.elements.audioPlayer;
        if (!player.src) return; // No hacer nada si no hay canción
        
        if (player.paused) {
            player.play();
        } else {
            player.pause();
        }
    }
    
    updatePlayPauseIcon(isPaused) {
        // Sincronizar barra pequeña
        this.elements.iconPlay.classList.toggle('hidden', !isPaused);
        this.elements.iconPause.classList.toggle('hidden', isPaused);
        // Sincronizar vista completa
        this.elements.iconFullPlay.classList.toggle('hidden', !isPaused);
        this.elements.iconFullPause.classList.toggle('hidden', isPaused);
    }

    // --- (NUEVAS FUNCIONES) LÓGICA DE COLA ---

    playNext() {
        if (this.playQueue.length === 0 || this.currentTrackId === null) {
            this.updatePlayPauseIcon(true);
            return;
        }
        
        const currentIndex = this.playQueue.findIndex(t => t.id === this.currentTrackId);
        
        if (currentIndex === -1 || currentIndex >= this.playQueue.length - 1) {
            // Fin de la cola
            this.updatePlayPauseIcon(true);
            this.elements.audioPlayer.currentTime = 0; // Rebobinar
            return; // No hay más canciones
        }

        const nextIndex = currentIndex + 1;
        const nextTrack = this.playQueue[nextIndex];
        // Buscar el item en el DOM
        const nextTrackItem = this.elements.libraryContent.querySelector(`.track-item[data-track-id="${nextTrack.id}"]`);
        
        if (nextTrackItem) {
            this.playTrack(nextTrackItem);
        } else {
            console.warn("No se encontró el siguiente track item en el DOM.");
        }
    }

    playPrevious() {
        if (this.playQueue.length === 0 || this.currentTrackId === null) return;
        
        const currentIndex = this.playQueue.findIndex(t => t.id === this.currentTrackId);

        if (currentIndex <= 0) {
            // Inicio de la cola
            return; // No hay canción anterior
        }

        const prevIndex = currentIndex - 1;
        const prevTrack = this.playQueue[prevIndex];
        // Buscar el item en el DOM
        const prevTrackItem = this.elements.libraryContent.querySelector(`.track-item[data-track-id="${prevTrack.id}"]`);
        
        if (prevTrackItem) {
            this.playTrack(prevTrackItem);
        } else {
            console.warn("No se encontró el track item anterior en el DOM.");
        }
    }

    updatePlayerControls() {
        if (this.playQueue.length === 0 || this.currentTrackId === null) {
            this.elements.playerPrevBtn.disabled = true;
            this.elements.playerNextBtn.disabled = true;
            return;
        }
        
        const currentIndex = this.playQueue.findIndex(t => t.id === this.currentTrackId);

        this.elements.playerPrevBtn.disabled = (currentIndex <= 0);
        this.elements.playerNextBtn.disabled = (currentIndex === -1 || currentIndex >= this.playQueue.length - 1);
    }


    // --- VISTA REPRODUCTOR COMPLETO ---

    openFullPlayer() {
        if (!this.elements.audioPlayer.src) return; // No abrir si no hay canción
        this.elements.fullPlayerView.classList.remove('translate-y-full');
    }

    closeFullPlayer(e) {
        if (e) e.stopPropagation(); // Evitar que el click se propague
        this.elements.fullPlayerView.classList.add('translate-y-full');
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
            this.currentImageUrls.add(imageUrl); // Registrar para limpieza
        } else {
            const char = encodeURIComponent(placeholderText[0]?.toUpperCase() || '?');
            imageUrl = `https://placehold.co/150x150/8b5cf6/white?text=${char}`;
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