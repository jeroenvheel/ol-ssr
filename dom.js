import jsdom, { JSDOM } from 'jsdom';
import { initDOM } from './dom-handlers';

const resourceLoader = new jsdom.ResourceLoader();
export const window = new JSDOM('', { resources: resourceLoader, pretendToBeVisual: true }).window;
export const document = window.document;

initDOM(window);
