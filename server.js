const express = require('express');
const path = require('path');
const compression = require('compression');
const { queryParser } = require('express-query-parser')

require('dotenv').config();

const app = express();
app.use(compression());
app.use(queryParser({
    parseNull: true,
    parseUndefined: true,
    parseBoolean: true,
    parseNumber: true
}))
app.disable('x-powered-by');

function _setHeaders(res) {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "SAMEORIGIN");
    res.set("Referrer-Policy", "no-referrer");
    res.set("Permissions-Policy", "geolocation=(self), microphone=(self), camera=(self)");
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.set("Content-Security-Policy", "upgrade-insecure-requests");
}

app.get('/map', async function (req, res, next) {

    const startTime = performance.now();

    _setHeaders(res);

    const q = req.query;

    const w = q.w === undefined || Number.isNaN(q.w) ? 500 : q.w;
    const h = q.h === undefined || Number.isNaN(q.h) ? 500 : q.h;
    const x = q.x === undefined || Number.isNaN(q.x) ? 122315.366572898 : q.x;
    const y = q.y === undefined || Number.isNaN(q.y) ? 453113.29532384843 : q.y;
    const z = q.z === undefined || Number.isNaN(q.z) ? 19 : q.z;
    const id = q.id === undefined || Number.isNaN(q.id) ? 0 : q.id;
    const project = q.project === undefined ? 'missing-project' : q.project

    const { renderCoordinate } = require('./index.cjs');

    let image
    try {
        console.log([x, y], z, id);
        const renderStartTime = performance.now();

        console.log(process.env.BACKGROUND_MAP);

        image = await renderCoordinate([x, y], z, id, project, [w, h]);

        const endTime = performance.now();
        const renderEndTime = performance.now();
        res.set('Content-Type', 'image/png');
        res.set('X-Response-Time', `${(endTime - startTime).toFixed(2)}ms`);
        res.set('X-Render-Time', `${(renderEndTime - renderStartTime).toFixed(2)}ms`);

        res.send(image);

        console.log("send complete")
        console.log(`Total request: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`Render time: ${(renderEndTime - renderStartTime).toFixed(2)}ms`);
    } catch (error) {
        const endTime = performance.now();
        res.set('X-Response-Time', `${(endTime - startTime).toFixed(2)}ms`);
        res.send(error);
        console.log('render error', error);
        console.log(`Total request: ${(endTime - startTime).toFixed(2)}ms`);
    }
});

app.use(express.static(path.join(__dirname, `public`), {
    setHeaders: _setHeaders.bind(this)
}));

// Send all requests to index.html
app.get('/*', function (req, res) {
    _setHeaders(res);
    res.sendFile(path.join(__dirname, `public/index.html`));
});

const server = app.listen(process.env.PORT || 8080);

process.on('SIGTERM', () => {
    debug('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        debug('HTTP server closed')
    })
})