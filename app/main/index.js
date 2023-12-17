'use strict'

const { app, BrowserWindow, ipcMain, dialog } = require( 'electron' );
const path = require("path");

// ==== Local Lib ====
// Renderer -> Main 通信の関数
const {
    SampleFunc,
} = require( './lib/ipcMainHandleFunc' )

const cur_dir  = process.cwd()
const tool_dir = process.cwd();
let gui = null;

app.on( 'ready', () =>
{
    let win_option = {
        // frame: false,
        width    : 1920,
        height   : 1080,
        minWidth : 400,
        minHeight: 400,
        autoHideMenuBar: true, // menu bar を自動で消してくれる
        webPreferences: {
            experimentalFeatures:   false,
            nodeIntegration:        false,
            contextIsolation: true,
            preload: __dirname + "/preload.js",
        }
    }

    gui = new BrowserWindow( win_option )
    gui.loadURL( path.join('file:', __dirname, '../render/index.html' ));
    //gui.setMenu(null); // tool bar を消す

    console.log(__dirname);

    // gui.webContents.openDevTools()     // debug

    // Main -> Renderer
    let timerID = setInterval(()=> {
        const main_to_renderer = "Sample Message From Main"
        gui.webContents.send("main_to_renderer", main_to_renderer);
    }, 250)

    // 終了処理
    gui.on("close", () => {
        // Main -> Renderer処理を終了させる
        clearInterval(timerID);
    })
} )

// ==== IPC通信 ====
// ipcMain.handle("renderer_to_main", (e, args) => { SampleFunc(e, args) });

// // Dropされた時の動作
// ipcMain.handle("sendDropFile", function (e, args) {
//     for (let i = 0; i < args.length; i++) {
//         console.log(args[i])
//     }
// });