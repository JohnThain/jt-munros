// British National Grid (EPSG:27700) map definition

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

// Create map using EPSG:27700

const map = L.map('map', {
    crs: crs
});

map.setView(
    [57.0, -4.5],
    7
);

L.control.scale({
    imperial: false
}).addTo(map);

let munroLayer;

// OS Leisure_27700 basemap

//const apiKey = 'O603GS9fvFwp8iZwjWaqP3F046JgpPTl'; //WLC
const apiKey = 'R6aU3Vv1jfZeyZJuACUnDW6maAeJRo9B'; //JT

L.tileLayer(
    `https://api.os.uk/maps/raster/v1/zxy/Leisure_27700/{z}/{x}/{y}.png?key=${apiKey}`,
    {
        attribution:
            '&copy; Crown copyright and database rights ' +
            new Date().getFullYear() +
            ' Ordnance Survey',
        maxZoom: 13
    }
).addTo(map);

// OpenStreetMap basemap

/*L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:
            '&copy; OpenStreetMap contributors'
    }
).addTo(map);*/

// Determine marker colour

function getMarkerColour(feature) {

    if (feature.properties.done === 'Y') {
        return '#008000';
    }

    return '#cc0000';
}

// Create triangle marker

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

// Load GeoJSON

fetch('data/munros.geojson')	//data exported using BNG CRS

    .then(response => response.json())

    .then(data => {

		munroLayer = L.layerGroup();

		const bounds = L.latLngBounds();

		data.features.forEach(function(feature) {

			const coords =
				feature.geometry.coordinates;

			const latlng =
				map.options.crs.unproject(
					L.point(
						coords[0],
						coords[1]
					)
				);
			bounds.extend(latlng);

			const colour =
				getMarkerColour(feature);

			const marker =
				L.marker(
					latlng,
					{
						icon:
							createTriangleIcon(colour)
					}
				);

			marker.feature = feature;

			const p = feature.properties;

			const status =
				p.done === 'Y'
				? '<span class="ascended">✓ Ascended</span>'
				: '<span class="not-ascended">✗ Not Ascended</span>';

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

				</div>

			`;

			marker.bindPopup(
				popupHtml,
				{
					maxWidth: 300
				}
			);

			munroLayer.addLayer(marker);

		});

		munroLayer.addTo(map);

		map.fitBounds(bounds);
    })

    .catch(error => {

        console.error(
            'Failed to load munros.geojson',
            error
        );

    });


// Photo enlargement

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


// Close enlarged photo

document
    .getElementById('photo-overlay')
    .addEventListener('click', function () {

        this.style.display =
            'none';

    });
	
	document
    .getElementById('search-button')
    .addEventListener('click', function () {

        const searchText =
            document
            .getElementById('search-input')
            .value
            .trim()
            .toLowerCase();

        const resultsDiv =
            document
            .getElementById('search-results');

        resultsDiv.innerHTML = '';

        if (!munroLayer || !searchText) {
            return;
        }

        munroLayer.eachLayer(function (layer) {

            const p =
                layer.feature.properties;

            if (
                p.name
                 .toLowerCase()
                 .includes(searchText)
            ) {

                const result =
                    document.createElement('div');

                result.className =
                    'search-result';

                result.innerHTML =
                    `${p.name} (${p.height}m)`;

                result.addEventListener(
                    'click',
                    function () {

                        const currentZoom = map.getZoom();

						if (currentZoom < 7) {

							map.setView(
								layer.getLatLng(),
								7
							);

						} else {

							map.setView(
								layer.getLatLng(),
								currentZoom
							);

						}

                        layer.openPopup();

                        resultsDiv.innerHTML = '';

                    }
                );

                resultsDiv.appendChild(
                    result
                );
            }
        });

    });

document
    .getElementById('help-button')
    .addEventListener('click', function () {

        document
            .getElementById('help-panel')
            .style.display = 'block';

    });


document
    .getElementById('help-close')
    .addEventListener('click', function () {

        document
            .getElementById('help-panel')
            .style.display = 'none';

    });
	
let locationMarker;
let accuracyCircle;


document
    .getElementById('locate-button')
    .addEventListener('click', function () {

        map.locate({
            setView: true,
            maxZoom: 8,
            enableHighAccuracy: true
        });

    });
	
	map.on('locationfound', function (e) {

		if (locationMarker) {
			map.removeLayer(locationMarker);
		}

		if (accuracyCircle) {
			map.removeLayer(accuracyCircle);
		}

		locationMarker =
			L.marker(e.latlng)
			 .addTo(map)
			 .bindPopup(
				 '<strong>Your Location</strong><br>' +
				 'Accuracy: ' +
				 Math.round(e.accuracy) +
				 ' m'
			 );

		accuracyCircle =
			L.circle(
				e.latlng,
				{
					radius: e.accuracy,
					color: '#136aec',
					fillColor: '#136aec',
					fillOpacity: 0.15
				}
			).addTo(map);

		locationMarker.openPopup();

	});
	
	map.on('locationerror', function (e) {

		console.log(e);

		alert(
			'Location error: ' + e.message
		);

	});