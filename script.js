// Initialisation des variables globales
let animes = JSON.parse(localStorage.getItem('animes')) || [];
const animeList = document.getElementById('anime-list');
const statsModal = document.getElementById('stats-modal');
const animeModal = document.getElementById('anime-modal');
const animeForm = document.getElementById('anime-form');
const totalEpisodesCountSpan = document.getElementById('total-episodes-count');
const episodeDurationInput = document.getElementById('episode-duration');
const searchInput = document.getElementById('search-input');

// --- Nettoyage au démarrage ---
document.addEventListener('DOMContentLoaded', () => {
    // Nettoyer les animes corrompus au chargement (UNIQUEMENT au premier chargement)
    const hasCleaned = localStorage.getItem('hasCleaned');
    
    if (!hasCleaned) {
        console.log("Nettoyage initial des données...");
        animes = animes.filter(anime => anime && anime.name && anime.id);
        
        // Supprimer spécifiquement Solo Leveling s'il existe
        const initialLength = animes.length;
        animes = animes.filter(anime => anime.name !== "Solo Leveling");
        
        if (animes.length < initialLength) {
            console.log("Solo Leveling supprimé");
            saveAnimes();
        }
        
        localStorage.setItem('hasCleaned', 'true');
    }
    
    // Initialiser la durée d'épisode depuis le stockage local
    const savedDuration = localStorage.getItem('episodeDuration');
    if (savedDuration) {
        episodeDurationInput.value = savedDuration;
    }
    
    // Charger et afficher la liste et les stats initiales
    renderAnimeList();
    updateStats();

    // Boutons d'ouverture/fermeture des modales
    document.getElementById('add-anime-btn').addEventListener('click', openAddAnimeModal);
    document.getElementById('stats-btn').addEventListener('click', () => {
        statsModal.style.display = 'block';
        updateStats(); // Mise à jour avant l'affichage
    });
    
    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllAnimes);
    }

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Formulaire d'ajout/modification
    animeForm.addEventListener('submit', handleAnimeSubmit);

    // Ajout de saison
    document.getElementById('add-season-btn').addEventListener('click', () => addSeasonInput());

    // Recherche
    searchInput.addEventListener('input', renderAnimeList);

    // Mise à jour de la durée d'épisode
    episodeDurationInput.addEventListener('change', updateStats);
});

// --- Gestion du Modèle de Données ---

/**
 * Sauvegarde le tableau d'animes dans le stockage local.
 */
function saveAnimes() {
    if (animes && animes.length > 0) {
        animes.sort((a, b) => a.name.localeCompare(b.name)); // Tri alphabétique
    }
    localStorage.setItem('animes', JSON.stringify(animes));
    renderAnimeList(); // Rafraîchit la liste après la sauvegarde
    updateStats(); // Rafraîchit les statistiques
}

/**
 * Fonction pour supprimer tous les animes (reset complet)
 */
function resetAllAnimes() {
    if (confirm("Êtes-vous sûr de vouloir supprimer TOUS les animes ? Cette action est irréversible.")) {
        localStorage.removeItem('animes');
        localStorage.removeItem('hasCleaned'); // Réinitialiser le flag de nettoyage
        animes = [];
        renderAnimeList();
        updateStats();
        alert("Tous les animes ont été supprimés !");
    }
}

// --- Fonctions de Rendu (Affichage) ---

/**
 * Calcule le nombre total d'épisodes de toutes les saisons d'un anime.
 * @param {Array} seasons - Le tableau des saisons de l'anime.
 * @returns {number} Le nombre total d'épisodes.
 */
function calculateTotalEpisodes(seasons) {
    const seasonsArray = seasons || []; 
    return seasonsArray.reduce((total, season) => total + (parseInt(season.episodes) || 0), 0);
}

/**
 * Ouvre ou ferme les détails d'un anime
 * @param {string} id - L'ID de l'anime
 */
function toggleAnimeDetails(id) {
    const details = document.getElementById(`details-${id}`);
    const isExpanded = details.classList.contains('expanded');
    
    // Fermer tous les autres détails
    document.querySelectorAll('.anime-details.expanded').forEach(detail => {
        if (detail.id !== `details-${id}`) {
            detail.classList.remove('expanded');
        }
    });
    
    // Basculer l'état actuel
    if (!isExpanded) {
        details.classList.add('expanded');
    } else {
        details.classList.remove('expanded');
    }
}

/**
 * Rend un seul élément d'anime dans la liste.
 * @param {Object} anime - L'objet anime à rendre.
 */
function renderAnimeItem(anime) {
    const totalEpisodes = calculateTotalEpisodes(anime.seasons);
    const ratingClass = anime.rating ? `rating-${anime.rating.toLowerCase().replace(' ', '-')}` : '';
    
    const li = document.createElement('li');
    li.setAttribute('data-id', anime.id);

    li.innerHTML = `
        <div class="anime-header ${anime.isFinished ? 'finished' : ''}" onclick="toggleAnimeDetails('${anime.id}')">
            <div class="anime-title">${anime.name}</div>
            <div class="anime-badges">
                ${anime.rating ? `<span class="rating-badge ${ratingClass}">${anime.rating}</span>` : ''}
                <span class="status-badge">${anime.isFinished ? 'TERMINÉ' : 'EN COURS'}</span>
            </div>
        </div>
        <div class="anime-details" id="details-${anime.id}">
            <div class="anime-info-grid">
                <p><strong>Total Épisodes:</strong> ${totalEpisodes}</p>
                <p><strong>Épisodes Vus:</strong> ${anime.episodesWatched}</p>
                <p><strong>Terminé:</strong> ${anime.isFinished ? 'OUI' : 'NON'}</p>
                <p><strong>Saisons:</strong> ${anime.seasons ? anime.seasons.length : 0}</p>
                ${anime.rating ? `<p><strong>Note:</strong> ${anime.rating}</p>` : ''}
            </div>
            <div class="anime-controls">
                <button class="control-btn edit-btn" onclick="event.stopPropagation(); openEditAnimeModal('${anime.id}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="control-btn" onclick="event.stopPropagation(); openQuickUpdateModal('${anime.id}', ${anime.episodesWatched}, ${totalEpisodes})">
                    <i class="fas fa-keyboard"></i> Saisir Vus
                </button>
                <button class="control-btn" onclick="event.stopPropagation(); toggleFinishedStatus('${anime.id}')">
                    <i class="fas ${anime.isFinished ? 'fa-redo' : 'fa-check'}"></i> ${anime.isFinished ? 'Démarquer' : 'Terminer'}
                </button>
                <button class="control-btn delete-btn" onclick="event.stopPropagation(); deleteAnime('${anime.id}')">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `;

    animeList.appendChild(li);
}

/**
 * Rend la liste complète des animes après application du filtre de recherche.
 */
function renderAnimeList() {
    animeList.innerHTML = ''; // Vide la liste existante
    const filter = searchInput.value.toLowerCase();
    
    if (animes && animes.length > 0) {
        animes.filter(anime => anime.name.toLowerCase().includes(filter))
              .forEach(renderAnimeItem);
    }
}

// --- Fonctions de Gestion des Animes (CRUD) ---

/**
 * Ouvre la modale pour ajouter un nouvel anime.
 */
function openAddAnimeModal() {
    animeForm.reset(); // Réinitialise le formulaire
    document.getElementById('modal-title').textContent = 'Ajouter un Anime';
    document.getElementById('anime-id').value = '';
    document.getElementById('is-finished').checked = false;
    document.getElementById('anime-rating').value = '';
    document.getElementById('seasons-list').innerHTML = ''; // Vide les saisons
    updateTotalEpisodesCountFromForm(); // Réinitialise le compte total
    animeModal.style.display = 'block';
}

/**
 * Ouvre la modale pour modifier un anime existant.
 * @param {string} id - L'ID de l'anime à modifier.
 */
function openEditAnimeModal(id) {
    const anime = animes.find(a => a.id === id);
    if (!anime) {
        alert("Anime non trouvé !");
        return;
    }

    document.getElementById('modal-title').textContent = `Modifier : ${anime.name}`;
    document.getElementById('anime-id').value = anime.id;
    document.getElementById('anime-name').value = anime.name;
    document.getElementById('episodes-watched').value = anime.episodesWatched;
    document.getElementById('is-finished').checked = anime.isFinished;
    document.getElementById('anime-rating').value = anime.rating || '';

    renderSeasons(anime.seasons); // Affiche les saisons existantes
    animeModal.style.display = 'block';
}

/**
 * Gère la soumission du formulaire (ajout ou modification).
 * @param {Event} e - L'événement de soumission.
 */
function handleAnimeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('anime-id').value;
    const name = document.getElementById('anime-name').value.trim();
    
    if (!name) {
        alert("Veuillez entrer un nom d'anime !");
        return;
    }
    
    let episodesWatched = parseInt(document.getElementById('episodes-watched').value) || 0;
    const isFinished = document.getElementById('is-finished').checked;
    const rating = document.getElementById('anime-rating').value;
    
    // Récupère les données des saisons du formulaire
    const seasonsElements = document.querySelectorAll('#seasons-list .season-item');
    const seasons = Array.from(seasonsElements).map(item => ({
        id: item.dataset.seasonId,
        episodes: parseInt(item.querySelector('input').value) || 0
    }));

    const totalEpisodesAnime = calculateTotalEpisodes(seasons);

    // S'assurer que le nombre d'épisodes vus ne dépasse pas le total
    if (episodesWatched > totalEpisodesAnime && totalEpisodesAnime > 0) {
        alert(`Le nombre d'épisodes vus (${episodesWatched}) ne peut pas dépasser le total des saisons (${totalEpisodesAnime}). Il a été ajusté.`);
        episodesWatched = totalEpisodesAnime;
    }

    if (id) {
        // Modification d'un anime existant
        const index = animes.findIndex(a => a.id === id);
        if (index > -1) {
            animes[index] = {
                ...animes[index],
                name,
                episodesWatched,
                isFinished,
                rating,
                seasons
            };
            alert("Anime modifié avec succès !");
        }
    } else {
        // Ajout d'un nouvel anime
        const newAnime = {
            id: Date.now().toString(), // ID unique basé sur le timestamp
            name,
            episodesWatched,
            isFinished,
            rating,
            seasons
        };
        animes.push(newAnime);
        alert("Anime ajouté avec succès !");
    }

    saveAnimes();
    animeModal.style.display = 'none';
}

/**
 * Change l'état "Terminé" d'un anime.
 * @param {string} id - L'ID de l'anime.
 */
function toggleFinishedStatus(id) {
    const anime = animes.find(a => a.id === id);
    if (anime) {
        anime.isFinished = !anime.isFinished;

        // Si on termine l'anime, mettre les épisodes vus au total si des saisons existent
        const totalEpisodes = calculateTotalEpisodes(anime.seasons);
        if (anime.isFinished && totalEpisodes > 0) {
            anime.episodesWatched = totalEpisodes;
        }
        
        saveAnimes();
        alert(`Anime marqué comme ${anime.isFinished ? 'terminé' : 'non terminé'} !`);
    }
}

/**
 * Supprime un anime de la liste.
 * @param {string} id - L'ID de l'anime.
 */
function deleteAnime(id) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet anime ?")) {
        const initialLength = animes.length;
        animes = animes.filter(a => a.id !== id);
        
        if (animes.length < initialLength) {
            saveAnimes();
            alert("Anime supprimé avec succès !");
        } else {
            alert("Erreur : Anime non trouvé.");
        }
    }
}

// --- Fonctions de Gestion des Saisons ---

/**
 * Ajoute un champ pour une nouvelle saison dans la modale.
 * @param {string} [id] - L'ID de la saison (pour modification).
 * @param {number} [episodes] - Le nombre d'épisodes (pour modification).
 */
function addSeasonInput(id = Date.now().toString(), episodes = 0) {
    const seasonsList = document.getElementById('seasons-list');
    const li = document.createElement('li');
    li.className = 'season-item';
    li.dataset.seasonId = id;

    li.innerHTML = `
        <label>Saison ${seasonsList.children.length + 1} :</label>
        <input type="number" value="${episodes}" min="0" oninput="updateTotalEpisodesCountFromForm()">
        <button type="button" onclick="removeSeason(this)"><i class="fas fa-times"></i></button>
    `;
    
    seasonsList.appendChild(li);
    updateTotalEpisodesCountFromForm();
}

/**
 * Rend les champs des saisons d'un anime existant.
 * @param {Array} seasons - Le tableau des saisons.
 */
function renderSeasons(seasons) {
    const seasonsList = document.getElementById('seasons-list');
    seasonsList.innerHTML = '';
    
    const seasonsArray = seasons || []; 
    seasonsArray.forEach(s => addSeasonInput(s.id, s.episodes));
}

/**
 * Supprime le champ d'une saison.
 * @param {HTMLElement} btn - Le bouton de suppression cliqué.
 */
function removeSeason(btn) {
    btn.closest('.season-item').remove();
    updateTotalEpisodesCountFromForm();
}

/**
 * Met à jour le compteur total d'épisodes dans la modale d'ajout/modification.
 */
function updateTotalEpisodesCountFromForm() {
    const seasonsElements = document.querySelectorAll('#seasons-list .season-item input');
    const total = Array.from(seasonsElements).reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
    totalEpisodesCountSpan.textContent = total;
}

// --- Fonction de Saisie Rapide (+1 ou valeur) ---

/**
 * Ouvre une petite modale pour saisir directement le nombre d'épisodes vus.
 * @param {string} id - L'ID de l'anime.
 * @param {number} currentWatched - Le nombre d'épisodes vus actuel.
 * @param {number} totalEpisodes - Le nombre total d'épisodes.
 */
function openQuickUpdateModal(id, currentWatched, totalEpisodes) {
    let newValue = prompt(`Saisir le nombre total d'épisodes VUS pour cet anime (Actuel : ${currentWatched}, Total : ${totalEpisodes || 'N/A'}).`);

    if (newValue === null || newValue.trim() === "") {
        return; // Annulé ou vide
    }

    const watched = parseInt(newValue);

    if (isNaN(watched) || watched < 0) {
        alert("Veuillez entrer un nombre valide.");
        return;
    }

    const anime = animes.find(a => a.id === id);
    if (anime) {
        // S'assurer que le nombre d'épisodes vus ne dépasse pas le total
        if (watched > totalEpisodes && totalEpisodes > 0) {
             alert(`Le nombre d'épisodes vus (${watched}) ne peut pas dépasser le total des saisons (${totalEpisodes}). Il a été ajusté.`);
             anime.episodesWatched = totalEpisodes;
        } else {
            anime.episodesWatched = watched;
        }

        // Mettre à jour le statut terminé si le nombre atteint le total
        if (totalEpisodes > 0 && anime.episodesWatched >= totalEpisodes) {
            anime.isFinished = true;
        } else {
            anime.isFinished = false;
        }

        saveAnimes();
        alert("Épisodes mis à jour avec succès !");
    }
}

// --- Fonctions de Statistiques ---

/**
 * Met à jour les statistiques dans la modale.
 */
function updateStats() {
    const totalAnimes = animes ? animes.length : 0;
    const finishedAnimes = animes ? animes.filter(a => a.isFinished).length : 0;
    const totalEpisodesWatched = animes ? animes.reduce((sum, a) => sum + (a.episodesWatched || 0), 0) : 0;
    
    // Récupérer la durée de l'épisode (en minutes)
    const episodeDuration = parseInt(episodeDurationInput.value) || 24;
    localStorage.setItem('episodeDuration', episodeDuration);

    // Calcul des heures de visionnage
    const totalMinutes = totalEpisodesWatched * episodeDuration;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalHoursDisplay = `${totalHours} h ${remainingMinutes} min`;

    // Affichage des résultats
    document.getElementById('total-animes-stat').textContent = totalAnimes;
    document.getElementById('total-episodes-stat').textContent = totalEpisodesWatched;
    document.getElementById('finished-animes-stat').textContent = finishedAnimes;
    document.getElementById('total-hours-stat').textContent = totalHoursDisplay;
}