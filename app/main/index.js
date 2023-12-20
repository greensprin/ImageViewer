'use strict'

const { app, BrowserWindow, ipcMain, dialog } = require( 'electron' );
const path = require("path");

const { spawn } = require("child_process");
const ini = require("ini");
const fs  = require("fs");

// ==== Local Lib ====

const cur_dir  = process.cwd()
const tool_dir = process.cwd();
let gui = null;

let tmp_image_list = []

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
    // let timerID = setInterval(()=> {
    //     const main_to_renderer = "Sample Message From Main"
    //     gui.webContents.send("main_to_renderer", main_to_renderer);
    // }, 250)

    // 終了処理
    gui.on("close", () => {
        // Main -> Renderer処理を終了させる
        // clearInterval(timerID);
        
        // 作成した一時ファイルを削除する (ファイルパス指定なので、誤った削除はしないはず)
        for (let i = 0; i < tmp_image_list.length; i++) {
            if (fs.existsSync(tmp_image_list[i]) === true) {
                fs.unlink(tmp_image_list[i], (err) => {
                    if (err) throw err;
                    console.log(`${tmp_image_list[i]} was deleted.`)
                })
            } else {
                console.log(`${tmp_image_list[i]} was not existed.`)
            }
        }
    })
} )

// ==== IPC通信 ====
// ipcMain.handle("renderer_to_main", (e, args) => { SampleFunc(e, args) });

// Dropされた時の動作
ipcMain.handle("sendDropFile", function (e, args) {
    // 設定値読み込み (リアルタイムに設定反映させるためここで読み込み. 他でも使う場合、かつconfig.iniが長くなったら最初だけ読み込む形に変更を検討する)
    const pjdir = process.cwd() //  = ProjectNameDir/
    const config = ini.parse(fs.readFileSync(path.join(pjdir, "/setting/config.ini"), "utf8"));

    // コマンド作成
    const path_list = args // [0]: input, [1]: output
    const script = config.drop.script
    let cmd = `${script} ${path_list[0]} ${path_list[1]}`
    console.log(cmd)

    // コマンド文字列を整形
    cmd = cmd.split(" ");
    cmd = cmd.filter(function (v) { return (v != ""); }) // コマンドから空白を削除
    const cmd_first = cmd.shift(); // spawn関数に合わせて、先頭のコマンドとそれ以外の要素を分離

    // コマンド実行
    const child = spawn(cmd_first, cmd); // 実行

    // 標準出力を取得して表示
    child.stdout.on("data", (data) => {
        process.stdout.write(data.toString());
        tmp_image_list.push(data.toString().replace(/\r?\n/g, ""))
    })

    // エラー出力を取得して表示
    child.stderr.on("data", (data) => {
        process.stdout.write(data.toString());
    })

    // cmd終了時の処理
    child.on("close", (code) => {
    })
});

// ファイルが存在するかを確認する
ipcMain.handle("existFile", function(e, args) {
    const filepath = args

    let result = false

    if (fs.existsSync(filepath) === true) {
        result = path.resolve(filepath)
    }

    return result
})

ipcMain.handle("getCmdArgsImage", function (e) {
    let filepath_list = []
    for (let i = 0; i < process.argv.length; i++) {
        const filepath = process.argv[i + 1] // コマンドライン引数取得

        // undefineはSKIP
        if (filepath === undefined) continue

        // オプションはスキップする
        if (filepath.substring(0, 2) ===  "--") continue

        // 処理対象の拡張子
        const process_ext = [
            ".bmp",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".bin",
        ]

        // ファイルが存在するかを確認（でたらめなパスが設定されているかもしれないので）
        if (fs.existsSync(filepath) === true) {
            // フォルダが入力された場合はskip
            let stats = fs.statSync(filepath)
            if (stats.isDirectory()) {
                console.log(`${filepath} is Directory. So, process is Skip.`)
                continue
            }

            // ファイルの拡張子が処理対象であるかを確認
            if (process_ext.includes(path.extname(filepath)) === false) {
                continue
            }

            // 絶対パスに変換
            const filepath_abs = path.resolve(filepath)

            // リストに追加
            filepath_list.push(filepath_abs)
        }
    }

    return filepath_list
})