window.addEventListener("load", function () {
    // - 初期設定
    // 画像移動関連のグローバル変数
    let START_X = 0
    let START_Y = 0
    let DRAG_START_X = 0
    let DRAG_START_Y = 0
    let MOVE_X = 0
    let MOVE_Y = 0
    let CLICK_FLG = 0
    let dx = 0
    let dy = 0
    let zoom = 1
    let file_path_list = []

    // 初期canvas追加
    let canvas_num = 1
    addCanvas(canvas_num)

    // - ドラッグアンドドロップ動作
    this.document.ondragover = function (e) {
        // console.log("DragOver")
        // ドラッグアンドドロップ関連の動作には、デフォルトの動作が設定されている。
        // そのため、以下の1行を追記することで、そのデフォルトの動作を削除し、自分の意図した動作を行わせることができる
        e.preventDefault()
    }

    this.document.ondrop = function (e) {
        // console.log("Drop")
        e.preventDefault()

        // ファイルパス取得
        const files = e.dataTransfer.files

        // ファイルパスをリストに一時格納
        let file_path_list_tmp = []
        for (let i = 0; i < files.length; i++) {
            let image_path = files[i].path

            // 拡張子を確認し、".bin"ファイルの場合は、一度bmpに変換して出力する
            ext = image_path.split(".").slice(-1)[0]
            if (ext === "bin") {
                // TODO
                // ここにbin --> bmpに変換する処理を記載する
                // renderer側では処理できないので、mainプロセス側にパスを渡した後、
                // mainプロセス側で変換処理を行う。
                // その後、変換後の画像を"tmp"フォルダに一時保存し、その画像のパスを返す (もしくは一定の名前にしておけば特に受け取らなくてもいいかも?)
            }

            file_path_list_tmp.push(image_path)
        }

        // 現在のファイルパスリストを更新する
        const pre_file_path_list_length = file_path_list.length

        // dropされた位置を計算し、listのどこから画像を更新するか判定する
        const CANVAS_X = Math.round(window.innerWidth / canvas_num)
        const update_image_offset = Math.floor(e.pageX / CANVAS_X) // どのcanvasから画像更新するかのoffset

        // 画像更新 or 追加
        for (let i = 0; i < file_path_list_tmp.length; i++) {
            // file_path_listの長さが足りてなかったら先に拡張しておく
            // こうすることで、意図通りの場所に画像を表示させることができる
            // 削除側には処理していない. また上限も設定していない
            if ((i + update_image_offset) >= pre_file_path_list_length) {
                for (let j = 0; j < (update_image_offset + 1) - pre_file_path_list_length; j++) {
                    file_path_list.push("")
                }
            }

            // 画像更新
            file_path_list[i + update_image_offset] = file_path_list_tmp[i]
        }

        // canvas_numが入力された画像よりも小さい場合は、canvasを追加する
        if (canvas_num < file_path_list.length) {
            canvas_num = file_path_list.length
            addCanvas(canvas_num)
        }

        drawCanvas()

        // window.api.sendDropFile(file_path_list)
    }

    // - キーボード操作
    // TODO
    // キーボードを押して操作できる機能の追加を行う
    // 表示内容のスクリーンショット
    // canvasを追加して複数画像を同時に表示する
    this.document.addEventListener("keydown", function(e) {
        // 数字ボタンで固定の倍率に変更
        if (Number(e.key) || e.key === "0") {
            // 変更前拡大縮小率取得
            const pre_zoom = zoom

            // 拡大縮小率変更
            zoom = Math.max(Number(e.key), 1) // 0の時も100%になるようにする

            // 倍率が同じだったら処理しない
            if (pre_zoom === zoom) {
                return
            }
            
            // 表示位置中央に拡大縮小するように座標調整
            const CENTER_X = (window.innerWidth  / canvas_num) / 2
            const CENTER_Y = window.innerHeight / 2

            const ImageX = CENTER_X - START_X
            const ImageY = CENTER_Y - START_Y

            const ZoomX = Math.round(ImageX * (zoom / pre_zoom))
            const ZoomY = Math.round(ImageY * (zoom / pre_zoom))

            const DiffX = ZoomX - ImageX
            const DiffY = ZoomY - ImageY

            START_X = START_X - DiffX
            START_Y = START_Y - DiffY

            drawCanvas()
        }

        if (e.key.match("F[1-9]")) {
            canvas_num = e.key.replace("F", "")
            addCanvas(canvas_num)
        }
    })

    // - ボタン
    // TODO
    // 複数枚表示しているときに、重ね合わせ、差分を表示するボタン

    // - マウス操作
    this.document.onmousedown= function(e) {
        e.preventDefault()
        MOUSE_CLICK_START_X = e.pageX
        MOUSE_CLICK_START_Y = e.pageY
        CLICK_FLG = 1
    }

    this.document.onmouseup = function(e) {
        e.preventDefault()
         START_X = dx
         START_Y = dy

        // マウスドラッグ関連の変数を初期化
        CLICK_FLG = 0
        DRAG_START_X = 0
        DRAG_START_Y = 0
        MOVE_X = 0
        MOVE_Y = 0
    }

    this.document.onmousemove = function(e) {
        e.preventDefault()
        if (CLICK_FLG === 1) {
            const MOUSE_CURRENT_X = e.pageX
            const MOUSE_CURRENT_Y = e.pageY
            MOVE_X = MOUSE_CURRENT_X - MOUSE_CLICK_START_X
            MOVE_Y = MOUSE_CURRENT_Y - MOUSE_CLICK_START_Y
            drawCanvas()
        }
    }

    this.document.onwheel = function(e) {
        // 拡大縮小の上限加減
        const MAX_ZOOM = 50
        const MIN_ZOOM = 0.1

        // 拡大縮小の選択
        let zoom_ratio = 0
        if (e.deltaY < 0) {
            if (zoom < 1) {
                zoom_ratio = 0.05
            } else if (zoom < 2) {
                zoom_ratio = 0.1
            } else if (zoom < 5) {
                zoom_ratio = 0.2
            } else if (zoom < 10) {
                zoom_ratio = 0.5
            } else {
                zoom_ratio = 1.0
            }

            // すでに最大まで拡大されていたら処理をしない
            if (zoom === MAX_ZOOM) {
                return
            }
        } else {
            if (zoom <= 1) {
                zoom_ratio = -0.05
            } else if (zoom <= 2) {
                zoom_ratio = -0.1
            } else if (zoom <= 5) {
                zoom_ratio = -0.2
            } else if (zoom <= 10) {
                zoom_ratio = -0.5
            } else {
                zoom_ratio = -1.0
            }

            // すでに最小まで縮小されていたら処理をしない
            if (zoom === MIN_ZOOM) {
                return
            }
        }

        // 変更前の倍率を取得
        const pre_zoom = zoom       

        // zoom倍率変更
        zoom = Math.round((zoom + zoom_ratio) * 100) / 100
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

        // 各canvasのサイズを取得 (今は水平分割のみなのでwidthだけ)
        const CANVAS_X = Math.round(window.innerWidth / canvas_num)

        // 画像分割枠内でのマウス位置を計算
        const current_canvas_num = Math.floor(e.pageX / CANVAS_X)
        const SPLIT_PAGE_X = e.pageX - (CANVAS_X * current_canvas_num)

        // 画像のどの位置にいるか
        const ImageX = SPLIT_PAGE_X - START_X
        const ImageY = e.pageY - START_Y

        // 拡大縮小後の座標
        const ZoomX = ImageX * (zoom / pre_zoom)
        const ZoomY = ImageY * (zoom / pre_zoom)

        // 移動量
        const DiffX = ZoomX - ImageX
        const DiffY = ZoomY - ImageY

        // 拡大縮小後の描画開始座標計算
        START_X = START_X - DiffX
        START_Y = START_Y - DiffY

        drawCanvas()
    }

    // - resize時動作
    this.window.addEventListener("resize", function (e) {
        drawCanvas()
    })

    // - Canvas追加
    function addCanvas(canvas_num) {
        let viewer_container = document.getElementById("viewer-container")

        // 一度すべての子要素を削除する
        while (viewer_container.firstChild) {
            viewer_container.removeChild(viewer_container.firstChild)
        }

        // 指定の数だけcanvasを追加する
        for (let i = 0; i < canvas_num; i++) {
            // canvasを格納するcontainerの作成
            let canvas_container = document.createElement("div")
            canvas_container.className = "canvas-container"

            // canvasオブジェクト生成
            let canvas = document.createElement("canvas")
            canvas.className = "viewer-canvas"

            // 比較用ボタン作成
            let compare_button = document.createElement("button")
            compare_button.className   = "compare-button"
            compare_button.textContent = "compare"
            compare_button.id          = `compare-button-id${i}`
            compare_button.addEventListener("mousedown", CompareButtonDown)
            compare_button.addEventListener("mouseup"  , CompareButtonUp)

            // viewer_containerに要素追加
            canvas_container.appendChild(canvas)
            canvas_container.appendChild(compare_button)
            viewer_container.appendChild(canvas_container)
        }

        // 画像描画
        drawCanvas()
    }

    // - Canvasに画像描画
    function drawCanvas() {
        // canvas オブジェクト取得
        let canvas_list = document.getElementsByClassName("viewer-canvas")

        const loop_length = canvas_list.length

        let MAX_DWIDTH  = 0
        let MAX_DHEIGHT = 0
        for (let i = 0; i < loop_length; i++) {
            const canvas = canvas_list[i]

            if (i < file_path_list.length) {
                // 画像がある場合は、画像表示
                const image_path = file_path_list[i]

                // 画像設定
                let image = new Image()
                image.src = image_path

                image.addEventListener("load", function () {
                    // canvas サイズ設定
                    canvas.width  = Math.round(window.innerWidth  / loop_length)
                    canvas.height = window.innerHeight // Math.round(window.innerHeight / loop_length)

                    // コンテキスト取得
                    let ctx = canvas.getContext("2d", {willReadFrequently: true})
                    ctx.imageSmoothingEnabled = false // 最近傍補間で拡大する (拡大時、エッジをスムーズに補間しない)

                    // 画像描画
                    let dWidth  = Math.round(image.width  * zoom)
                    let dHeight = Math.round(image.height * zoom)
                    MAX_DWIDTH  = Math.max(MAX_DWIDTH , dWidth ) // 小さいサイズの画像に引っ張られてうまく移動できなくなることを防ぐため
                    MAX_DHEIGHT = Math.max(MAX_DHEIGHT, dHeight) // 小さいサイズの画像に引っ張られてうまく移動できなくなることを防ぐため
                    dx = Math.min(canvas.width , Math.max(-MAX_DWIDTH , START_X + MOVE_X))
                    dy = Math.min(canvas.height, Math.max(-MAX_DHEIGHT, START_Y + MOVE_Y))
                    ctx.drawImage(image, dx, dy, dWidth, dHeight)

                    // zoom倍率を表示
                    // 初期はcssで透明化させているので、半透明で表示させる
                    zoom_ratio_container = document.getElementById("zoom-ratio-container")
                    zoom_ratio_container.style.opacity = 0.5
                    // ズーム倍率を記載
                    p_zoom_ratio = document.getElementById("zoom-ratio")
                    p_zoom_ratio.textContent = `zoom: ${Math.round(zoom * 100)}%`
                })
            } else {
                // 画像がない場合は、サイズだけ指定
                // canvas サイズ設定
                canvas.width  = Math.round(window.innerWidth  / loop_length)
                canvas.height = window.innerHeight // Math.round(window.innerHeight / loop_length)
            }
        }
    }

    // - compare buttonの動作
    let file_path_list_copy = []
    function CompareButtonDown(e) {
        // idからクリックされたボタンを把握する
        const canvas_id = Number(this.id.replace("compare-button-id", ""))

        if (e.button === 0) {
            // 左クリックで押された場合 --> 重ね合わせする

            // 各canvasの画像パスをコピーしておく
            file_path_list_copy = file_path_list.concat()

            // 重ね合わせる画像パスを取得する
            const target_image = file_path_list[canvas_id]

            // 画像リストを一時的に重ね合わせる画像のパスですべて上書きする
            for (let i = 0; i < file_path_list.length; i++) {
                file_path_list[i] = target_image
            }

            drawCanvas()
        } else if (e.button === 1) {
            // 中央クリックで押された場合 --> 処理なし
        } else {
            // 右クリックで押された場合 --> 差分表示 (未実装)

            const canvas_list = document.getElementsByClassName("viewer-canvas")
            const target_canvas = canvas_list[canvas_id]
            const target_ctx    = target_canvas.getContext("2d", {willReadFrequently: true})
            const target_image  = target_ctx.getImageData(0, 0, target_canvas.width, target_canvas.height)

            for (let i = 0; i < canvas_list.length; i++) {
                if (i === canvas_id) {
                    // 比較する画像に対しては何もしない
                } else {
                    // その他の画像は、差分を計算して表示する
                    const canvas = canvas_list[i]
                    const ctx    = canvas.getContext("2d", {willReadFrequently: true})
                    const image  = ctx.getImageData(0, 0, target_image.width, target_image.height) // あえてtarget_imageのがサイズに合わせておく (canvas.{width,height}でもたぶん変わらないと思う)

                    // RBGAの順番で一次元配列に格納されているのでwidth * height * 4のサイズだけループを回している
                    const dst = ctx.createImageData(target_image.width, target_image.height)
                    for (let j = 0 ; j < target_image.width * target_image.height * 4; j += 4) {
                        dst.data[j + 0] = Math.max(0, Math.min(255, target_image.data[j + 0] - image.data[j + 0] + 128)) // R
                        dst.data[j + 1] = Math.max(0, Math.min(255, target_image.data[j + 1] - image.data[j + 1] + 128)) // G
                        dst.data[j + 2] = Math.max(0, Math.min(255, target_image.data[j + 2] - image.data[j + 2] + 128)) // B
                        dst.data[j + 3] = 255 // A(透明度)は変えない
                    }

                    // 差分画像を書き込み
                    ctx.putImageData(dst, 0, 0)
                }
            }
        }
    }

    function CompareButtonUp(e) {
        if (e.button === 0) {
            // 画像リストを元に戻す
            file_path_list = file_path_list_copy.concat()

            drawCanvas() // 表示を元に戻す
        } else if (e.button === 1) {

        } else {
            drawCanvas() // 表示を元に戻す
        }
    }

    // // renderer -> main
    // args = ["Sample Message From Renderer"];
    // const renderer_to_main_promise = window.api.renderer_to_main(args);
    // renderer_to_main_promise.then((res, failres) => { // promise objectの使い方がよくわかっていない
    //   console.log(res)
    // })

    // // main -> renderer
    // window.api.on("main_to_renderer", (event, message) => {
    //   console.log(message)
    // })
})