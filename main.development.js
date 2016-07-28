import { app, BrowserWindow, Menu, crashReporter, shell, ipcMain } from "electron";
import fs from "fs";

let menu;
let template;
let mainWindow = null;

app.commandLine.appendSwitch("--ignore-certificate-errors");

const handleSocialAuth = (socialUrl) => {
  const socialLoginWindow = new BrowserWindow({
    show: true,
    width: 1000,
    height: 700,
    // This is required for FB OAuth
    webPreferences: {
      // fails without this because of CommonJS script detection
      nodeIntegration: false,
      // required for Facebook active ping thingy
      webSecurity: false,
      plugins: true
    }
  });

  // socialLoginWindow.openDevTools();
  socialLoginWindow.loadURL(socialUrl);

  socialLoginWindow.on("close", () => {
    mainWindow.webContents.session.cookies.get({
      // name: "csrftoken",
      domain: "plot.ly"
    }, (err, cookies) => {
      // TODO: For some reason, this is always set, even on fail, wtf?
      if (Array.isArray(cookies) && cookies[0] && cookies[0].value) {
        mainWindow.webContents.send("social-login", cookies);
      }
    });
  });
};

crashReporter.start();

if (process.env.NODE_ENV === "development") {
  require("electron-debug")();
}


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


app.on("ready", () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1600,
    height: 1000
  });

  mainWindow.loadURL(`file://${__dirname}/app/app.html`);

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  ipcMain.on("encode-image", (event, imagePath) => {
    fs.readFile(imagePath, (err, imageData) => {
      if (err) {
        mainWindow.webContents.send("image-encoded", null);

        return;
      }

      mainWindow.webContents.send("image-encoded", new Buffer(imageData).toString("base64"));
    });
  });

  ipcMain.on("current-element", (event, isCurrentElement) => {
    menu.items.forEach((item, i) => {
      if (item.label === "Edit") {
        item.submenu.items.forEach((option, k) => {
          if (
            option.label === "Move Forward" ||
            option.label === "Move Backward" ||
            option.label === "Move To Front" ||
            option.label === "Move To Back" ||
            option.label === "Delete Element"
          ) {
            menu.items[i].submenu.items[k].enabled = isCurrentElement;
          }
        });
      }
    });
    // console.log(menu.items[2].submenu.items);
  });

  ipcMain.on("social-login", (event, socialUrl) => {
    mainWindow.webContents.session.clearStorageData(() => {});
    // Reset the csrftoken cookie if there is one
    mainWindow.webContents.session.cookies.remove("https://plot.ly", "csrftoken", () => {
      handleSocialAuth(socialUrl);
    });
  });

  ipcMain.on("open-external", (event, url) => {
    shell.openExternal(url);
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.openDevTools();
  }

  if (process.platform === "darwin") {
    template = [{
      label: "Electron",
      submenu: [{
        label: "About ElectronReact",
        selector: "orderFrontStandardAboutPanel:"
      }, {
        type: "separator"
      }, {
        label: "Services",
        submenu: []
      }, {
        type: "separator"
      }, {
        label: "Hide ElectronReact",
        accelerator: "Command+H",
        selector: "hide:"
      }, {
        label: "Hide Others",
        accelerator: "Command+Shift+H",
        selector: "hideOtherApplications:"
      }, {
        label: "Show All",
        selector: "unhideAllApplications:"
      }, {
        type: "separator"
      }, {
        label: "Quit",
        accelerator: "Command+Q",
        click() {
          app.quit();
        }
      }]
    }, {
      label: "File",
      submenu: [{
        label: "Save",
        accelerator: "Command+S",
        click() {
          mainWindow.webContents.send("file", "save");
        }
      }, {
        label: "Open",
        accelerator: "Command+O",
        click() {
          mainWindow.webContents.send("file", "open");
        }
      }]
    }, {
      label: "Edit",
      submenu: [{
        label: "Undo",
        accelerator: "Command+Z",
        selector: "undo:",
        click() {
          mainWindow.webContents.send("edit", "undo");
        }
      }, {
        label: "Redo",
        accelerator: "Command+Shift+Z",
        selector: "redo:",
        click() {
          mainWindow.webContents.send("edit", "redo");
        }
      }, {
        type: "separator"
      },
      {
        label: "Move Forward",
        accelerator: "CMD+[",
        selector: "forward:",
        click() {
          mainWindow.webContents.send("edit", "forward");
        }
      },
      {
        label: "Move Backward",
        accelerator: "CMD+]",
        selector: "backward:",
        click() {
          mainWindow.webContents.send("edit", "backward");
        }
      },
      {
        label: "Move To Front",
        accelerator: "shift+CMD+[",
        selector: "front:",
        click() {
          mainWindow.webContents.send("edit", "front");
        }
      },
      {
        label: "Move To Back",
        accelerator: "shift+CMD+]",
        selector: "back:",
        click() {
          mainWindow.webContents.send("edit", "back");
        }
      },
      {
        label: "Delete Element",
        accelerator: "CMD+D",
        selector: "delete:",
        click() {
          mainWindow.webContents.send("edit", "delete");
        }
      }, {
        type: "separator"
      }, {
        label: "Cut",
        accelerator: "Command+X",
        selector: "cut:"
      }, {
        label: "Copy",
        accelerator: "Command+C",
        selector: "copy:"
      }, {
        label: "Paste",
        accelerator: "Command+V",
        selector: "paste:"
      }, {
        label: "Select All",
        accelerator: "Command+A",
        selector: "selectAll:"
      }]
    }, {
      label: "View",
      submenu: (process.env.NODE_ENV === "development") ? [{
        label: "Reload",
        accelerator: "Command+R",
        click() {
          mainWindow.restart();
        }
      }, {
        label: "Toggle Full Screen",
        accelerator: "Ctrl+Command+F",
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }, {
        label: "Toggle Developer Tools",
        accelerator: "Alt+Command+I",
        click() {
          mainWindow.toggleDevTools();
        }
      }] : [{
        label: "Toggle Full Screen",
        accelerator: "Ctrl+Command+F",
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }]
    }, {
      label: "Window",
      submenu: [{
        label: "Minimize",
        accelerator: "Command+M",
        selector: "performMiniaturize:"
      }, {
        label: "Close",
        accelerator: "Command+W",
        selector: "performClose:"
      }, {
        type: "separator"
      }, {
        label: "Bring All to Front",
        selector: "arrangeInFront:"
      }]
    }, {
      label: "Help",
      submenu: [{
        label: "Learn More",
        click() {
          shell.openExternal("http://electron.atom.io");
        }
      }, {
        label: "Documentation",
        click() {
          shell.openExternal("https://github.com/atom/electron/tree/master/docs#readme");
        }
      }, {
        label: "Community Discussions",
        click() {
          shell.openExternal("https://discuss.atom.io/c/electron");
        }
      }, {
        label: "Search Issues",
        click() {
          shell.openExternal("https://github.com/atom/electron/issues");
        }
      }]
    }];

    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    template = [{
      label: "&File",
      submenu: [{
        label: "&Open",
        accelerator: "Ctrl+O"
      },
      {
        label: "&Save",
        accelerator: "Ctrl+S"
      },
      {
        label: "&Save As...",
        accelerator: "Ctrl+Shift+S"
      },
      {
        label: "&Export To PDF",
        accelerator: ""
      },
      {
        label: "&Close",
        accelerator: "Ctrl+Q",
        click() {
          mainWindow.close();
        }
      }]
    }, {
      label: "&Edit",
      submenu: [{
        label: "&Undo",
        accelerator: "Ctrl+Z",
        click() {
          mainWindow.webContents.send("edit", "undo");
        }
      }, {
        label: "&Redo",
        accelerator: "Ctrl+Shift+Z",
        click() {
          mainWindow.webContents.send("edit", "redo");
        }
      },
      {
        type: "separator"
      },
      {
        label: "&Move Forward",
        accelerator: "Ctrl+[",
        click() {
          mainWindow.webContents.send("edit", "forward");
        }
      },
      {
        label: "&Move Backward",
        accelerator: "Ctrl+]",
        click() {
          mainWindow.webContents.send("edit", "backward");
        }
      },
      {
        label: "&Move To Front",
        accelerator: "shift+Ctrl+[",
        click() {
          mainWindow.webContents.send("edit", "front");
        }
      },
      {
        label: "&Move To Back",
        accelerator: "shift+Ctrl+]",
        click() {
          mainWindow.webContents.send("edit", "back");
        }
      },
      {
        label: "Delete Element",
        accelerator: "Ctrl+D",
        click() {
          mainWindow.webContents.send("edit", "delete");
        }
      }]
    },
    {
      label: "&View",
      submenu: (process.env.NODE_ENV === "development") ? [{
        label: "&Reload",
        accelerator: "Ctrl+R",
        click() {
          mainWindow.restart();
        }
      }, {
        label: "Toggle &Full Screen",
        accelerator: "F11",
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      },
      {
        label: "&Slideshow",
        accelerator: ""
      },
      {
        label: "Toggle &Developer Tools",
        accelerator: "Alt+Ctrl+I",
        click() {
          mainWindow.toggleDevTools();
        }
      }] : [{
        label: "Toggle &Full Screen",
        accelerator: "F11",
        click() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }]
    }, {
      label: "Help",
      submenu: [{
        label: "Learn More",
        click() {
          shell.openExternal("http://electron.atom.io");
        }
      }, {
        label: "Documentation",
        click() {
          shell.openExternal("https://github.com/atom/electron/tree/master/docs#readme");
        }
      }, {
        label: "Community Discussions",
        click() {
          shell.openExternal("https://discuss.atom.io/c/electron");
        }
      }, {
        label: "Search Issues",
        click() {
          shell.openExternal("https://github.com/atom/electron/issues");
        }
      }]
    }];
    menu = Menu.buildFromTemplate(template);
    mainWindow.setMenu(menu);
  }
});
