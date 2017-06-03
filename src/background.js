import path from 'path';
import jetpack from 'fs-jetpack';
import {app, Menu, shell} from 'electron';
import createWindow from './helpers/window';

const Config = require('electron-config');
const config = new Config();

const env = require('./env');
const appMenu = require('./menu');
const tray = require('./tray');

require('electron-dl')({saveAs: true});
require('electron-context-menu')();

if (env.debug) {
	require('electron-reload')(__dirname);
	require('electron-debug')({enabled: true});
}

let mainWindow;
let isQuitting = false;

/*if (env.name !== 'production') {
    var userDataPath = app.getPath('userData');
    app.setPath('userData', userDataPath + ' (' + env.name + ')');
}
*/

const isAlreadyRunning = app.makeSingleInstance(() => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

if (isAlreadyRunning) {
	app.quit();
}

function createMainWindow() {
	const isDarkMode = config.get('darkMode');

	const win = new createWindow('main', {
		title: app.getName(),
		show: false,
		width: 1300,
		height: 850,
		icon: process.platform === 'linux' && path.join(__dirname, 'static/Icon.png'),
		minWidth: 1000,
		minHeight: 700,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'hidden-inset',
		autoHideMenuBar: true,
		darkTheme: isDarkMode, // GTK+3
		//backgroundColor: isDarkMode ? '#192633' : '#fff',
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: true,
			plugins: true
		}
	});

  /**
	 * Trick to make the window draggable
   * https://github.com/electron/electron/pull/5557
   */
  const titleBarHack =
          'var div = document.createElement("div");' +
          'div.style.position = "absolute";' +
          'div.style.top = 0;' +
          'div.style.height = "23px";' +
          'div.style.width = "100%";' +
          'div.style["-webkit-app-region"] = "drag";' +
          'document.body.appendChild(div);';

  win.webContents.on('did-finish-load', function () {
    if (process.platform === 'darwin') {
      win.webContents.executeJavaScript(titleBarHack);
    }
  });

	if (process.platform === 'darwin') {
		win.setSheetOffset(40);
	}
	
	win.loadURL('file://' + __dirname + '/index.html');

	win.on('close', e => {
		if (!isQuitting) {
			e.preventDefault();

			if (process.platform === 'darwin') {
				app.hide();
			} else {
				win.hide();
			}
		}
	});
	
	return win;
}

app.on('ready', () => {
	Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	const page = mainWindow.webContents;

	const argv = require('minimist')(process.argv.slice(1));

	page.on('dom-ready', () => {
		page.insertCSS(jetpack.read(path.join(__dirname, 'browser.css'), 'utf8'));
		page.insertCSS(jetpack.read(path.join(__dirname, 'themes/dark-mode.css'), 'utf8'));
		
		if (process.platform === 'darwin') {
			page.insertCSS(jetpack.read(path.join(__dirname, 'themes/osx-fix.css'), 'utf8'));
		}
  
		if (argv.minimize) {
			mainWindow.minimize();
		} else {
			mainWindow.show();
		}
    
    if (env.debug) {
      mainWindow.openDevTools();
    }
	});

	page.on('new-window', (e, url) => {
		e.preventDefault();
		shell.openExternal(url);
	});
});

app.on('activate', () => {
	mainWindow.show();
});

app.on('before-quit', () => {
    isQuitting = true;
});


