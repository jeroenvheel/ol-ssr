import { document } from './dom.js';
import { decodeDataURL } from './dom-handlers';
import * as ol from 'ol';
import * as proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import * as olproj from 'ol/proj';
import * as olsource from 'ol/source';
import * as ollayer from 'ol/layer';

function createMapElement(id, width, height) {
    const mapElement = document.createElement('div');
    document.body.appendChild(mapElement);
    mapElement.setAttribute('id', id);
    mapElement.style.height = height + "px";
    mapElement.style.width = width + "px";

    return mapElement;
}
function createLayers(id, project) {
    const openbasiskaart = new ollayer.Image({
        source: new olsource.ImageWMS({
            url: process.env.BACKGROUND_MAP_URL,
            params: {
                'FORMAT': 'image/png',
                'VERSION': '1.1.1',
                "STYLES": '',
                "LAYERS": process.env.BACKGROUND_MAP_LAYERS,
                "exceptions": 'application/vnd.ogc.se_inimage',
            },
            ratio: 1,
            serverType: 'geoserver',
        })
    });
    const background_trees = new ollayer.Image({
        source: new olsource.ImageWMS({
            url: process.env.BACKGROUND_TREES_URL,
            params: {
                'FORMAT': 'image/png',
                'VERSION': '1.3.0',
                "STYLES": '',
                'CQL_FILTER': `project = '${project}'`,
                "LAYERS": process.env.BACKGROUND_TREES_LAYERS,
                "exceptions": 'application/vnd.ogc.se_inimage',
            },
            ratio: 1,
            serverType: 'geoserver',
        })
    });
    const active_trees = new ollayer.Image({
        source: new olsource.ImageWMS({
            url: process.env.BACKGROUND_ACTIVE_URL,
            params: {
                'FORMAT': 'image/png',
                'VERSION': '1.3.0',
                "STYLES": '',
                'CQL_FILTER': `id = ${id}`,
                "LAYERS": process.env.BACKGROUND_ACTIVE_LAYERS,
                "exceptions": 'application/vnd.ogc.se_inimage',
            },
            ratio: 1,
            serverType: 'geoserver',
        })
    });

    return [
        openbasiskaart,
        background_trees,
        active_trees
    ];
}
async function renderCoordinate(coordinates, zoom, id, project, size) {
    let mapElement = createMapElement('map', size[0], size[1]);

    proj4.default.defs('EPSG:28992', "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000  +ellps=bessel  +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +units=m +no_defs no_defs");
    proj4.default.defs('urn:ogc:def:crs:EPSG::28992', proj4.default.defs('EPSG:28992'));

    register(proj4.default);

    coordinates = olproj.transform(coordinates, 'EPSG:28992', 'EPSG:4326')

    return await new Promise((resolve, reject) => {

        const layers = createLayers(id, project);

        let map = new ol.Map({
            keyboardEventTarget: mapElement,
            target: mapElement,
            layers: layers,
            size: size,
            view: new ol.View({
                center: olproj.fromLonLat(coordinates),
                zoom: zoom
            })
        });

        let rendercompleteEventKey;
        let postrenderEventKey;
        const timeoutTime = 60 * 1000;
        const tm = setTimeout(() => {
            reject(`timeout expired request is taking too long (${timeoutTime}ms)`);

            map.un(rendercompleteEventKey.type, rendercompleteEventKey.listener);
            map.un(postrenderEventKey.type, postrenderEventKey.listener);

            for (let index = 0; index < layers.length; index++) {
                const layer = layers[index];
                map.removeLayer(layer)
            }

            map = undefined;
            mapElement = undefined;

        }, timeoutTime);
        let image;
        postrenderEventKey = layers[2].on('postrender', (e) => {
            console.log('received image');
            image = e.context.canvas.toDataURL();
        });

        rendercompleteEventKey = map.once('rendercomplete', (e) => {
            console.log('render complete');

            clearTimeout(tm);

            const raw = decodeDataURL(image);

            resolve(raw);

            map.un(rendercompleteEventKey.type, rendercompleteEventKey.listener);
            map.un(postrenderEventKey.type, postrenderEventKey.listener);

            for (let index = 0; index < layers.length; index++) {
                const layer = layers[index];
                map.removeLayer(layer)
            }

            map = undefined;
            mapElement = undefined;
        });

        console.log('rendering');
    })

}

module.exports = { renderCoordinate: renderCoordinate };