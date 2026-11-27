// =====================================================
// British National Grid (EPSG:27700)
// Define the coordinate reference system used by
// Ordnance Survey raster mapping.
// =====================================================

const crs = new L.Proj.CRS(
    'EPSG:27700',
    '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 ' +
    '+x_0=400000 +y_0=-100000 +ellps=airy ' +
    '+towgs84=446.448,-125.157,542.06,' +
    '0.15,0.247,0.842,-20.489 +units=m +no_defs',
    {
        resolutions: [
            896, 448, 224, 112, 56, 28, 14,
            7, 3.5, 1.75, 0.875, 0.4375,
            0.21875, 0.109375
        ],
        origin: [-238375.0, 1376256.0]
    }
);

// =====================================================
// Map Initialisation
// Create the Leaflet map using the British National
// Grid coordinate system. Max zoom level is 9, OSM is 13
// =====================================================

const map = L.map('map', {
    crs: crs,
	maxZoom: 9
});

// Share-link support.
	const urlParams =
		new URLSearchParams(window.location.search);

	const requestedMunro =
		urlParams.get('munro');

map.setView(
    [57.0, -4.5],
    7
);

// Add metric scale bar.

L.control.scale({
    imperial: false
}).addTo(map);

// Layer used to store all Munro markers.

let munroLayer;

// =====================================================
// Ordnance Survey Leisure Mapping
// Main JT's Munros basemap using native EPSG:27700
// raster tiles from the OS Maps API.
// =====================================================

//const apiKey = 'O603GS9fvFwp8iZwjWaqP3F046JgpPTl'; //WLC
const apiKey = 'R6aU3Vv1jfZeyZJuACUnDW6maAeJRo9B'; //JT

L.tileLayer(
    `https://api.os.uk/maps/raster/v1/zxy/Leisure_27700/{z}/{x}/{y}.png?key=${apiKey}`,
    {
        attribution:
            '&copy; Crown copyright and database rights ' +
            new Date().getFullYear() +
            ' Ordnance Survey',
        maxZoom: 9
    }
).addTo(map);

// =====================================================
// Alternative OpenStreetMap Basemap
// Retained for testing and fallback purposes.
// Uncomment to use standard web mapping instead of
// OS Leisure mapping.
// =====================================================

/*
L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:
            '&copy; OpenStreetMap contributors'
    }
).addTo(map);
*/

// =====================================================
// Marker Styling
// Return marker colour based on ascent status.
// =====================================================

function getMarkerColour(feature) {

    if (feature.properties.done === 'Y') {
        return '#008000';
    }

    return '#cc0000';
}

// Create a custom Munro marker using a coloured
// triangular summit symbol.

function createTriangleIcon(colour) {

    return L.divIcon({

        className: '',

        html: `
            <div style="
                width:0;
                height:0;
                border-left:8px solid transparent;
                border-right:8px solid transparent;
                border-bottom:14px solid black;
                position:relative;
            ">
                <div style="
                    position:absolute;
                    left:-6px;
                    top:3px;
                    width:0;
                    height:0;
                    border-left:6px solid transparent;
                    border-right:6px solid transparent;
                    border-bottom:10px solid ${colour};
                ">
                </div>
            </div>
        `,

        iconSize: [16, 14],

        iconAnchor: [8, 14]

    });

}

// Create URL-friendly version of a Munro name.
function munroToSlug(name) {
    return name
        .toLowerCase()
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

let sharedMunroMarker = null;

// =====================================================
// Load Munro Dataset
// Read Munro locations and attributes from the
// GeoJSON file exported from QGIS using EPSG:27700.
// =====================================================

fetch('data/munros.geojson')

    .then(response => response.json())

    .then(data => {

        munroLayer = L.layerGroup();

        const bounds = L.latLngBounds();

        data.features.forEach(function (feature) {

            const coords = feature.geometry.coordinates;

            // Convert British National Grid coordinates
            // to Leaflet latitude/longitude.

            const latlng = map.options.crs.unproject(
                L.point(
                    coords[0],
                    coords[1]
                )
            );

            bounds.extend(latlng);

            const colour = getMarkerColour(feature);

            const marker = L.marker(
                latlng,
                {
                    icon: createTriangleIcon(colour)
                }
            );

            marker.feature = feature;

            const p = feature.properties;
			
			if (
				requestedMunro &&
				munroToSlug(p.name) === requestedMunro
			) {
				sharedMunroMarker = marker;
			}

			const shareUrl =
				`${window.location.origin}` +
				`?munro=${munroToSlug(p.name)}`;

            // Build ascended/not ascended status text.

            const status =
                p.done === 'Y'
                    ? '<span class="ascended">✓ Ascended</span>'
                    : '<span class="not-ascended">✗ Not Ascended</span>';

            // Build popup contents for the selected Munro.

            const popupHtml = `

                <div class="munro-popup">

                    <h3>${p.name}</h3>

                    <img src="photos/${p.photo}"
                        alt="${p.name}"
                        class="popup-photo"
                        style="cursor:pointer;">

                    <p>
                        <strong>Height:</strong>
                        ${p.height} m
                    </p>

					${p.section_name ? `
					<p>
						<strong>SMC Section:</strong>
						${p.section_name}
					</p>` : ''}

					${p.mwis_area ? `
					<p>
						<strong>MWIS Area:</strong>
						${p.mwis_area}
					</p>` : ''}

                    <p>
                        <strong>Ascents:</strong>
                        ${p.ascents}
                    </p>

                    <p>
                        ${status}
                    </p>

                    ${
						p.geograph_url ?
						`
						<p>
							<a href="${p.geograph_url}"
							   target="_blank">
							   View image on Geograph site
							</a>
						</p>
						`
						: ''
					}

					<p>
						<a href="#"
						   class="share-link"
						   data-share-url="${shareUrl}">
						   Copy share link
						</a>
					</p>

                </div>

            `;

            marker.bindPopup(
                popupHtml,
                {
                    maxWidth: 300
                }
            );

			marker.on('popupopen', function () {

				const shareLink =
					document.querySelector('.share-link');

				if (!shareLink) {
					return;
				}

				shareLink.addEventListener(
					'click',
					async function (e) {

						e.preventDefault();

						try {

							await navigator.clipboard.writeText(
								this.dataset.shareUrl
							);

							const originalText = this.textContent;

							this.textContent = '✓ Link copied';

							setTimeout(() => {
								this.textContent = originalText;
							}, 1500);

						} catch (err) {

							console.error(
								'Clipboard copy failed',
								err
							);
						}
					}
				);

			});

            munroLayer.addLayer(marker);

        });

        munroLayer.addTo(map);

		if (sharedMunroMarker) {

			map.setView(
				sharedMunroMarker.getLatLng(),
				7
			);

			sharedMunroMarker.openPopup();

		} else {

			// Zoom map to show all Munros.
			map.fitBounds(bounds);

		}

    })

    .catch(error => {

        // Log dataset loading errors.

        console.error(
            'Failed to load munros.geojson',
            error
        );

    });


// =====================================================
// Photo Overlay
// Photo enlargement
// =====================================================

document.addEventListener('click', function (e) {

    if (e.target.classList.contains('popup-photo')) {

        const overlay =
            document.getElementById('photo-overlay');

        const overlayImage =
            document.getElementById('overlay-image');

        overlayImage.src =
            e.target.src;

        overlay.style.display =
            'block';
    }

});

// =====================================================
// Close enlarged photos when the overlay is clicked.
// =====================================================

document.getElementById('photo-overlay').addEventListener('click', function () {
    this.style.display = 'none';
});

// =====================================================
// Munro Search
// Search Munros by name and display matching results.
// Selecting a result centres the map and opens its popup.
// =====================================================

document.getElementById('search-button').addEventListener('click', function () {

    const searchText = document.getElementById('search-input')
        .value
        .trim()
        .toLowerCase();

    const resultsDiv = document.getElementById('search-results');

    resultsDiv.innerHTML = '';

    if (!munroLayer || !searchText) {
        return;
    }

    munroLayer.eachLayer(function (layer) {

        const p = layer.feature.properties;

        if (p.name.toLowerCase().includes(searchText)) {

            const result = document.createElement('div');

            result.className = 'search-result';
            result.innerHTML = `${p.name} (${p.height}m)`;

			// Centre the selected Munro on the map, maintain
			// a minimum zoom level of 7 and open its popup.
            result.addEventListener('click', function () {

				const currentZoom = map.getZoom();

				map.setView(
					layer.getLatLng(),
					Math.max(currentZoom, 7)
				);

				layer.openPopup();

				map.panTo(layer.getLatLng());

				resultsDiv.innerHTML = '';

			});

            resultsDiv.appendChild(result);
        }
    });
});

// Allow Enter key to trigger a search.

document.getElementById('search-input').addEventListener('keydown', function (e) {

    if (e.key === 'Enter') {
        document.getElementById('search-button').click();
    }

});

// =====================================================
// Help Panel Controls
// Open and close the Help panel.
// =====================================================

document.getElementById('help-button').addEventListener('click', function () {
    document.getElementById('help-panel').style.display = 'block';
});

document.getElementById('help-close').addEventListener('click', function () {
    document.getElementById('help-panel').style.display = 'none';
});


// =====================================================
// Locate Me
// Store and display the user's location and accuracy.
// =====================================================

let locationMarker;
let accuracyCircle;

document.getElementById('locate-button').addEventListener('click', function () {

    map.locate({
        setView: true,
        maxZoom: 8,
        enableHighAccuracy: true
    });

});


// =====================================================
// Location Found
// Display the user's position and an accuracy circle.
// =====================================================

map.on('locationfound', function (e) {

    if (locationMarker) {
        map.removeLayer(locationMarker);
    }

    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
    }

    locationMarker = L.marker(e.latlng)
        .addTo(map)
        .bindPopup(
            '<strong>Your Location</strong><br>' +
            'Accuracy: ' +
            Math.round(e.accuracy) +
            ' m'
        );

    accuracyCircle = L.circle(e.latlng, {
        radius: e.accuracy,
        color: '#136aec',
        fillColor: '#136aec',
        fillOpacity: 0.15
    }).addTo(map);

    locationMarker.openPopup();
});


// =====================================================
// Location Error Handling
// Display any browser geolocation errors.
// =====================================================

map.on('locationerror', function (e) {

    console.log(e);

    alert(
        'Location error: ' + e.message
    );

});
