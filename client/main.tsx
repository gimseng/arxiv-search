import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { App } from './Components';
//function main() {
window.onload = function () {
    let root = document.getElementById("root");
    ReactDOM.render(<App />, root);
}